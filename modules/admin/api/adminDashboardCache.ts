import type { AdminContact, AdminWaitlistEntry } from "@/modules/admin/api/adminApi";

const CONTACTS_PREFIX = "admin_contacts_v1_";
const WAITLIST_KEY = "admin_waitlist_v1";

export type AdminContactsCacheEntry = {
  contacts: AdminContact[];
  hasMore: boolean;
  totalContacts: number;
};

export function adminContactsCacheKey(page: number) {
  return `${CONTACTS_PREFIX}${page}`;
}

export function readAdminContactsCache(page: number): AdminContactsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(adminContactsCacheKey(page));
    return raw ? (JSON.parse(raw) as AdminContactsCacheEntry) : null;
  } catch {
    return null;
  }
}

export function writeAdminContactsCache(page: number, data: AdminContactsCacheEntry) {
  try {
    sessionStorage.setItem(adminContactsCacheKey(page), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function readAdminWaitlistCache(): AdminWaitlistEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WAITLIST_KEY);
    return raw ? (JSON.parse(raw) as AdminWaitlistEntry[]) : null;
  } catch {
    return null;
  }
}

export function writeAdminWaitlistCache(waitlist: AdminWaitlistEntry[]) {
  try {
    sessionStorage.setItem(WAITLIST_KEY, JSON.stringify(waitlist));
  } catch {
    /* quota */
  }
}

export function invalidateAdminDashboardCache() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CONTACTS_PREFIX) || k === WAITLIST_KEY) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
