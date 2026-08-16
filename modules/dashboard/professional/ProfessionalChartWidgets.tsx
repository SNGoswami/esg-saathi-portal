"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import type { ProfessionalAnalytics } from "@/modules/dashboard/professional/professionalAnalytics";
import type { SectorSlice } from "@/modules/dashboard/professional/professionalPortfolioExtras";

export function ChartShell({
  title,
  subtitle,
  children,
  empty,
  embedded = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="pro-chart-card pro-chart-card--embedded">
        {empty ? (
          <p className="overview-panel__empty">Not enough data yet for this chart.</p>
        ) : (
          <div className="pro-chart-card__body report-chart-box">{children}</div>
        )}
      </div>
    );
  }

  return (
    <section className="card overview-panel pro-chart-card">
      <div className="overview-panel__head">
        <div>
          <h2 className="overview-section__title">{title}</h2>
          {subtitle && (
            <p className="dash-muted" style={{ margin: "0.2rem 0 0", fontSize: "0.6875rem" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {empty ? (
        <p className="overview-panel__empty">Not enough data yet for this chart.</p>
      ) : (
        <div className="pro-chart-card__body report-chart-box">{children}</div>
      )}
    </section>
  );
}

export function ChartWidgetSkeleton({ title, embedded = false }: { title: string; embedded?: boolean }) {
  if (embedded) {
    return (
      <div className="pro-chart-card pro-chart-card--embedded pro-chart-card--skeleton">
        <div className="pro-skeleton-line" style={{ width: "100%", height: "10rem" }} />
      </div>
    );
  }

  return (
    <section className="card overview-panel pro-chart-card pro-chart-card--skeleton">
      <p className="overview-section__title">{title}</p>
      <div className="pro-skeleton-line" style={{ width: "45%", marginTop: "0.5rem" }} />
      <div className="pro-skeleton-block" />
    </section>
  );
}

export function BrsrPipelineChart({
  analytics,
  loading,
  embedded = false,
}: {
  analytics: ProfessionalAnalytics | null;
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading || !analytics) return <ChartWidgetSkeleton title="BRSR pipeline" embedded={embedded} />;

  return (
    <ChartShell
      title="BRSR pipeline"
      subtitle="Status breakdown for current FY"
      empty={analytics.brsrStatus.length === 0}
      embedded={embedded}
    >
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={analytics.brsrStatus}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={3}
          >
            {analytics.brsrStatus.map((entry) => (
              <Cell
                key={entry.name}
                fill={chart.resolveFill(entry.fill)}
                stroke={chart.tooltipBg}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="pro-chart-legend">
        {analytics.brsrStatus.map((s) => (
          <li key={s.name} className="pro-chart-legend__item">
            <span className="pro-chart-legend__dot" style={{ background: s.fill }} />
            {s.name} ({s.value})
          </li>
        ))}
      </ul>
    </ChartShell>
  );
}

export function EsgPillarsChart({
  analytics,
  loading,
  embedded = false,
}: {
  analytics: ProfessionalAnalytics | null;
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading || !analytics) return <ChartWidgetSkeleton title="ESG pillars" embedded={embedded} />;

  return (
    <ChartShell
      title="Average ESG pillars"
      subtitle="Mean scores across BRSR engagements"
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

export function SectorPieChart({
  sectorSlices,
  loading,
  embedded = false,
}: {
  sectorSlices: SectorSlice[];
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading) return <ChartWidgetSkeleton title="Clients by sector" embedded={embedded} />;

  return (
    <ChartShell
      title="Clients by sector"
      subtitle="Portfolio sector distribution"
      empty={sectorSlices.length === 0}
      embedded={embedded}
    >
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={sectorSlices}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {sectorSlices.map((entry) => (
              <Cell
                key={entry.name}
                fill={chart.resolveFill(entry.fill)}
                stroke={chart.tooltipBg}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="pro-chart-legend">
        {sectorSlices.map((s) => (
          <li key={s.name} className="pro-chart-legend__item">
            <span className="pro-chart-legend__dot" style={{ background: s.fill }} />
            {s.name} ({s.value})
          </li>
        ))}
      </ul>
    </ChartShell>
  );
}

export function CalculatorCoverageChart({
  analytics,
  loading,
  embedded = false,
}: {
  analytics: ProfessionalAnalytics | null;
  loading: boolean;
  embedded?: boolean;
}) {
  const chart = useCalcChartTheme();
  if (loading || !analytics) return <ChartWidgetSkeleton title="Calculator adoption" embedded={embedded} />;

  return (
    <ChartShell
      title="Calculator adoption"
      subtitle="Saved outputs vs portfolio size"
      empty={analytics.calculatorCoverage.every((c) => c.done === 0)}
      embedded={embedded}
    >
      <div className="pro-coverage-list">
        {analytics.calculatorCoverage.map((row) => {
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
