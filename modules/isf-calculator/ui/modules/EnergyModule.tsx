"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import type { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import { InsightCard, MetricTile, NumField, fmt4 } from "./shared";

export function EnergyModule({
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
  /** ISF = core fuels; environmental = furnace oil + CNG only. */
  fieldScope?: "isf" | "environmental";
}) {
  const set = (key: keyof IsfFormState, value: string) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  const energyChart = [
    { name: "Renewable", gj: preview.renewableGj },
    { name: "Non-Renewable", gj: preview.nonRenewableGj },
  ].filter((r) => r.gj > 0);

  if (fieldScope === "environmental") {
    return (
      <CalculatorPanel
        title="Extra fuels (Scope 1)"
        subtitle="Furnace oil & CNG — Manufacturing / industrial · stored on isf_calculations"
      >
        <div className="isf-module-layout">
          <div className="isf-module-layout__form">
            <div className="calc-form-grid">
              <NumField
                label="Furnace Oil (litres)"
                value={form.furnaceOil}
                onChange={(v) => set("furnaceOil", v)}
                hint="Show for Manufacturing / Industrial"
                disabled={readOnly}
              />
              <NumField
                label="CNG (kg)"
                value={form.cng}
                onChange={(v) => set("cng", v)}
                hint="Distinct from natural gas m³ — never convert silently"
                disabled={readOnly}
              />
            </div>
          </div>
          <InsightCard title="Energy mix (full record)">
            <div className="isf-metric-grid">
              <MetricTile label="Total energy" value={`${fmt4(preview.energyTotalGj)} GJ`} />
              <MetricTile label="Renewable share" value={`${fmt4(preview.renewablePct, 1)}%`} />
            </div>
            <p className="isf-field-hint">
              Core electricity &amp; fuels are entered in ISF Calculator. Saving here merges furnace oil / CNG into
              the same record.
            </p>
          </InsightCard>
        </div>
      </CalculatorPanel>
    );
  }

  return (
    <CalculatorPanel title="Energy consumption" subtitle="Fuel and electricity inputs converted to GJ">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form">
          <p className="isf-subsection-label">Non-renewable</p>
          <div className="calc-form-grid">
            <NumField
              label="Grid Electricity (kWh)"
              value={form.electricityKwh}
              onChange={(v) => set("electricityKwh", v)}
              onOpenConverter={onOpenConverter}
              disabled={readOnly}
            />
            <NumField label="Diesel HSD (litres)" value={form.dieselHsd} onChange={(v) => set("dieselHsd", v)} disabled={readOnly} />
            <NumField label="Petrol MS (litres)" value={form.petrolMs} onChange={(v) => set("petrolMs", v)} disabled={readOnly} />
            <NumField label="LPG (kg)" value={form.lpg} onChange={(v) => set("lpg", v)} disabled={readOnly} />
            <NumField label="Natural Gas (m³)" value={form.gas} onChange={(v) => set("gas", v)} disabled={readOnly} />
          </div>
          <p className="isf-subsection-label">Renewable</p>
          <div className="calc-form-grid">
            <NumField
              label="Solar (kWh)"
              value={form.solar}
              onChange={(v) => set("solar", v)}
              onOpenConverter={onOpenConverter}
              disabled={readOnly}
            />
            <NumField label="Wind (kWh)" value={form.wind} onChange={(v) => set("wind", v)} disabled={readOnly} />
            <NumField label="Biomass (kWh)" value={form.biomass} onChange={(v) => set("biomass", v)} disabled={readOnly} />
          </div>
          <p className="isf-field-hint">Furnace oil &amp; CNG are on Environmental.</p>
        </div>
        <InsightCard title="Live energy mix">
          <div className="isf-metric-grid">
            <MetricTile label="Total energy" value={`${fmt4(preview.energyTotalGj)} GJ`} />
            <MetricTile
              label="Renewable share"
              value={`${fmt4(preview.renewablePct, 1)}%`}
              hint={preview.renewablePct < 20 && preview.energyTotalGj > 0 ? "Below 20% threshold" : undefined}
            />
          </div>
          {preview.renewablePct < 20 && preview.energyTotalGj > 0 && (
            <p className="isf-alert isf-alert--warn">Renewable share is below 20% — consider disclosure actions.</p>
          )}
          {energyChart.length > 0 && (
            <div className="calc-chart isf-module-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energyChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartTheme.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: chartTheme.muted }} />
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="gj" fill={chartTheme.resolveFill("#059669")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
