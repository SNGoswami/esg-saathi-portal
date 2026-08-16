const THEME_STORAGE_KEY = "theme";

/**
 * Wipes session-scoped app data and user-specific localStorage on sign-out.
 * Preserves theme preference so light/dark mode survives logout on the same device.
 */
export function clearClientStorageOnLogout(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    localStorage.clear();
    if (theme) localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
