"use client";

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
import { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import type { MsmeAnalytics } from "@/modules/dashboard/msme/msmeAnalytics";
import { ChartShell, ChartWidgetSkeleton } from "@/modules/dashboard/professional/ProfessionalChartWidgets";

export function MsmePillarsChart({
  analytics,
  loading,
  embedded = false,
}: {
  analytics: MsmeAnalytics | null;
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading || !analytics) return <ChartWidgetSkeleton title="ESG pillars" embedded={embedded} />;

  return (
    <ChartShell
      title="ESG pillars"
      subtitle="Your environmental, social, and governance scores"
      empty={analytics.pillarAvgs.length === 0}
      embedded={embedded}
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={analytics.pillarAvgs} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis
            dataKey="pillar"
            tick={{ fontSize: 9, fill: chart.muted }}
            interval={0}
            tickMargin={6}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: chart.muted }} width={32} />
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              fontSize: 11,
            }}
          />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {analytics.pillarAvgs.map((entry) => (
              <Cell key={entry.pillar} fill={chart.pillarFill[entry.pillar] ?? entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function MsmeKpiProgressChart({
  analytics,
  loading,
  embedded = false,
}: {
  analytics: MsmeAnalytics | null;
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading || !analytics) return <ChartWidgetSkeleton title="KPI completion" embedded={embedded} />;

  return (
    <ChartShell
      title="KPI completion"
      subtitle="Answered KPIs by pillar"
      empty={analytics.kpiProgress.every((row) => row.done === 0)}
      embedded={embedded}
    >
      <div className="pro-coverage-list">
        {analytics.kpiProgress.map((row) => {
          const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
          return (
            <div key={row.label} className="pro-coverage-row">
              <div className="pro-coverage-row__head">
                <span className="pro-coverage-row__label">{row.label}</span>
                <span className="pro-coverage-row__value">
                  {row.done}/{row.total} · {pct}%
                </span>
              </div>
              <div className="pro-coverage-row__track">
                <div
                  className="pro-coverage-row__fill"
                  style={{ width: `${Math.min(100, pct)}%`, background: chart.resolveFill(row.fill) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}
