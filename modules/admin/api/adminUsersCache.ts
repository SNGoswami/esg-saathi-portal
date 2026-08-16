import type { AdminUserListItem, AdminUserRole } from "@/modules/admin/api/adminApi";

const CACHE_PREFIX = "admin_users_v2_";

export type AdminUsersCacheEntry = {
  users: AdminUserListItem[];
  totalPages: number;
  totalElements: number;
};

export function adminUsersCacheKey(role: AdminUserRole, page: number) {
  return `${CACHE_PREFIX}${role}_${page}`;
}

export function readAdminUsersCache(
  role: AdminUserRole,
  page: number,
): AdminUsersCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(adminUsersCacheKey(role, page));
    return raw ? (JSON.parse(raw) as AdminUsersCacheEntry) : null;
  } catch {
    return null;
  }
}

export function writeAdminUsersCache(
  role: AdminUserRole,
  page: number,
  data: AdminUsersCacheEntry,
) {
  try {
    sessionStorage.setItem(adminUsersCacheKey(role, page), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateAdminUsersCache(role?: AdminUserRole) {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k?.startsWith(CACHE_PREFIX)) continue;
      if (!role || k.startsWith(`${CACHE_PREFIX}${role}_`)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
