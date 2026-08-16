"use client";

import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import { InsightCard, MetricTile, NumField, fmt4 } from "./shared";

export function EmissionModule({
  form,
  preview,
  onChange,
  readOnly = false,
}: {
  form: IsfFormState;
  preview: IsfLivePreview;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  readOnly?: boolean;
}) {
  const set = (key: keyof IsfFormState, value: string) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  return (
    <CalculatorPanel title="Emission intensity" subtitle="Scope 1 & 2 · revenue and output normalisation">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form calc-form-grid">
          <NumField label="Scope 1 (tCO₂e)" value={form.scope1} onChange={(v) => set("scope1", v)} disabled={readOnly} />
          <NumField label="Scope 2 (tCO₂e)" value={form.scope2} onChange={(v) => set("scope2", v)} disabled={readOnly} />
          <NumField label="Revenue (INR Cr)" value={form.revenue} onChange={(v) => set("revenue", v)} disabled={readOnly} />
          <NumField label="PPP Factor" value={form.ppp} onChange={(v) => set("ppp", v)} hint="Default 22.882 for India" disabled={readOnly} />
          <NumField label="Output Quantity" value={form.outputQty} onChange={(v) => set("outputQty", v)} disabled={readOnly} />
          <label className="calc-field">
            <span className="calc-field__label">Output Unit</span>
            <input
              className="dash-input"
              value={form.outputUnit}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => set("outputUnit", e.target.value)}
            />
          </label>
        </div>
        <InsightCard title="Live intensity model">
          <div className="isf-metric-grid">
            <MetricTile label="Total GHG" value={`${fmt4(preview.totalGhg)} tCO₂e`} hint="Scope 1 + Scope 2" />
            <MetricTile label="PPP revenue" value={`${fmt4(preview.pppRevenue)} INR Cr`} hint="Revenue ÷ PPP factor" />
            <MetricTile label="Intensity / revenue" value={`${fmt4(preview.intensityRevenue)} tCO₂e / Cr`} />
            <MetricTile
              label="Intensity / output"
              value={preview.intensityOutput != null ? `${fmt4(preview.intensityOutput)} tCO₂e / unit` : "-"}
            />
          </div>
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
