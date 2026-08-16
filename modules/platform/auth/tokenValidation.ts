import { jwtDecode } from "jwt-decode";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { formatDisplayName, splitDisplayName } from "@/modules/platform/display/displayName";
import type { AuthUser } from "@/modules/platform/auth/AuthContext";

type JwtPayload = {
  sub?: string;
  email?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  exp?: number;
};

/** Decode Spring JWT from the HttpOnly cookie (signature verified by the API). */
export function parseAuthToken(token: string | null | undefined): AuthUser | null {
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const id = decoded.userId ?? decoded.sub ?? "";
    const email = decoded.email ?? decoded.sub ?? "";
    if (!id || !email) return null;

    const { firstName, lastName } = splitDisplayName({
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email,
    });

    return {
      id,
      email,
      firstName,
      lastName,
      name: formatDisplayName({ firstName, lastName, email }),
      role: normalizeRole(decoded.role),
    };
  } catch {
    return null;
  }
}

export function isAuthTokenValid(token: string | null | undefined): boolean {
  return parseAuthToken(token) !== null;
}
