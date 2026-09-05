const USER_HOME = "/user/dashboard";
const ADMIN_HOME = "/admin";

function pathnameOf(path: string): string {
  return path.split("?")[0] ?? path;
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

function isUserPath(pathname: string): boolean {
  return pathname.startsWith("/user/");
}

/** Same-origin workspace paths only — blocks open redirects. */
export function isSafeAppPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return false;
  }
  const pathname = pathnameOf(path);
  return isAdminPath(pathname) || isUserPath(pathname);
}

export function getSafeRedirectPath(
  redirect: string | null | undefined,
  fallback = USER_HOME,
): string {
  if (!redirect || !isSafeAppPath(redirect)) {
    return fallback;
  }
  return redirect;
}

export function remapUserPathToAdmin(path: string): string {
  const pathname = pathnameOf(path);
  const qs = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
  const params = new URLSearchParams(qs);
  if (pathname === "/user/profile") {
    params.set("view", "profile");
  }
  if ((params.get("view") ?? "dashboard") === "dashboard") {
    params.delete("view");
  }
  const query = params.toString();
  return query ? `${ADMIN_HOME}?${query}` : ADMIN_HOME;
}

export { USER_HOME, ADMIN_HOME };
