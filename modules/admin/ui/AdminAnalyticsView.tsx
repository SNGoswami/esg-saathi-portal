"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getAdminAnalytics, type AdminUserAnalytics } from "@/modules/admin/api/adminApi";
import { readAdminAnalyticsCache, writeAdminAnalyticsCache } from "@/modules/admin/api/adminAnalyticsCache";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { AdminEmpty, AdminPage, AdminSurface } from "@/modules/admin/ui/AdminChrome";

const AdminRoleChart = dynamic(() => import("@/modules/admin/ui/AdminRoleChart"), {
  ssr: false,
  loading: () => (
    <AdminSurface padded>
      <p className="admin-quiet">Loading chart…</p>
    </AdminSurface>
  ),
});

function AnalyticsSkeleton() {
  return (
    <AdminPage title="Analytics" meta="Loading platform stats…">
      <div className="admin-kpis">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-kpi">
            <p className="admin-kpi__label">—</p>
            <p className="admin-kpi__value">…</p>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default function AdminAnalyticsView() {
  const initialCache = typeof window !== "undefined" ? readAdminAnalyticsCache() : null;

  const [data, setData] = useState<AdminUserAnalytics | null>(initialCache);
  const [loading, setLoading] = useState(initialCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const feedbackMessage =
    !loading && error ? error : !loading && !data ? error || "Analytics unavailable" : null;
  useToastOnValue(feedbackMessage, "error");

  const applyData = useCallback((analytics: AdminUserAnalytics) => {
    setData(analytics);
    writeAdminAnalyticsCache(analytics);
  }, []);

  const load = useCallback(
    async (options?: { skipCache?: boolean; silent?: boolean }) => {
      if (!options?.skipCache) {
        const cached = readAdminAnalyticsCache();
        if (cached) {
          applyData(cached);
          if (!options?.silent) {
            setLoading(false);
            setError("");
          }
          return;
        }
      }

      if (!options?.silent) {
        setLoading(true);
        setError("");
      } else {
        setRefreshing(true);
      }

      try {
        const analytics = await getAdminAnalytics();
        applyData(analytics);
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!options?.silent) setLoading(false);
        else setRefreshing(false);
      }
    },
    [applyData],
  );

  useEffect(() => {
    const cached = readAdminAnalyticsCache();
    if (cached) {
      applyData(cached);
      setLoading(false);
      void load({ skipCache: true, silent: true });
      return;
    }
    void load();
  }, [applyData, load]);

  if (loading && !data) {
    return <AnalyticsSkeleton />;
  }

  if ((error && !data) || !data) {
    return (
      <AdminPage title="Analytics">
        <AdminSurface>
          <AdminEmpty
            title="Analytics unavailable"
            action={
              <button type="button" className="btn-primary btn-sm" onClick={() => void load({ skipCache: true })}>
                Retry
              </button>
            }
          />
        </AdminSurface>
      </AdminPage>
    );
  }

  const statCards = [
    { label: "Total", value: data.totalUsers },
    { label: "Active", value: data.activeUsers },
    { label: "Inactive", value: data.inactiveUsers },
    { label: "New · 10 days", value: data.newUsersLast10Days },
  ];

  return (
    <AdminPage
      title="Analytics"
      meta={refreshing ? "Refreshing…" : "Excludes administrator accounts"}
      actions={
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={refreshing}
          onClick={() => void load({ skipCache: true, silent: true })}
        >
          Refresh
        </button>
      }
    >
      <div className="admin-kpis">
        {statCards.map((c) => (
          <div key={c.label} className="admin-kpi">
            <p className="admin-kpi__label">{c.label}</p>
            <p className="admin-kpi__value">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <AdminSurface>
        <AdminRoleChart data={data} />
      </AdminSurface>
    </AdminPage>
  );
}
