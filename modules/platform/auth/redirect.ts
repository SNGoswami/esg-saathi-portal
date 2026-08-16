const DEFAULT_POST_LOGIN = "/user/dashboard";

/** Same-origin paths under /user/ only, blocks open redirects. */
export function getSafeRedirectPath(
  redirect: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN,
): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallback;
  }
  if (!redirect.startsWith("/user/")) return fallback;
  return redirect;
}
