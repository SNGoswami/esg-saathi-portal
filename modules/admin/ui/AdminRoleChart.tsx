"use client";

import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import type { AdminUserAnalytics } from "@/modules/admin/api/adminApi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ROLE_CHART_COLORS: Record<string, string> = {
  MSME: "#006C49",
  CA: "#0B8A5A",
  CS: "#2563EB",
  ESG_CONSULTANT: "#6366F1",
  ASSURER_AUDITOR: "#F59E0B",
};

const ROLE_SHORT_LABELS: Record<string, string> = {
  MSME: "MSME",
  CA: "CA",
  CS: "CS",
  ESG_CONSULTANT: "ESG",
  ASSURER_AUDITOR: "Auditor",
};

export default function AdminRoleChart({ data }: { data: AdminUserAnalytics }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chart = useMemo(
    () => ({
      text: isDark ? "#fafafa" : "#0A0A0A",
      muted: isDark ? "#a3a3a3" : "#64748B",
      grid: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(10, 10, 10, 0.08)",
    }),
    [isDark],
  );

  const roleChartData = useMemo(() => {
    if (!data.usersByRole) return [];
    return Object.entries(data.usersByRole).map(([role, count]) => ({
      role,
      label: ROLE_SHORT_LABELS[role] ?? role,
      count,
      fill: ROLE_CHART_COLORS[role] ?? "#64748B",
    }));
  }, [data]);

  return (
    <div className="card card--elevated lighthouse-chart-card lighthouse-chart-card--wide">
      <div className="lighthouse-chart-card__head">
        <p className="lighthouse-chart-card__title">Users by role</p>
        <p className="lighthouse-chart-card__sub">Registered platform users per role</p>
      </div>
      <div className="lighthouse-chart-card__body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={roleChartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: chart.text }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chart.muted }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as (typeof roleChartData)[0];
                return (
                  <div className="lighthouse-chart-tooltip">
                    <p className="lighthouse-chart-tooltip__label">{row.role}</p>
                    <p style={{ fontWeight: 700 }}>{row.count} users</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {roleChartData.map((entry) => (
                <Cell key={entry.role} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ul className="lighthouse-weight-legend" aria-label="Users by role breakdown">
          {roleChartData.map((item) => (
            <li key={item.role} className="lighthouse-weight-legend__item">
              <span className="lighthouse-weight-legend__dot" style={{ background: item.fill }} aria-hidden="true" />
              <span className="lighthouse-weight-legend__text">
                <span className="lighthouse-weight-legend__name">{item.label}</span>
                <span className="lighthouse-weight-legend__value">{item.count}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
