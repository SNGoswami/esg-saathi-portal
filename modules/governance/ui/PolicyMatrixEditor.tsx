"use client";

import type { PolicyMatrixRow } from "@/modules/calculators/domain/disclosureTypes";
import { BRSR_PRINCIPLES } from "@/modules/governance/domain/types";
import { CalculatorField } from "@/modules/calculators/ui/CalculatorLayout";

function boolSelect(
  value: boolean | undefined,
  onChange: (v: boolean | undefined) => void,
  label: string,
  disabled = false,
) {
  return (
    <CalculatorField label={label}>
      <select
        className="dash-input"
        value={value === true ? "yes" : value === false ? "no" : ""}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "yes" ? true : v === "no" ? false : undefined);
        }}
      >
        <option value="">Select</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </CalculatorField>
  );
}

function principleSummary(row: PolicyMatrixRow): string {
  const flags = [
    row.policy_exists && "Policy",
    row.board_approved && "Board",
    row.grievance_mechanism && "Grievance",
  ].filter(Boolean);
  return flags.length > 0 ? flags.join(" · ") : "Not started";
}

export function PolicyMatrixEditor({
  rows,
  onChange,
  readOnly = false,
}: {
  rows: PolicyMatrixRow[];
  onChange: (rows: PolicyMatrixRow[]) => void;
  readOnly?: boolean;
}) {
  function updateRow(index: number, patch: Partial<PolicyMatrixRow>) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  }

  return (
    <div className="policy-matrix">
      <p className="policy-matrix__intro dash-muted">
        Tap each principle to expand. Complete all nine for full BRSR policy coverage.
      </p>
      {rows.map((row, index) => {
        const meta = BRSR_PRINCIPLES.find((p) => p.id === row.principle);
        return (
          <details key={row.principle} className="policy-matrix__item" open={index === 0}>
            <summary className="policy-matrix__summary">
              <span className="policy-matrix__summary-title">
                {row.principle}: {meta?.label}
              </span>
              <span className="policy-matrix__summary-meta">{principleSummary(row)}</span>
            </summary>
            <div className="policy-matrix__body calc-form-grid">
              {boolSelect(row.policy_exists, (v) => updateRow(index, { policy_exists: v }), "Policy exists?", readOnly)}
              {boolSelect(row.board_approved, (v) => updateRow(index, { board_approved: v }), "Board approved?", readOnly)}
              {boolSelect(row.committee_oversight, (v) => updateRow(index, { committee_oversight: v }), "Committee oversight?", readOnly)}
              {boolSelect(row.written_procedures, (v) => updateRow(index, { written_procedures: v }), "Written procedures?", readOnly)}
              {boolSelect(row.grievance_mechanism, (v) => updateRow(index, { grievance_mechanism: v }), "Grievance mechanism?", readOnly)}
              <CalculatorField label="Policy web URL (optional)" className="calc-field--full">
                <input
                  className="dash-input"
                  type="url"
                  inputMode="url"
                  value={row.web_url ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => updateRow(index, { web_url: e.target.value || undefined })}
                  placeholder="https://"
                />
              </CalculatorField>
            </div>
          </details>
        );
      })}
    </div>
  );
}
