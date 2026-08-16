"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  setCalculatorCacheUserId,
} from "@/modules/calculators/cache/calculatorCache";
import { clearClientStorageOnLogout } from "@/modules/platform/auth/clearClientStorage";
import { clearServerSession, fetchWithSession, isRateLimitedStatus } from "@/modules/platform/api/sessionFetch";
import { getClientApiUrl } from "@/modules/platform/api/constants";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { formatDisplayName, splitDisplayName } from "@/modules/platform/display/displayName";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

/** Shape returned by login / signup / refresh endpoints and `/me`. */
export type AuthSessionPayload = {
  authenticated?: boolean;
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function userFromSessionPayload(data: AuthSessionPayload): AuthUser | null {
  const id = data.id ?? data.userId;
  if (data.authenticated === false || !id || !data.email || !data.role) {
    return null;
  }

  const { firstName, lastName } = splitDisplayName(data);
  return {
    id: String(id),
    email: data.email,
    firstName,
    lastName,
    name: formatDisplayName({ ...data, firstName, lastName }),
    role: normalizeRole(String(data.role)),
  };
}

function userFromMeResponse(data: AuthSessionPayload): AuthUser | null {
  return userFromSessionPayload(data);
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: (isBackground?: boolean) => Promise<AuthUser | null>;
  /** Load session from cookies after login/signup — no refresh redirect or logout. */
  establishSession: () => Promise<AuthUser | null>;
  /** Clears in-memory + sessionStorage auth state without redirecting. */
  resetClientSession: () => void;
}

const CACHE_KEY = "auth_user";
const AUTH_ME_TIMEOUT_MS = 10_000;
const ESTABLISH_SESSION_RETRY_MS = [0, 120, 300] as const;

// How often we check whether a refresh is needed.
const REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  logout: async () => {},
  refreshUser: async () => null,
  establishSession: async () => null,
  resetClientSession: () => {},
});

function isForcedReauthPage(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/login") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("reauth") === "1" || params.get("signed_out") === "1";
}

function isLoginPage(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/login");
}

function readCachedAuthUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistUser(
  fetchedUser: AuthUser,
  setUser: (user: AuthUser | null) => void,
) {
  setUser(fetchedUser);
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(fetchedUser));
    sessionStorage.removeItem("auth_reauth_notice_shown");
  } catch {}
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialUser) return initialUser;
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  /** Stays true until the first session bootstrap attempt finishes. */
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Session cache ─────────────────────────────────────────────────────────

  const clearSession = useCallback(() => {
    setUser(null);
    setCalculatorCacheUserId(null);
    clearClientStorageOnLogout();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ── Token refresh ─────────────────────────────────────────────────────────

  /**
   * Calls POST /api/auth/refresh to rotate the current JWT.
   * The response sets a new HttpOnly cookie; we then re-fetch /me to
   * update the in-memory user object.
   */
  const rotateToken = useCallback(async () => {
    try {
      await fetch(`${getClientApiUrl()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      // Re-fetch user with the new token
      const res = await fetch(`${getClientApiUrl()}/api/auth/me`, {
        credentials: "include",
      });
      if (isRateLimitedStatus(res.status)) return;
      if (!res.ok) { clearSession(); return; }
      const data = await res.json();
      const updated = userFromMeResponse(data);
      if (!updated) { clearSession(); return; }
      persistUser(updated, setUser);
    } catch {
      // Network error, don't clear session, try again on next check
    }
  }, [clearSession]);

  /**
   * Schedules a token rotation if the cookie's JWT is about to expire.
   * Because we can't read HttpOnly cookies from JS, we keep a copy of the
   * expiry decoded from the /me response's `exp` field (if provided) or
   * we fire a proactive refresh on a fixed interval.
   */
  const scheduleRefreshCheck = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      // Re-validate the session and proactively rotate
      await rotateToken();
      scheduleRefreshCheck(); // reschedule after rotation
    }, REFRESH_CHECK_INTERVAL_MS);
  }, [rotateToken]);

  // ── User fetch ────────────────────────────────────────────────────────────

  const refreshUser = useCallback(async (isBackground = false): Promise<AuthUser | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS);
    try {
      const res = await fetchWithSession(
        "/api/auth/me",
        {
          method: "GET",
          signal: controller.signal,
        },
        true,
        !isBackground,
      );

      if (isRateLimitedStatus(res.status)) {
        const cached = readCachedAuthUser();
        if (cached) {
          setUser(cached);
          return cached;
        }
        return null;
      }

      const data = await res.json();
      const fetchedUser = userFromMeResponse(data);
      if (!fetchedUser) {
        if (!isBackground || !isLoginPage()) clearSession();
        return null;
      }

      persistUser(fetchedUser, setUser);

      scheduleRefreshCheck();
      return fetchedUser;
    } catch {
      if (!isBackground || !isLoginPage()) clearSession();
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }, [clearSession, scheduleRefreshCheck]);

  const establishSession = useCallback(async (): Promise<AuthUser | null> => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const delayMs of ESTABLISH_SESSION_RETRY_MS) {
      if (delayMs > 0) await sleep(delayMs);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS);
      try {
        const res = await fetch(`${getClientApiUrl()}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (isRateLimitedStatus(res.status)) return null;
        if (!res.ok) continue;

        const data = await res.json();
        const fetchedUser = userFromMeResponse(data);
        if (!fetchedUser) continue;

        persistUser(fetchedUser, setUser);
        scheduleRefreshCheck();
        return fetchedUser;
      } catch {
        /* retry */
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }, [scheduleRefreshCheck]);

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isForcedReauthPage()) {
        clearSession();
        if (!cancelled) setLoading(false);
        return;
      }

      if (isLoginPage()) {
        if (!cancelled) setLoading(false);
        return;
      }

      let hadCache = false;
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          setUser(JSON.parse(raw));
          hadCache = true;
        } else if (initialUser) {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(initialUser));
        }
      } catch {
        /* corrupt cache */
      }

      if (hadCache || initialUser) {
        if (initialUser && !hadCache) {
          persistUser(initialUser, setUser);
        }
        scheduleRefreshCheck();
        if (!cancelled) setLoading(false);
        void refreshUser(true);
        return;
      }

      await refreshUser(true);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [clearSession, refreshUser, scheduleRefreshCheck, initialUser]);

  useEffect(() => {
    setCalculatorCacheUserId(user?.id ?? null);
  }, [user?.id]);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await clearServerSession();
    } finally {
      clearSession();
      window.location.href = "/login?signed_out=1";
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, establishSession, resetClientSession: clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
