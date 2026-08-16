import { getClientApiUrl } from "@/modules/platform/api/constants";
import { clearClientStorageOnLogout } from "@/modules/platform/auth/clearClientStorage";

const LOGIN_URL = "/login?reauth=1";

/** 401 = invalid/expired session. 403 is often anonymous access to a protected route. */
export function isSessionExpiredStatus(status: number): boolean {
  return status === 401;
}

export function isRateLimitedStatus(status: number): boolean {
  return status === 429;
}

async function tryRefreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${getClientApiUrl()}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  clearClientStorageOnLogout();
  window.location.replace(LOGIN_URL);
}

/**
 * Cookie-authenticated fetch with one refresh attempt before forcing re-login.
 * Only 401 triggers a login redirect, 403 is returned to the caller.
 */
export async function fetchWithSession(
  endpoint: string,
  options: RequestInit = {},
  allowRetry = true,
  redirectOnFailure = true,
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${getClientApiUrl()}${endpoint}`;

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (isSessionExpiredStatus(response.status) && allowRetry) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return fetchWithSession(endpoint, options, false, redirectOnFailure);
    }
  }

  if (isSessionExpiredStatus(response.status) && redirectOnFailure) {
    redirectToLogin();
    throw new Error("Session expired");
  }

  return response;
}

/** Clears server-side session cookies on the API host. */
export async function clearServerSession() {
  try {
    await fetch(`${getClientApiUrl()}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* best effort */
  }
}

/**
 * Login/signup/reset calls. By default clears stale cookies first and never
 * triggers session refresh or a dashboard redirect on 401.
 */
export async function fetchForAuthAction(
  endpoint: string,
  options: RequestInit = {},
  config: { clearSession?: boolean } = {},
): Promise<Response> {
  const { clearSession = true } = config;
  if (clearSession) {
    await clearServerSession();
  }
  const url = endpoint.startsWith("http") ? endpoint : `${getClientApiUrl()}${endpoint}`;
  return fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
}
