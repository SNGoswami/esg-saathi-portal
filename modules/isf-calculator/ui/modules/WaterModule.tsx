"use client";

import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { STRESS_COLORS, STRESS_DESCRIPTIONS } from "@/modules/isf-calculator/domain/reportHelpers";
import type { IsfCalculationResponse } from "@/modules/isf-calculator/domain/types";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import { BoolField, InsightCard, MetricTile, NumField, fmt4 } from "./shared";

export function WaterModule({
  form,
  preview,
  result,
  onChange,
  readOnly = false,
  fieldScope = "isf",
}: {
  form: IsfFormState;
  preview: IsfLivePreview;
  result: IsfCalculationResponse | null;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  readOnly?: boolean;
  fieldScope?: "isf" | "environmental";
}) {
  const set = (key: keyof IsfFormState, value: string) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  const water = result?.water;
  const showWaterStress = water && water.pin_code === form.pinCode && form.pinCode.length === 6;
  const stressLevel = showWaterStress ? water.stress_level ?? "" : "";
  const stressColor = STRESS_COLORS[stressLevel] ?? "#64748B";

  if (fieldScope === "isf") {
    return (
      <CalculatorPanel title="Water stress" subtitle="PIN lookup · WRI Aqueduct">
        <div className="isf-module-layout">
          <div className="isf-module-layout__form">
            <div className="calc-form-grid">
              <NumField
                label="PIN Code (6 digits)"
                value={form.pinCode}
                onChange={(v) => set("pinCode", v.replace(/\D/g, "").slice(0, 6))}
                hint="Auto-resolves water stress · India uses one national grid"
                disabled={readOnly}
              />
            </div>
            <p className="isf-field-hint">
              Withdrawal, discharge, ZLD, and stressed-area volumes are on Environmental.
            </p>
          </div>
          <InsightCard title="Water stress">
            {showWaterStress ? (
              <>
                <div className="isf-water-stress">
                  <span className="isf-water-stress__badge" style={{ background: stressColor }}>
                    {stressLevel.replace(/_/g, " ")}
                  </span>
                  <p className="isf-water-stress__meta">
                    {water.state} · PIN {water.pin_code}
                    {water.water_stress_flag != null && (
                      <> · Stressed: {water.water_stress_flag ? "Yes" : "No"}</>
                    )}
                  </p>
                </div>
                <p className="isf-field-hint">{STRESS_DESCRIPTIONS[stressLevel] ?? ""}</p>
              </>
            ) : (
              <p className="isf-field-hint">
                Enter a valid 6-digit PIN and save to resolve water stress from WRI Aqueduct data.
              </p>
            )}
          </InsightCard>
        </div>
      </CalculatorPanel>
    );
  }

  return (
    <CalculatorPanel title="Water balance" subtitle="Withdrawal, discharge, ZLD · BRSR C_P6_E03 / E04 / L01">
      <div className="isf-module-layout">
        <div className="isf-module-layout__form">
          <p className="isf-subsection-label">ZLD</p>
          <div className="calc-form-grid">
            <BoolField
              label="Zero Liquid Discharge (ZLD)?"
              value={form.zidImplemented}
              onChange={(v) => onChange((prev) => ({ ...prev, zidImplemented: v }))}
              disabled={readOnly}
            />
          </div>

          <p className="isf-subsection-label">Withdrawal (KL)</p>
          <div className="calc-form-grid">
            <NumField label="Groundwater" value={form.groundwaterKl} onChange={(v) => set("groundwaterKl", v)} disabled={readOnly} />
            <NumField label="Surface water" value={form.surfaceWaterKl} onChange={(v) => set("surfaceWaterKl", v)} disabled={readOnly} />
            <NumField label="Municipal / third-party" value={form.municipalWaterKl} onChange={(v) => set("municipalWaterKl", v)} disabled={readOnly} />
            <NumField label="Rainwater harvesting" value={form.rainwaterKl} onChange={(v) => set("rainwaterKl", v)} disabled={readOnly} />
            <NumField label="Other sources" value={form.otherWaterKl} onChange={(v) => set("otherWaterKl", v)} disabled={readOnly} />
          </div>

          <p className="isf-subsection-label">Discharge (KL)</p>
          <div className="calc-form-grid">
            <NumField label="Total discharged" value={form.waterDischargedKl} onChange={(v) => set("waterDischargedKl", v)} disabled={readOnly} />
            <NumField label="To surface water" value={form.dischargeSurfaceKl} onChange={(v) => set("dischargeSurfaceKl", v)} disabled={readOnly} />
            <NumField label="To groundwater" value={form.dischargeGroundwaterKl} onChange={(v) => set("dischargeGroundwaterKl", v)} disabled={readOnly} />
            <NumField label="To seawater" value={form.dischargeSeawaterKl} onChange={(v) => set("dischargeSeawaterKl", v)} disabled={readOnly} />
            <NumField label="To third-party" value={form.dischargeThirdpartyKl} onChange={(v) => set("dischargeThirdpartyKl", v)} disabled={readOnly} />
            <NumField label="Sent for treatment" value={form.dischargeTreatedKl} onChange={(v) => set("dischargeTreatedKl", v)} disabled={readOnly} />
          </div>

          <p className="isf-subsection-label">Water-stressed areas (KL)</p>
          <div className="calc-form-grid">
            <NumField
              label="Withdrawal in stressed areas"
              value={form.waterWithdrawalStressedKl}
              onChange={(v) => set("waterWithdrawalStressedKl", v)}
              disabled={readOnly}
            />
            <NumField
              label="Consumption in stressed areas"
              value={form.waterConsumptionStressedKl}
              onChange={(v) => set("waterConsumptionStressedKl", v)}
              disabled={readOnly}
            />
          </div>
          <p className="isf-field-hint">PIN / stress lookup stays on ISF Calculator.</p>
        </div>

        <InsightCard title="Water KPIs">
          <div className="isf-metric-grid">
            <MetricTile label="Total withdrawal" value={`${fmt4(preview.totalWaterKl)} KL`} hint="KPI_E_W01" />
            <MetricTile
              label="Consumption"
              value={`${fmt4(preview.waterConsumptionKl)} KL`}
              hint={preview.waterNegative ? "Negative — check inputs" : "KPI_E_W02"}
            />
          </div>
          {preview.waterNegative && (
            <p className="isf-alert isf-alert--warn">Discharged exceeds withdrawal — data quality issue.</p>
          )}
        </InsightCard>
      </div>
    </CalculatorPanel>
  );
}
