import type { AccountSettings } from "@/modules/account/api/accountApi";

const CACHE_PREFIX = "account_settings_";

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

export function readAccountSettingsCache(userId: string): AccountSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as AccountSettings) : null;
  } catch {
    return null;
  }
}

export function writeAccountSettingsCache(userId: string, data: AccountSettings) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateAccountSettingsCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      sessionStorage.removeItem(cacheKey(userId));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
