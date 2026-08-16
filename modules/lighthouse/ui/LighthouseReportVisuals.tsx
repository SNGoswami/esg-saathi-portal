"use client";

import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import type { PillarId } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import { LighthouseKpiBreakdown } from "@/modules/lighthouse/ui/LighthouseKpiBreakdown";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PILLARS } from "@/modules/platform/theme/tokens";

/** Report palette: green (E), blue (S), orange (G), red, white, black */
export const REPORT_PALETTE = {
  green: PILLARS.environment.base,
  greenBright: PILLARS.environment.soft,
  blue: PILLARS.social.base,
  blueBright: PILLARS.social.soft,
  orange: PILLARS.governance.base,
  orangeBright: PILLARS.governance.soft,
  red: "#DC2626",
  redBright: "#F87171",
  black: "#0A0A0A",
  white: "#FFFFFF",
  slate: "#64748B",
  grid: "rgba(10, 10, 10, 0.08)",
} as const;

const PILLAR_LABELS: Record<PillarId, string> = {
  E: "Environmental",
  S: "Social",
  G: "Governance",
};

function ChartCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`lighthouse-chart-card${wide ? " lighthouse-chart-card--wide" : ""}`}
      data-pdf-section="chart"
    >
      <div className="lighthouse-chart-card__head">
        <p className="lighthouse-chart-card__title">{title}</p>
        {subtitle && <p className="lighthouse-chart-card__sub">{subtitle}</p>}
      </div>
      <div className="lighthouse-chart-card__body report-chart-box">{children}</div>
    </div>
  );
}

function ReportTooltip({
  active,
  payload,
  label,
  textColor,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  textColor: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="lighthouse-chart-tooltip">
      {label && <p className="lighthouse-chart-tooltip__label">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color ?? textColor }}>
          <span style={{ fontWeight: 600 }}>{entry.name}:</span>{" "}
          {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

function WeightLegend({
  items,
  formatValue = (v) => `${v}%`,
  ariaLabel = "Chart breakdown",
}: {
  items: Array<{ name: string; value: number; fill: string }>;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}) {
  return (
    <ul className="lighthouse-weight-legend" aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.name} className="lighthouse-weight-legend__item">
          <span className="lighthouse-weight-legend__dot" style={{ background: item.fill }} aria-hidden="true" />
          <span className="lighthouse-weight-legend__text">
            <span className="lighthouse-weight-legend__name">{item.name}</span>
            <span className="lighthouse-weight-legend__value">{formatValue(item.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(
    () => ({
      isDark,
      text: isDark ? "#fafafa" : REPORT_PALETTE.black,
      muted: isDark ? "#a3a3a3" : REPORT_PALETTE.slate,
      grid: isDark ? "rgba(255, 255, 255, 0.1)" : REPORT_PALETTE.grid,
      gaugeBg: isDark ? "rgba(255, 255, 255, 0.08)" : REPORT_PALETTE.white,
      pieStroke: isDark ? "var(--color-card)" : REPORT_PALETTE.white,
      pillarColors: {
        E: REPORT_PALETTE.green,
        S: REPORT_PALETTE.blue,
        G: isDark ? REPORT_PALETTE.orangeBright : REPORT_PALETTE.orange,
      } satisfies Record<PillarId, string>,
    }),
    [isDark],
  );
}

export default function LighthouseReportVisuals({ scores }: { scores: LighthouseScoreResult }) {
  const chart = useChartTheme();

  const pillarBarData = (["E", "S", "G"] as const).map((p) => ({
    pillar: p,
    name: PILLAR_LABELS[p],
    score: Math.round(scores.pillarScores[p] * 10) / 10,
    fill: chart.pillarColors[p],
  }));

  const weightPieData = [
    {
      name: "Environmental",
      value: Math.round(scores.weights.e * 100),
      fill: chart.pillarColors.E,
    },
    {
      name: "Social",
      value: Math.round(scores.weights.s * 100),
      fill: chart.pillarColors.S,
    },
    {
      name: "Governance",
      value: Math.round(scores.weights.g * 100),
      fill: chart.pillarColors.G,
    },
  ];

  const kpiBarData = scores.kpiScores.map((k) => ({
    name: k.kpiId,
    label: k.kpiLabel.length > 22 ? `${k.kpiLabel.slice(0, 20)}…` : k.kpiLabel,
    score: Math.round(k.score * 10) / 10,
    fill: chart.pillarColors[k.pillar],
    pillar: k.pillar,
  }));

  const gaugeData = [{ name: "ESG", score: scores.totalScore, fill: REPORT_PALETTE.green }];

  const avgKpi =
    scores.kpiScores.reduce((s, k) => s + k.score, 0) / Math.max(scores.kpiScores.length, 1);

  const scoreBand =
    scores.totalScore >= 80
      ? { label: "Leader", color: REPORT_PALETTE.green }
      : scores.totalScore >= 60
        ? { label: "Advanced", color: REPORT_PALETTE.blue }
        : scores.totalScore >= 40
          ? { label: "Developing", color: REPORT_PALETTE.slate }
          : scores.totalScore >= 20
            ? { label: "Beginner", color: REPORT_PALETTE.redBright }
            : { label: "Laggard", color: REPORT_PALETTE.red };

  return (
    <section className="lighthouse-report-dashboard" aria-label="ESG visual summary">
      <div
        className="lighthouse-report-dashboard__banner"
        data-pdf-section="banner"
        style={{
          background: `linear-gradient(135deg, ${REPORT_PALETTE.green} 0%, ${REPORT_PALETTE.blue} 55%, ${REPORT_PALETTE.orange} 100%)`,
        }}
      >
        <div>
          <p className="lighthouse-report-dashboard__banner-label">Lighthouse ESG business report</p>
          <p className="lighthouse-report-dashboard__banner-score">{scores.totalScore.toFixed(1)}</p>
          <p className="lighthouse-report-dashboard__banner-sub">out of 100 · {scores.readiness}</p>
        </div>
        <div className="lighthouse-report-dashboard__banner-pills">
          {(["E", "S", "G"] as const).map((p) => (
            <span
              key={p}
              className="lighthouse-report-dashboard__pill"
              style={{ background: chart.pillarColors[p], color: REPORT_PALETTE.white }}
            >
              {p} {scores.pillarScores[p].toFixed(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="lighthouse-report-dashboard__grid">
        <ChartCard title="Overall ESG gauge" subtitle="Total composite score">
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="95%"
              data={gaugeData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="score"
                cornerRadius={8}
                background={{ fill: chart.gaugeBg }}
                maxBarSize={14}
              />
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={chart.text}
                fontSize={28}
                fontWeight={700}
              >
                {scores.totalScore.toFixed(1)}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <p
            className="lighthouse-chart-card__footnote"
            style={{ color: scoreBand.color, fontWeight: 700 }}
          >
            {scoreBand.label} readiness band
          </p>
        </ChartCard>

        <ChartCard title="Pillar performance" subtitle="Score by E · S · G (0–100)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pillarBarData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: chart.text }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chart.muted }} />
              <Tooltip content={<ReportTooltip textColor={chart.text} />} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {pillarBarData.map((entry) => (
                  <Cell key={entry.pillar} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Industry weight mix" subtitle="How your sector weights ESG pillars">
          <div className="lighthouse-pie-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={weightPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="72%"
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {weightPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} stroke={chart.pieStroke} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ReportTooltip textColor={chart.text} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <WeightLegend items={weightPieData} ariaLabel="Industry weight breakdown" />
        </ChartCard>

        <ChartCard title="Pillar score share" subtitle="Relative pillar strength">
          <div className="lighthouse-pie-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pillarBarData.map((p) => ({ name: p.name, value: p.score, fill: p.fill }))}
                  cx="50%"
                  cy="50%"
                  outerRadius="72%"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pillarBarData.map((entry) => (
                    <Cell key={entry.pillar} fill={entry.fill} stroke={chart.pieStroke} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ReportTooltip textColor={chart.text} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <WeightLegend
            ariaLabel="Pillar score breakdown"
            formatValue={(v) => `${v.toFixed(1)} / 100`}
            items={pillarBarData.map((p) => ({
              name: p.name,
              value: p.score,
              fill: p.fill,
            }))}
          />
        </ChartCard>

        <div className="lighthouse-chart-card lighthouse-chart-card--wide" data-pdf-section="chart">
          <div className="lighthouse-chart-card__head">
            <p className="lighthouse-chart-card__title">KPI breakdown</p>
            <p className="lighthouse-chart-card__sub">
              9 KPIs · average {avgKpi.toFixed(1)} / 100 · Environmental, Social, Governance
            </p>
          </div>
          <div className="lighthouse-chart-card__body lighthouse-chart-card__body--kpi-breakdown">
            <LighthouseKpiBreakdown scores={scores} showAnswers={false} compact />
          </div>
        </div>

        <ChartCard title="KPI comparison" subtitle="All pillars on one scale" wide>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kpiBarData} margin={{ top: 8, right: 8, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 8, fill: chart.text }}
                angle={-45}
                textAnchor="end"
                height={56}
                interval={0}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chart.muted }} />
              <Tooltip content={<ReportTooltip textColor={chart.text} />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {kpiBarData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
