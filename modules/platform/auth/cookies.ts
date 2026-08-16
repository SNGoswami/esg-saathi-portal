/** HttpOnly session cookie set by Spring (CookieUtil / JwtAuthFilter). */
export const AUTH_COOKIE_NAME = "__Host-sid";

/** Legacy name, kept for local transitions only. */
export const LEGACY_AUTH_COOKIE_NAME = "token";

type CookieGetter = {
  get: (name: string) => { value?: string } | undefined;
};

export function getAuthTokenFromCookies(store: CookieGetter): string | undefined {
  return (
    store.get(AUTH_COOKIE_NAME)?.value ??
    store.get(LEGACY_AUTH_COOKIE_NAME)?.value
  );
}
