"use client";

import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import { BoolField, NumField, TextField } from "./shared";

export function EnvDisclosureModule({
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
  const setBool = (key: keyof IsfFormState, value: boolean | null) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  return (
    <CalculatorPanel title="Env disclosure" subtitle="PAT, GHG projects, eco-sensitive, EIA & compliance · BRSR C_P6">
      <div className="isf-module-layout__form" style={{ maxWidth: "100%" }}>
        <p className="isf-subsection-label">PAT / energy scheme</p>
        <div className="calc-form-grid">
          <BoolField
            label="Designated Consumer (PAT)?"
            value={form.isDesignatedConsumer}
            onChange={(v) => setBool("isDesignatedConsumer", v)}
            disabled={readOnly}
          />
          <NumField label="PAT target (toe)" value={form.patTargetToe} onChange={(v) => set("patTargetToe", v)} disabled={readOnly} />
          <NumField label="ESCerts count" value={form.patEscerts} onChange={(v) => set("patEscerts", v)} disabled={readOnly} />
        </div>

        <p className="isf-subsection-label">GHG reduction projects</p>
        <div className="calc-form-grid">
          <BoolField
            label="GHG reduction project(s)?"
            value={form.ghgReductionProject}
            onChange={(v) => setBool("ghgReductionProject", v)}
            disabled={readOnly}
          />
          <NumField
            label="Emissions avoided (tCO₂e)"
            value={form.emissionsAvoidedTco2e}
            onChange={(v) => set("emissionsAvoidedTco2e", v)}
            disabled={readOnly}
          />
        </div>
        <TextField
          label="Project details / technology"
          value={form.ghgProjectDetails}
          onChange={(v) => set("ghgProjectDetails", v)}
          disabled={readOnly}
        />

        <p className="isf-subsection-label">Waste practices</p>
        <TextField
          label="Waste management practices"
          value={form.wasteMgmtPractices}
          onChange={(v) => set("wasteMgmtPractices", v)}
          disabled={readOnly}
        />
        <TextField
          label="Hazardous & plastic reduction strategy"
          value={form.hazPlasticReduction}
          onChange={(v) => set("hazPlasticReduction", v)}
          disabled={readOnly}
        />

        <p className="isf-subsection-label">Eco-sensitive & biodiversity</p>
        <div className="calc-form-grid">
          <BoolField
            label="Operations in eco-sensitive areas?"
            value={form.inEcoSensitiveArea}
            onChange={(v) => setBool("inEcoSensitiveArea", v)}
            disabled={readOnly}
          />
        </div>
        <TextField
          label="Areas & nature of operations"
          value={form.ecoSensitiveDetails}
          onChange={(v) => set("ecoSensitiveDetails", v)}
          disabled={readOnly}
        />
        <TextField
          label="Biodiversity impact & mitigation"
          value={form.biodiversityImpact}
          onChange={(v) => set("biodiversityImpact", v)}
          disabled={readOnly}
        />

        <p className="isf-subsection-label">Environmental Impact Assessment</p>
        <div className="calc-form-grid">
          <label className="calc-field">
            <span className="calc-field__label">EIA project name</span>
            <input
              className="dash-input"
              value={form.eiaProjectName}
              disabled={readOnly}
              onChange={(e) => set("eiaProjectName", e.target.value)}
            />
          </label>
          <label className="calc-field">
            <span className="calc-field__label">EIA notification no. & date</span>
            <input
              className="dash-input"
              value={form.eiaNotification}
              disabled={readOnly}
              onChange={(e) => set("eiaNotification", e.target.value)}
            />
          </label>
          <BoolField
            label="Independent external agency?"
            value={form.eiaExternalAgency}
            onChange={(v) => setBool("eiaExternalAgency", v)}
            disabled={readOnly}
          />
          <BoolField
            label="Results in public domain?"
            value={form.eiaPublicDomain}
            onChange={(v) => setBool("eiaPublicDomain", v)}
            disabled={readOnly}
          />
        </div>

        <p className="isf-subsection-label">Environmental compliance</p>
        <div className="calc-form-grid">
          <BoolField
            label="Compliant with Water / Air / EP Acts?"
            value={form.envComplaint}
            onChange={(v) => setBool("envComplaint", v)}
            hint="Stored as env_complaint (DevDB4)"
            disabled={readOnly}
          />
        </div>
        <TextField
          label="Non-compliance details"
          value={form.envNoncomplianceDetails}
          onChange={(v) => set("envNoncomplianceDetails", v)}
          disabled={readOnly}
        />
      </div>
    </CalculatorPanel>
  );
}
