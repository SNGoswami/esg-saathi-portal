import { cookies } from "next/headers";
import type { AuthUser } from "@/modules/platform/auth/AuthContext";
import { getAuthTokenFromCookies } from "@/modules/platform/auth/cookies";
import { parseAuthToken } from "@/modules/platform/auth/tokenValidation";

/** Read the HttpOnly auth cookie on the server (same claims as Spring JWT). */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  const token = getAuthTokenFromCookies(await cookies());
  return parseAuthToken(token);
}
