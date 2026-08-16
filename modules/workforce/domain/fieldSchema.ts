import type { WorkforceInputs, WorkforceSectionId } from "@/modules/workforce/domain/types";

export type FieldInputType = "number" | "number_decimal" | "percent";

export type WorkforceFieldDef = {
  field_id: string;
  field_name: string;
  unit: string;
  input_type: FieldInputType;
  brsr_ref: string;
  api_field: keyof WorkforceInputs;
  step?: string;
  integer?: boolean;
  defaultValue?: number;
  maxField?: keyof WorkforceInputs;
  readOnly?: boolean;
  hint?: string;
};

export type WorkforceSectionDef = {
  id: WorkforceSectionId;
  title: string;
  subtitle?: string;
  fields: WorkforceFieldDef[];
};

export const WORKFORCE_SECTIONS: WorkforceSectionDef[] = [
  {
    id: "employee-headcount",
    title: "Employee Headcount",
    fields: [
      { field_id: "SOC_WF_01", field_name: "Permanent employees (total)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "perm_emp_total", integer: true },
      { field_id: "SOC_WF_02", field_name: "Permanent employees (women)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "perm_emp_women", integer: true, maxField: "perm_emp_total" },
      { field_id: "SOC_WF_03", field_name: "Contractual employees (total)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "contract_emp_total", integer: true },
      { field_id: "SOC_WF_04", field_name: "Contractual employees (women)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "contract_emp_women", integer: true, maxField: "contract_emp_total" },
    ],
  },
  {
    id: "worker-headcount",
    title: "Worker Headcount",
    fields: [
      { field_id: "SOC_WF_05", field_name: "Permanent workers (total)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "perm_worker_total", integer: true },
      { field_id: "SOC_WF_06", field_name: "Permanent workers (women)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "perm_worker_women", integer: true, maxField: "perm_worker_total" },
      { field_id: "SOC_WF_07", field_name: "Contractual workers (total)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "contract_worker_total", integer: true },
      { field_id: "SOC_WF_08", field_name: "Contractual workers (women)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "contract_worker_women", integer: true, maxField: "contract_worker_total" },
    ],
  },
  {
    id: "board-diversity",
    title: "Board & Diversity",
    fields: [
      { field_id: "SOC_BD_01", field_name: "Board members (total)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "board_total", integer: true, hint: "At least 1" },
      { field_id: "SOC_BD_02", field_name: "Board members (women)", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "board_women", integer: true, maxField: "board_total" },
      { field_id: "SOC_BD_03", field_name: "Differently abled employees", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "diff_abled_emp", integer: true },
      { field_id: "SOC_BD_04", field_name: "Differently abled workers", unit: "count", input_type: "number", brsr_ref: "C_P3_E01", api_field: "diff_abled_workers", integer: true },
    ],
  },
  {
    id: "wage-data",
    title: "Wage Data",
    fields: [
      { field_id: "SOC_WG_01", field_name: "Total wage bill", unit: "INR", input_type: "number", brsr_ref: "C_P3_E02", api_field: "total_wage_bill_inr" },
      { field_id: "SOC_WG_02", field_name: "Female wage bill", unit: "INR", input_type: "number", brsr_ref: "C_P3_E02", api_field: "female_wage_bill_inr", maxField: "total_wage_bill_inr" },
      { field_id: "SOC_WG_03", field_name: "Median remuneration — male", unit: "INR", input_type: "number", brsr_ref: "C_P3_E03", api_field: "median_wage_male_inr" },
      { field_id: "SOC_WG_04", field_name: "Median remuneration — female", unit: "INR", input_type: "number", brsr_ref: "C_P3_E03", api_field: "median_wage_female_inr" },
      { field_id: "SOC_WG_05", field_name: "Min wage compliance — employees", unit: "%", input_type: "percent", brsr_ref: "C_P3_E04", api_field: "min_wage_compliance_emp_pct", defaultValue: 100 },
      { field_id: "SOC_WG_06", field_name: "Min wage compliance — workers", unit: "%", input_type: "percent", brsr_ref: "C_P3_E04", api_field: "min_wage_compliance_workers_pct", defaultValue: 100 },
    ],
  },
  {
    id: "safety",
    title: "Safety — LTIFR & Fatalities",
    subtitle: "LTIFR = (Lost time injuries × 1,000,000) / Total hours worked",
    fields: [
      { field_id: "SOC_SF_01", field_name: "LTIFR — employees", unit: "rate", input_type: "number_decimal", brsr_ref: "C_P3_E05", api_field: "ltifr_employees", step: "0.0001" },
      { field_id: "SOC_SF_02", field_name: "LTIFR — workers", unit: "rate", input_type: "number_decimal", brsr_ref: "C_P3_E05", api_field: "ltifr_workers", step: "0.0001" },
      { field_id: "SOC_SF_03", field_name: "Fatalities — employees", unit: "count", input_type: "number", brsr_ref: "C_P3_E06", api_field: "fatalities_emp", integer: true },
      { field_id: "SOC_SF_04", field_name: "Fatalities — workers", unit: "count", input_type: "number", brsr_ref: "C_P3_E06", api_field: "fatalities_workers", integer: true },
      { field_id: "SOC_SF_05", field_name: "High consequence injuries — employees", unit: "count", input_type: "number", brsr_ref: "C_P3_E06", api_field: "high_consequence_inj_emp", integer: true },
      { field_id: "SOC_SF_06", field_name: "High consequence injuries — workers", unit: "count", input_type: "number", brsr_ref: "C_P3_E06", api_field: "high_consequence_inj_workers", integer: true },
    ],
  },
  {
    id: "training",
    title: "Training Hours & Coverage",
    fields: [
      { field_id: "SOC_TR_01", field_name: "Total training hours — employees", unit: "hours", input_type: "number", brsr_ref: "C_P3_E07", api_field: "training_hrs_emp" },
      { field_id: "SOC_TR_02", field_name: "Total training hours — workers", unit: "hours", input_type: "number", brsr_ref: "C_P3_E07", api_field: "training_hrs_workers" },
      { field_id: "SOC_TR_03", field_name: "Employees trained", unit: "%", input_type: "percent", brsr_ref: "C_P3_E07", api_field: "emp_trained_pct" },
      { field_id: "SOC_TR_04", field_name: "Workers trained", unit: "%", input_type: "percent", brsr_ref: "C_P3_E07", api_field: "workers_trained_pct" },
    ],
  },
  {
    id: "benefits",
    title: "Benefits — Insurance Coverage",
    fields: [
      { field_id: "SOC_BN_01", field_name: "Health insurance — employees", unit: "%", input_type: "percent", brsr_ref: "C_P3_E02", api_field: "health_ins_emp_pct" },
      { field_id: "SOC_BN_02", field_name: "Health insurance — workers", unit: "%", input_type: "percent", brsr_ref: "C_P3_E02", api_field: "health_ins_workers_pct" },
      { field_id: "SOC_BN_03", field_name: "Accident insurance — employees", unit: "%", input_type: "percent", brsr_ref: "C_P3_E02", api_field: "accident_ins_emp_pct" },
      { field_id: "SOC_BN_04", field_name: "Accident insurance — workers", unit: "%", input_type: "percent", brsr_ref: "C_P3_E02", api_field: "accident_ins_workers_pct" },
      { field_id: "SOC_BN_05", field_name: "Parental leave return rate", unit: "%", input_type: "percent", brsr_ref: "C_P3_E10", api_field: "parental_leave_return_pct" },
      { field_id: "SOC_BN_06", field_name: "PF / Gratuity coverage", unit: "count", input_type: "number", brsr_ref: "C_P3_E02", api_field: "pf_gratuity_count", integer: true },
      { field_id: "SOC_BN_07", field_name: "Wellbeing spend (% of revenue)", unit: "%", input_type: "percent", brsr_ref: "C_P3_E02", api_field: "wellbeing_spend_pct", step: "0.01" },
    ],
  },
  {
    id: "new-hires",
    title: "New Hires & Sourcing",
    fields: [
      { field_id: "SOC_NH_01", field_name: "Total new hires", unit: "count", input_type: "number", brsr_ref: "C_P8_E04", api_field: "new_hires_total", integer: true },
      { field_id: "SOC_NH_02", field_name: "New hires (women)", unit: "count", input_type: "number", brsr_ref: "C_P8_E04", api_field: "new_hires_women", integer: true, maxField: "new_hires_total" },
      { field_id: "SOC_NH_03", field_name: "New hires (Tier 2/3 cities)", unit: "count", input_type: "number", brsr_ref: "C_P8_E04", api_field: "new_hires_tier23", integer: true, maxField: "new_hires_total" },
      { field_id: "SOC_NH_04", field_name: "Local sourcing %", unit: "%", input_type: "percent", brsr_ref: "C_P8_E07", api_field: "local_sourcing_pct" },
    ],
  },
  {
    id: "posh",
    title: "POSH — Sexual Harassment Complaints",
    fields: [
      { field_id: "SOC_PS_01", field_name: "Complaints filed during year", unit: "count", input_type: "number", brsr_ref: "C_P3_E18", api_field: "posh_filed", integer: true },
      { field_id: "SOC_PS_02", field_name: "Complaints resolved", unit: "count", input_type: "number", brsr_ref: "C_P3_E18", api_field: "posh_resolved", integer: true, maxField: "posh_filed" },
      {
        field_id: "SOC_PS_03",
        field_name: "Complaints pending at year end",
        unit: "count",
        input_type: "number",
        brsr_ref: "C_P3_E19",
        api_field: "posh_pending",
        integer: true,
        readOnly: true,
        hint: "Calculated from filed minus resolved",
      },
    ],
  },
];

export const KPI_DEFINITIONS = [
  { id: "KPI_S_01", label: "Women on board %", formula: "board_women / board_total × 100", field: "kpi_s01" as const, unit: "%" },
  { id: "KPI_S_02", label: "Women in permanent employees %", formula: "perm_emp_women / perm_emp_total × 100", field: "kpi_s02" as const, unit: "%" },
  { id: "KPI_S_03", label: "Women in permanent workers %", formula: "perm_worker_women / perm_worker_total × 100", field: "kpi_s03" as const, unit: "%" },
  { id: "KPI_S_04", label: "Female wage share %", formula: "female_wage_bill / total_wage_bill × 100", field: "kpi_s04" as const, unit: "%" },
  { id: "KPI_S_05", label: "Wage gap ratio (M:F median)", formula: "median_wage_male / median_wage_female", field: "kpi_s05" as const, unit: "ratio", statusField: "kpi_s05_status" as const },
  { id: "KPI_S_06", label: "Avg training hrs/employee", formula: "training_hrs_emp / perm_emp_total", field: "kpi_s06" as const, unit: "hrs" },
  { id: "KPI_S_07", label: "POSH resolution rate %", formula: "posh_resolved / posh_filed × 100", field: "kpi_s07" as const, unit: "%", statusField: "kpi_s07_status" as const },
  { id: "KPI_S_08", label: "Tier 2/3 hiring %", formula: "new_hires_tier23 / new_hires_total × 100", field: "kpi_s08" as const, unit: "%" },
  { id: "KPI_S_09", label: "Female hiring %", formula: "new_hires_women / new_hires_total × 100", field: "kpi_s09" as const, unit: "%" },
] as const;

export const BRSR_WORKFORCE_MAPPINGS = WORKFORCE_SECTIONS.flatMap((section) =>
  section.fields.map((f) => ({
    code: f.field_id,
    label: f.field_name,
    field: f.api_field,
    brsr_ref: f.brsr_ref,
    section: section.title,
  })),
);

export function fieldLabel(field: WorkforceFieldDef): string {
  if (field.unit === "%") return field.field_name;
  if (field.unit === "count" || field.unit === "hours") return field.field_name;
  if (field.unit === "INR") return `${field.field_name} (₹)`;
  if (field.unit === "rate") return field.field_name;
  return `${field.field_name} (${field.unit})`;
}

export function emptyWorkforceForm(): Record<keyof WorkforceInputs, string> {
  const form = {} as Record<keyof WorkforceInputs, string>;
  for (const section of WORKFORCE_SECTIONS) {
    for (const field of section.fields) {
      if (field.defaultValue != null) {
        form[field.api_field] = String(field.defaultValue);
      } else {
        form[field.api_field] = "";
      }
    }
  }
  return form;
}

export function inputsFromForm(form: Record<string, string>): WorkforceInputs {
  const inputs: WorkforceInputs = {};
  for (const section of WORKFORCE_SECTIONS) {
    for (const field of section.fields) {
      if (field.readOnly) continue;
      const raw = form[field.api_field]?.trim();
      if (!raw) continue;
      const n = field.integer ? parseInt(raw, 10) : parseFloat(raw);
      if (Number.isFinite(n)) {
        inputs[field.api_field] = n;
      }
    }
  }
  const filed = inputs.posh_filed;
  const resolved = inputs.posh_resolved;
  if (filed != null && resolved != null) {
    inputs.posh_pending = filed - resolved;
  }
  return inputs;
}

export function formFromInputs(inputs?: WorkforceInputs): Record<string, string> {
  const form = emptyWorkforceForm();
  if (!inputs) return form;
  for (const key of Object.keys(form) as (keyof WorkforceInputs)[]) {
    const v = inputs[key];
    if (v != null && Number.isFinite(v)) {
      form[key] = String(v);
    }
  }
  return form;
}
