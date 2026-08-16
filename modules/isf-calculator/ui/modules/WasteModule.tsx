"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import type { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import { InsightCard, MetricTile, NumField, fmt4 } from "./shared";

export function WasteModule({
  form,
  preview,
  chartTheme,
  onChange,
  onOpenConverter,
  readOnly = false,
  fieldScope = "isf",
}: {
  form: IsfFormState;
  preview: IsfLivePreview;
  chartTheme: ReturnType<typeof useCalcChartTheme>;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  onOpenConverter: () => void;
  readOnly?: boolean;
  fieldScope?: "isf" | "environmental";
}) {
  const set = (key: keyof IsfFormState, value: string) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  const wasteChart = [
    { name: "Recovered", value: preview.wasteRecovered },
    { name: "Disposed", value: preview.wasteDisposed },
  ].filter((r) => r.value > 0);

  if (fieldScope === "environmental") {
    return (
      <CalculatorPanel title="Waste types & disposal" subtitle="Generation by type + landfill / incineration · BRSR C_P6_E09">
        <div className="isf-module-layout">
          <div className="isf-module-layout__form">
            <p className="isf-subsection-label">Generation (MT)</p>
            <div className="calc-form-grid">
              <NumField label="Hazardous" value={form.hazardousWasteMt} onChange={(v) => set("hazardousWasteMt", v)} disabled={readOnly} />
              <NumField label="Non-hazardous" value={form.nonHazardousWasteMt} onChange={(v) => set("nonHazardousWasteMt", v)} disabled={readOnly} />
              <NumField label="Plastic" value={form.plasticWasteMt} onChange={(v) => set("plasticWasteMt", v)} disabled={readOnly} />
              <NumField label="E-waste" value={form.ewasteMt} onChange={(v) => set("ewasteMt", v)} disabled={readOnly} />
              <NumField label="Biomedical" value={form.biomedicalWasteMt} onChange={(v) => set("biomedicalWasteMt", v)} disabled={readOnly} />
              <NumField label="Other" value={form.otherWasteMt} onChange={(v) => set("otherWasteMt", v)} disabled={readOnly} />
            </div>

            <p className="isf-subsection-label">Disposal (MT)</p>
            <div className="calc-form-grid">
              <NumField label="Landfill" value={form.landfillMt} onChange={(v) => set("landfillMt", v)} disabled={readOnly} />
              <NumField label="Incineration" value={form.incinerationMt} onChange={(v) => set("incinerationMt", v)} disabled={readOnly} />
              <NumField label="Other disposal" value={form.otherDisposalMt} onChange={(v) => set("otherDisposalMt", v)} disabled={readOnly} />
            </div>
            <p className="isf-field-hint">Recycled / reused / composted stay on ISF Calculator.</p>
          </div>

          <InsightCard title="Waste totals (merged)">
            <div className="isf-metric-grid">
              <MetricTile label="Generated" value={`${fmt4(preview.wasteGenerated)} MT`} />
              <MetricTile label="Recovered" value={`${fmt4(preview.wasteRecovered)} MT`} />
              <MetricTile label="Disposed" value={`${fmt4(preview.wasteDisposed)} MT`} />
            </div>
          </InsightCard>
        </div>
      </CalculatorPanel>
    );
  }

  return (
    <CalculatorPanel title="Waste recovery" subtitle="Total generated & recovery pathways · BRSR C_P6_E09">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form">
          <div className="calc-form-grid">
            <NumField
              label="Total generated (MT)"
              value={form.wasteTotal}
              onChange={(v) => set("wasteTotal", v)}
              onOpenConverter={onOpenConverter}
              hint="Override if type breakdown on Environmental is empty"
              disabled={readOnly}
            />
            <NumField label="Recycled" value={form.wasteRecycled} onChange={(v) => set("wasteRecycled", v)} disabled={readOnly} />
            <NumField label="Reused" value={form.wasteReused} onChange={(v) => set("wasteReused", v)} disabled={readOnly} />
            <NumField label="Composted" value={form.wasteComposted} onChange={(v) => set("wasteComposted", v)} disabled={readOnly} />
            <NumField label="Co-processed" value={form.wasteCoprocessed} onChange={(v) => set("wasteCoprocessed", v)} disabled={readOnly} />
            <NumField label="Other recovery" value={form.wasteOtherRecovery} onChange={(v) => set("wasteOtherRecovery", v)} disabled={readOnly} />
          </div>
          <p className="isf-field-hint">Per-type generation and landfill / incineration are on Environmental.</p>
        </div>

        <InsightCard title="Live recovery model">
          <div className="isf-recovery-ring-wrap">
            <div
              className="isf-recovery-ring"
              style={{ ["--recovery-pct" as string]: `${Math.min(100, preview.recoveryRatePct)}%` }}
            >
              <span>{fmt4(preview.recoveryRatePct, 1)}%</span>
            </div>
            <div className="isf-metric-grid">
              <MetricTile label="Generated" value={`${fmt4(preview.wasteGenerated)} MT`} />
              <MetricTile label="Recovered" value={`${fmt4(preview.wasteRecovered)} MT`} />
              <MetricTile label="Disposed" value={`${fmt4(preview.wasteDisposed)} MT`} />
            </div>
          </div>
          {preview.wasteOverRecovered && (
            <p className="isf-alert isf-alert--warn">Recovered waste exceeds total generated — check inputs.</p>
          )}
          {wasteChart.length > 0 && (
            <div className="isf-pie-chart-wrap">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie data={wasteChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="42%" outerRadius="68%">
                    <Cell fill={chartTheme.resolveFill("#10B981")} />
                    <Cell fill={chartTheme.muted} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
