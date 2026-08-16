"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getAdminAnalytics, type AdminUserAnalytics } from "@/modules/admin/api/adminApi";
import { readAdminAnalyticsCache, writeAdminAnalyticsCache } from "@/modules/admin/api/adminAnalyticsCache";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";

const AdminRoleChart = dynamic(() => import("@/modules/admin/ui/AdminRoleChart"), {
  ssr: false,
  loading: () => (
    <div className="card card--elevated" style={{ padding: "2rem", textAlign: "center" }}>
      <p className="dash-muted">Loading chart…</p>
    </div>
  ),
});

function AnalyticsSkeleton() {
  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <p className="dash-welcome-card__eyebrow">Platform analytics</p>
        <p className="dash-welcome-card__title">User counts and role distribution</p>
        <p className="dash-muted" style={{ marginTop: 6 }}>Loading platform stats…</p>
      </div>
      <div className="dash-grid-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card card--elevated dash-score-card">
            <div style={{ height: 12, width: "60%", borderRadius: 4, background: "var(--color-border)" }} />
            <div style={{ height: 28, width: "40%", borderRadius: 4, background: "var(--color-border)", marginTop: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsView() {
  const initialCache = typeof window !== "undefined" ? readAdminAnalyticsCache() : null;

  const [data, setData] = useState<AdminUserAnalytics | null>(initialCache);
  const [loading, setLoading] = useState(initialCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const feedbackMessage =
    !loading && error
      ? error
      : !loading && !data
        ? error || "Analytics unavailable"
        : null;
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
      <div className="dash-content">
        <button type="button" className="btn-primary btn-sm" onClick={() => void load({ skipCache: true })}>
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Total users", value: data.totalUsers, icon: "users", color: "#006C49" },
    { label: "Active users", value: data.activeUsers, icon: "user-check", color: "#0B8A5A" },
    { label: "Inactive users", value: data.inactiveUsers, icon: "user-off", color: "#F59E0B" },
    {
      label: "New users (10 days)",
      value: data.newUsersLast10Days,
      icon: "user-plus",
      color: "#2563EB",
    },
  ];

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="dash-welcome-card__eyebrow">Platform analytics</p>
          <p className="dash-welcome-card__title">User counts and role distribution</p>
          <p className="dash-muted" style={{ marginTop: 6 }}>
            {refreshing ? "Refreshing…" : "Excludes administrator accounts. New users joined in the last 10 days."}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={refreshing}
          onClick={() => void load({ skipCache: true, silent: true })}
        >
          <i className="ti ti-refresh" style={{ marginRight: 6, fontSize: 14 }} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="dash-grid-stats">
        {statCards.map((c) => (
          <div key={c.label} className="card card--elevated dash-score-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="dash-score-card__label">{c.label}</span>
              <div className="dash-stat-icon" style={{ background: `${c.color}18` }}>
                <i className={`ti ti-${c.icon}`} style={{ fontSize: 16, color: c.color }} aria-hidden="true" />
              </div>
            </div>
            <p className="dash-stat-value" style={{ color: c.color }}>
              {c.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <AdminRoleChart data={data} />
    </div>
  );
}
