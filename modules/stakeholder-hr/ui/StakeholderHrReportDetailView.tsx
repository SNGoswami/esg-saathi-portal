"use client";

import { useMemo } from "react";
import { boolToForm, fieldLabel, isFieldVisible } from "@/modules/calculators/domain/disclosureFormHelpers";
import type { DisclosureFieldDef } from "@/modules/calculators/domain/disclosureTypes";
import { STAKEHOLDER_HR_SECTIONS } from "@/modules/stakeholder-hr/domain/fieldSchema";
import { fmtDate, fmtNum } from "@/modules/stakeholder-hr/domain/reportHelpers";
import type { StakeholderHrInputs } from "@/modules/stakeholder-hr/domain/types";

function formatValue(field: DisclosureFieldDef, value: unknown): string {
  if (value == null || value === "") return "-";
  if (field.input_type === "boolean_dropdown") {
    return value === true ? "Yes" : value === false ? "No" : "-";
  }
  if (field.input_type === "percent") return `${fmtNum(Number(value), 2)}%`;
  if (field.input_type === "number_decimal") return fmtNum(Number(value), 1);
  if (field.input_type === "text_long") return String(value);
  if (typeof value === "number") return fmtNum(value, 0);
  return String(value);
}

export default function StakeholderHrReportDetailView({
  report,
}: {
  report: { fiscal_year?: string; updated_at?: string; inputs?: StakeholderHrInputs };
}) {
  const inputs = useMemo(() => report.inputs ?? {}, [report.inputs]);
  const form = useMemo(() => {
    const f: Record<string, string> = {};
    for (const section of STAKEHOLDER_HR_SECTIONS) {
      for (const field of section.fields ?? []) {
        const v = inputs[field.api_field as keyof StakeholderHrInputs];
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

      {STAKEHOLDER_HR_SECTIONS.map((section) => {
        const visibleFields = (section.fields ?? []).filter((f) => isFieldVisible(f, form));
        if (visibleFields.length === 0) return null;
        return (
          <div key={section.id} className="report-detail-card card card--elevated">
            <p className="dash-section-title report-detail-card__title">{section.title}</p>
            {section.subtitle && (
              <p className="dash-muted report-detail-card__subtitle">{section.subtitle}</p>
            )}
            <div className="report-detail-card__body">
              {visibleFields.map((field) => (
                <div key={field.field_id} className="report-input-row">
                  <span className="report-input-row__label">{fieldLabel(field)}</span>
                  <span className="report-input-row__value">
                    {formatValue(field, inputs[field.api_field as keyof StakeholderHrInputs])}
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
