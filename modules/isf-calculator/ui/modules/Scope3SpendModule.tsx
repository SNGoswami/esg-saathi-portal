"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import type { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import { InsightCard, MetricTile, NumField, fmt4 } from "./shared";

export const SCOPE3_FIELDS = [
  { key: "purchased_goods_inr", label: "Purchased Goods (INR)", cluster: "Upstream" },
  { key: "capital_goods_inr", label: "Capital Goods (INR)", cluster: "Upstream" },
  { key: "fuel_energy_inr", label: "Fuel & Energy (INR)", cluster: "Operations" },
  { key: "transport_inr", label: "Transport (INR)", cluster: "Upstream" },
  { key: "waste_inr", label: "Waste (INR)", cluster: "Operations" },
  { key: "travel_inr", label: "Business Travel (INR)", cluster: "Travel" },
  { key: "commuting_inr", label: "Employee Commuting (INR)", cluster: "Travel" },
] as const;

export function Scope3SpendModule({
  form,
  preview,
  chartTheme,
  onChange,
  readOnly = false,
}: {
  form: IsfFormState;
  preview: IsfLivePreview;
  chartTheme: ReturnType<typeof useCalcChartTheme>;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  readOnly?: boolean;
}) {
  const chartData = preview.scope3Breakdown.map((r) => ({
    name: r.label.split(" ").slice(0, 2).join(" "),
    tco2e: Math.round(r.tco2e * 1000) / 1000,
  }));

  const clusters = ["Upstream", "Operations", "Travel"] as const;

  return (
    <CalculatorPanel title="Scope 3 spend-based" subtitle="Spend (INR) × emission factor → tCO₂e">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form">
          {clusters.map((cluster) => (
            <div key={cluster} className="isf-scope3-cluster">
              <p className="isf-scope3-cluster__label">{cluster}</p>
              <div className="calc-form-grid">
                {SCOPE3_FIELDS.filter((f) => f.cluster === cluster).map(({ key, label }) => (
                  <NumField
                    key={key}
                    label={label}
                    value={form.scope3[key] ?? ""}
                    disabled={readOnly}
                    onChange={(v) =>
                      onChange((prev) => ({ ...prev, scope3: { ...prev.scope3, [key]: v } }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <InsightCard title="Live Scope 3 preview">
          <MetricTile label="Total Scope 3" value={`${fmt4(preview.scope3Total)} tCO₂e`} />
          {preview.scope3Breakdown.length > 0 && (
            <>
              <div className="isf-scope3-live-table">
                {preview.scope3Breakdown.map((r) => (
                  <div key={r.key} className="isf-scope3-live-row">
                    <span>{r.label}</span>
                    <strong>{fmt4(r.tco2e)} tCO₂e</strong>
                    <span className="isf-scope3-live-row__pct">{fmt4(r.pct, 1)}%</span>
                  </div>
                ))}
              </div>
              {chartData.length > 0 && (
                <div className="calc-chart isf-module-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: chartTheme.muted }} />
                      <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9, fill: chartTheme.muted }} />
                      <Tooltip
                        contentStyle={{
                          background: chartTheme.tooltipBg,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="tco2e" radius={[0, 4, 4, 0]} maxBarSize={14}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={chartTheme.resolveFill("#8B5CF6")} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
