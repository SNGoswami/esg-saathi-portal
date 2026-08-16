"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import type { Scope3SummaryResponse } from "@/modules/scope3-ghg/domain/types";

type Scope3ChartRow = {
  number: number;
  name: string;
  tco2e: number;
  fullName: string;
  method: string;
  material: boolean;
};

function fmt(n?: number | null, d = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

function Scope3ChartTooltip({
  active,
  payload,
  chartTheme,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Scope3ChartRow }>;
  chartTheme: ReturnType<typeof useCalcChartTheme>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      className="scope3-chart-tooltip"
      style={{
        background: chartTheme.tooltipBg,
        border: `1px solid ${chartTheme.tooltipBorder}`,
      }}
    >
      <p className="scope3-chart-tooltip__title" style={{ color: chartTheme.text }}>
        Category {row.number}: {row.fullName}
      </p>
      <dl className="scope3-chart-tooltip__details">
        <div>
          <dt>Emissions</dt>
          <dd style={{ color: chartTheme.text }}>{fmt(row.tco2e)} tCO₂e</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd style={{ color: chartTheme.text }}>{row.method}</dd>
        </div>
        <div>
          <dt>Material</dt>
          <dd style={{ color: chartTheme.text }}>{row.material ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function Scope3ReportDetailView({ report }: { report: Scope3SummaryResponse }) {
  const chartTheme = useCalcChartTheme();

  const chartData = useMemo(
    () =>
      (report.categories ?? [])
        .filter((c) => c.emissions_tco2e != null && c.emissions_tco2e > 0)
        .map((c) => ({
          number: c.number,
          name: `Cat ${c.number}`,
          tco2e: c.emissions_tco2e as number,
          fullName: c.name,
          method: c.method_used?.replace(/_/g, " ") ?? "-",
          material: c.material,
        })),
    [report],
  );

  const categories = report.categories ?? [];

  return (
    <div className="scope3-report report-detail-root">
      <section className="card card--elevated scope3-report__hero">
        <h2 className="scope3-report__hero-title">Scope 3 GHG Report, FY {report.fiscal_year}</h2>
        {report.client_company_name && (
          <p className="scope3-report__hero-client">{report.client_company_name}</p>
        )}
        <p className="scope3-report__hero-total">{fmt(report.total_scope3_tco2e)} tCO₂e total</p>
      </section>

      {chartData.length > 0 && (
        <section className="card card--elevated calc-panel">
          <div className="calc-panel__head">
            <h3 className="calc-panel__title">Emissions by category</h3>
          </div>
          <div className="calc-panel__body">
            <div
              className="calc-chart report-chart-box"
              style={{ height: Math.max(220, chartData.length * 28) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: chartTheme.muted }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 9, fill: chartTheme.muted }}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0, 108, 73, 0.08)" }}
                    content={<Scope3ChartTooltip chartTheme={chartTheme} />}
                  />
                  <Bar dataKey="tco2e" fill={chartTheme.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <section className="card card--elevated calc-panel">
        <div className="calc-panel__head">
          <h3 className="calc-panel__title">All 15 categories</h3>
          <p className="calc-panel__subtitle">
            {categories.filter((c) => c.emissions_tco2e != null).length}/15 calculated
          </p>
        </div>
        <div className="calc-panel__body" style={{ paddingTop: 0 }}>
          <div className="calc-history-table-wrap scope3-report__table-wrap">
            <table className="calc-history-table scope3-report__table">
              <thead>
                <tr>
                  <th className="scope3-report__col-cat">Cat</th>
                  <th className="scope3-report__col-name">Name</th>
                  <th className="scope3-report__col-method">Method</th>
                  <th className="scope3-report__col-emissions">Emissions (tCO₂e)</th>
                  <th className="scope3-report__col-material">Material</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.number}>
                    <td className="scope3-report__col-cat" data-label="Cat">
                      {c.number}
                    </td>
                    <td className="scope3-report__col-name" data-label="Name">
                      {c.name}
                    </td>
                    <td className="scope3-report__col-method" data-label="Method">
                      {c.method_used?.replace(/_/g, " ") ?? "-"}
                    </td>
                    <td className="scope3-report__col-emissions" data-label="Emissions (tCO₂e)">
                      {fmt(c.emissions_tco2e)}
                    </td>
                    <td className="scope3-report__col-material" data-label="Material">
                      {c.material ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {report.material_categories.length > 0 && (
        <section className="card scope3-report__material">
          <p className="calc-panel__title" style={{ margin: 0, fontSize: "0.8125rem" }}>
            Material categories
          </p>
          <p className="scope3-report__material-list">
            {report.material_categories.map((n) => `Category ${n}`).join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}
