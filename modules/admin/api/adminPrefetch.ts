import {
  ADMIN_VIEW_TO_ROLE,
  getAdminAnalytics,
  listAdminContacts,
  listAdminUsers,
  listAdminWaitlist,
  type AdminUserRole,
} from "@/modules/admin/api/adminApi";
import { writeAdminAnalyticsCache, readAdminAnalyticsCache } from "@/modules/admin/api/adminAnalyticsCache";
import {
  readAdminContactsCache,
  readAdminWaitlistCache,
  writeAdminContactsCache,
  writeAdminWaitlistCache,
} from "@/modules/admin/api/adminDashboardCache";
import { readAdminUsersCache, writeAdminUsersCache } from "@/modules/admin/api/adminUsersCache";

let warmInFlight: Promise<void> | null = null;

async function warmAnalytics() {
  try {
    const data = await getAdminAnalytics();
    writeAdminAnalyticsCache(data);
  } catch {
    /* best-effort */
  }
}

async function warmDashboard() {
  try {
    const [contacts, waitlist] = await Promise.all([
      listAdminContacts(0),
      listAdminWaitlist(),
    ]);
    writeAdminContactsCache(0, {
      contacts: contacts.content,
      hasMore: !contacts.last,
      totalContacts: contacts.totalElements,
    });
    writeAdminWaitlistCache(waitlist);
  } catch {
    /* best-effort */
  }
}

async function warmUsers(role: AdminUserRole) {
  try {
    const res = await listAdminUsers(role, 0);
    writeAdminUsersCache(role, 0, {
      users: res.content,
      totalPages: Math.max(1, res.totalPages),
      totalElements: res.totalElements,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Fills missing admin session caches in parallel so sidebar links open instantly.
 * Safe to call multiple times; concurrent calls share one in-flight request.
 */
export function warmAdminCaches(options?: { force?: boolean }) {
  if (typeof window === "undefined") return Promise.resolve();

  if (warmInFlight) return warmInFlight;

  warmInFlight = (async () => {
    const tasks: Promise<void>[] = [];

    if (options?.force || !readAdminAnalyticsCache()) {
      tasks.push(warmAnalytics());
    }

    if (options?.force || !readAdminContactsCache(0) || !readAdminWaitlistCache()) {
      tasks.push(warmDashboard());
    }

    for (const role of Object.values(ADMIN_VIEW_TO_ROLE)) {
      if (options?.force || !readAdminUsersCache(role, 0)) {
        tasks.push(warmUsers(role));
      }
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
  })().finally(() => {
    warmInFlight = null;
  });

  return warmInFlight;
}
