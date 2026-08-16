"use client";

import { useMemo } from "react";
import { boolToForm, fieldLabel, isFieldVisible } from "@/modules/calculators/domain/disclosureFormHelpers";
import type { DisclosureFieldDef } from "@/modules/calculators/domain/disclosureTypes";
import { GOVERNANCE_SECTIONS } from "@/modules/governance/domain/fieldSchema";
import { fmtDate, fmtKpiGov, fmtNum } from "@/modules/governance/domain/reportHelpers";
import type { GovernanceInputs, GovernanceKpis } from "@/modules/governance/domain/types";
import { BRSR_PRINCIPLES } from "@/modules/governance/domain/types";

const KPI_LABELS = [
  { key: "kpiG01", label: "Policy coverage", field: "kpi_g01" as const },
  { key: "kpiG02", label: "Board approval coverage", field: "kpi_g02" as const },
  { key: "kpiG03", label: "Grievance mechanism coverage", field: "kpi_g03" as const },
  { key: "kpiG04", label: "Board independence", field: "kpi_g04" as const, status: "kpi_g04_status" as const, suffix: "%" },
  { key: "kpiG05", label: "Women on board", field: "kpi_g05" as const, status: "kpi_g05_status" as const, suffix: "%" },
  { key: "kpiG06", label: "Whistleblower resolution rate", field: "kpi_g06" as const, status: "kpi_g06_status" as const, suffix: "%" },
  { key: "kpiG07", label: "CSR compliance rate", field: "kpi_g07" as const, status: "kpi_g07_status" as const, suffix: "%" },
  { key: "kpiG08", label: "Grievance resolution rate", field: "kpi_g08" as const, status: "kpi_g08_status" as const, suffix: "%" },
];

function formatValue(field: DisclosureFieldDef, value: unknown): string {
  if (value == null || value === "") return "-";
  if (field.input_type === "boolean_dropdown") {
    return value === true ? "Yes" : value === false ? "No" : "-";
  }
  if (field.unit === "INR Lakhs") return `₹${fmtNum(Number(value), 2)} Lakhs`;
  if (field.input_type === "percent") return `${fmtNum(Number(value), 2)}%`;
  if (field.input_type === "number_decimal") return fmtNum(Number(value), field.unit === "days" ? 1 : 2);
  if (field.input_type === "text_long") return String(value);
  if (typeof value === "number") return fmtNum(value, 0);
  return String(value);
}

export default function GovernanceReportDetailView({
  report,
}: {
  report: {
    fiscal_year?: string;
    updated_at?: string;
    inputs?: GovernanceInputs;
    kpis?: GovernanceKpis & Record<string, unknown>;
  };
}) {
  const inputs = useMemo(() => report.inputs ?? {}, [report.inputs]);
  const kpis = report.kpis ?? {};
  const form = useMemo(() => {
    const f: Record<string, string> = {};
    for (const section of GOVERNANCE_SECTIONS) {
      for (const field of section.fields ?? []) {
        const v = inputs[field.api_field as keyof GovernanceInputs];
        if (field.input_type === "boolean_dropdown") f[field.api_field] = boolToForm(v as boolean);
        else if (v != null) f[field.api_field] = String(v);
        else f[field.api_field] = "";
      }
    }
    return f;
  }, [inputs]);

  return (
    <div className="report-detail-stack">
      <div className="report-detail-card card card--elevated">
        <p className="report-detail-card__meta dash-muted">
          Fiscal year {report.fiscal_year ?? "-"}
          {report.updated_at && ` · Saved ${fmtDate(report.updated_at)}`}
        </p>
      </div>

      <div className="report-detail-card card card--elevated">
        <p className="dash-section-title report-detail-card__title">Key metrics</p>
        <div className="report-metrics-grid report-detail-card__body">
          {KPI_LABELS.map((kpi) => {
            const statusKey = "status" in kpi ? kpi.status : undefined;
            const status = statusKey ? (kpis[statusKey] as string | undefined) : undefined;
            const value = kpis[kpi.field] as number | string | undefined;
            return (
              <div key={kpi.key} className="report-metric-card card">
                <p className="dash-label report-metric-card__label">{kpi.label}</p>
                <p className="dash-section-title report-metric-card__value">
                  {fmtKpiGov(value, status, kpi.suffix ?? "")}
                </p>
                {status && status !== "OK" && status !== "NOT_APPLICABLE" && (
                  <p className="dash-muted report-metric-card__status">{status}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {inputs.policy_matrix && inputs.policy_matrix.length > 0 && (
        <div className="report-detail-card card card--elevated">
          <p className="dash-section-title report-detail-card__title">Policy Matrix</p>
          <div className="report-detail-card__body">
          {inputs.policy_matrix.map((row) => {
            const meta = BRSR_PRINCIPLES.find((p) => p.id === row.principle);
            return (
              <div key={row.principle} className="policy-matrix-report__row">
                <p className="dash-label policy-matrix-report__title">
                  {row.principle}: {meta?.label}
                </p>
                <p className="dash-muted policy-matrix-report__flags">
                  Policy: {row.policy_exists ? "Yes" : "No"} · Board approved: {row.board_approved ? "Yes" : "No"} ·
                  Committee: {row.committee_oversight ? "Yes" : "No"} · Procedures:{" "}
                  {row.written_procedures ? "Yes" : "No"} · Grievance: {row.grievance_mechanism ? "Yes" : "No"}
                </p>
                {row.web_url && (
                  <p className="dash-muted policy-matrix-report__url">{row.web_url}</p>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {GOVERNANCE_SECTIONS.filter((s) => s.variant !== "policy_matrix").map((section) => {
        const visibleFields = (section.fields ?? []).filter((f) => isFieldVisible(f, form));
        if (visibleFields.length === 0) return null;
        return (
          <div key={section.id} className="report-detail-card card card--elevated">
            <p className="dash-section-title report-detail-card__title">{section.title}</p>
            <div className="report-detail-card__body">
              {visibleFields.map((field) => (
                <div key={field.field_id} className="report-input-row">
                  <span className="report-input-row__label">{fieldLabel(field)}</span>
                  <span className="report-input-row__value">
                    {formatValue(field, inputs[field.api_field as keyof GovernanceInputs])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
