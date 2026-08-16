"use client";

import { useMemo } from "react";
import type { WorkforceReportResponse } from "@/modules/workforce/domain/types";
import { fieldLabel, KPI_DEFINITIONS, WORKFORCE_SECTIONS } from "@/modules/workforce/domain/fieldSchema";
import { fmtDate, fmtInr, fmtKpi, fmtNum } from "@/modules/workforce/domain/reportHelpers";

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card card--elevated" style={{ padding: "1rem" }}>
      <p className="dash-section-title" style={{ fontSize: "0.95rem" }}>
        {title}
      </p>
      {subtitle && (
        <p className="dash-muted" style={{ fontSize: "0.7rem", marginTop: 4 }}>
          {subtitle}
        </p>
      )}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function InputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-input-row">
      <span className="report-input-row__label">{label}</span>
      <span className="report-input-row__value">{value}</span>
    </div>
  );
}

function formatFieldValue(
  apiField: string,
  value: number | undefined,
  inputType: string,
): string {
  if (value == null || !Number.isFinite(value)) return "-";
  if (apiField.includes("wage") || apiField.includes("inr")) return fmtInr(value);
  if (inputType === "percent") return `${fmtNum(value, 2)}%`;
  if (inputType === "number_decimal") return fmtNum(value, 4);
  return fmtNum(value, 0);
}

export default function WorkforceReportDetailView({ report }: { report: WorkforceReportResponse }) {
  const inputs = useMemo(() => report.inputs ?? {}, [report.inputs]);
  const kpis = report.kpis ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="card card--elevated" style={{ padding: "1rem" }}>
        <p className="dash-muted" style={{ fontSize: "0.75rem" }}>
          Fiscal year {report.fiscal_year ?? "-"}
          {report.updated_at && ` · Saved ${fmtDate(report.updated_at)}`}
        </p>
      </div>

      <SectionCard title="Key metrics">
        <div className="report-metrics-grid">
          {KPI_DEFINITIONS.map((kpi) => {
            const value = kpis[kpi.field];
            const status = "statusField" in kpi ? kpis[kpi.statusField] : null;
            return (
              <div key={kpi.id} className="card" style={{ padding: "0.875rem" }}>
                <p className="dash-label" style={{ fontSize: "0.75rem" }}>
                  {kpi.label}
                </p>
                <p className="dash-section-title" style={{ fontSize: "1.1rem", marginTop: 6 }}>
                  {fmtKpi(value, status, kpi.unit)}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {WORKFORCE_SECTIONS.map((section) => (
        <SectionCard key={section.id} title={section.title} subtitle={section.subtitle}>
          {section.fields.map((field) => (
            <InputRow
              key={field.field_id}
              label={fieldLabel(field)}
              value={formatFieldValue(
                field.api_field,
                inputs[field.api_field],
                field.input_type,
              )}
            />
          ))}
        </SectionCard>
      ))}
    </div>
  );
}
