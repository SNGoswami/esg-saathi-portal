"use client";

import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import { InsightCard, NumField } from "./shared";

export function AirEmissionsModule({
  form,
  onChange,
  readOnly = false,
}: {
  form: IsfFormState;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  readOnly?: boolean;
}) {
  const set = (key: keyof IsfFormState, value: string) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  return (
    <CalculatorPanel title="Air emissions" subtitle="Non-GHG pollutants · BRSR C_P6_E06">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form calc-form-grid">
          <NumField label="NOx (kg)" value={form.noxKg} onChange={(v) => set("noxKg", v)} disabled={readOnly} />
          <NumField label="SOx (kg)" value={form.soxKg} onChange={(v) => set("soxKg", v)} disabled={readOnly} />
          <NumField label="Particulate Matter (kg)" value={form.pmKg} onChange={(v) => set("pmKg", v)} hint="PM10 / PM2.5" disabled={readOnly} />
          <NumField label="VOC (kg)" value={form.vocKg} onChange={(v) => set("vocKg", v)} disabled={readOnly} />
          <NumField label="POP (kg)" value={form.popKg} onChange={(v) => set("popKg", v)} disabled={readOnly} />
          <NumField label="HAP (kg)" value={form.hapKg} onChange={(v) => set("hapKg", v)} disabled={readOnly} />
          <NumField label="Other air emissions (kg)" value={form.otherAirKg} onChange={(v) => set("otherAirKg", v)} disabled={readOnly} />
        </div>
        <InsightCard title="Guidance">
          <p className="isf-field-hint">
            Enter values from CEMS or stack test reports when applicable to your industry. Leave blank if not
            material.
          </p>
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
