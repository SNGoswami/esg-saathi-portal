const FALLBACK_API_URL = "http://localhost:8080";

/** Absolute Spring base URL — use for server-side and Route Handlers. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

/**
 * Browser fetch base URL. In local dev, routes through Next.js `/backend` rewrite
 * so HttpOnly session cookies are same-origin with the UI.
 */
export function getClientApiUrl(): string {
  if (typeof window === "undefined") return API_URL;
  if (process.env.NODE_ENV === "development") return "/backend";
  return API_URL;
}
