import type { AdminUserAnalytics } from "@/modules/admin/api/adminApi";

const CACHE_KEY = "admin_analytics_v1";

export function readAdminAnalyticsCache(): AdminUserAnalytics | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AdminUserAnalytics) : null;
  } catch {
    return null;
  }
}

export function writeAdminAnalyticsCache(data: AdminUserAnalytics) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateAdminAnalyticsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
