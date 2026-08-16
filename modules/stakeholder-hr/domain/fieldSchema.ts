import type { DisclosureSectionDef } from "@/modules/calculators/domain/disclosureTypes";
import {
  boolToForm,
  parseBoolForm,
  yesNoOptions,
} from "@/modules/calculators/domain/disclosureFormHelpers";
import type { StakeholderHrInputs, StakeholderHrSectionId } from "@/modules/stakeholder-hr/domain/types";

const REVIEW_FREQ = [
  { value: "annually", label: "Annually" },
  { value: "bi_annually", label: "Bi-annually" },
  { value: "every_3_years", label: "Every 3 years" },
  { value: "ad_hoc", label: "Ad hoc" },
];

export const STAKEHOLDER_HR_SECTIONS: DisclosureSectionDef[] = [
  {
    id: "stakeholder-engagement",
    title: "Stakeholder Engagement",
    shortTitle: "Stakeholders",
    fields: [
      { field_id: "GOV_SE_01", field_name: "Stakeholder groups identified", unit: "count", input_type: "number", brsr_ref: "C_P4_E01", api_field: "stakeholder_groups_count", integer: true },
      { field_id: "GOV_SE_02", field_name: "Engagement frequency by group", unit: "—", input_type: "text_long", brsr_ref: "C_P4_E02", api_field: "stakeholder_freq_text", maxLength: 2000 },
      { field_id: "GOV_SE_03", field_name: "Engagement channels used", unit: "—", input_type: "text_long", brsr_ref: "C_P4_E03", api_field: "stakeholder_channels_text", maxLength: 2000 },
      { field_id: "GOV_SE_04", field_name: "Board consultation process on ESG", unit: "—", input_type: "text_long", brsr_ref: "C_P4_E04", api_field: "board_consultation_process", maxLength: 2000 },
      { field_id: "GOV_SE_05", field_name: "Engagement with vulnerable / marginalized groups", unit: "—", input_type: "text_long", brsr_ref: "C_P4_E05", api_field: "vulnerable_engagement_text", maxLength: 2000 },
    ],
  },
  {
    id: "materiality",
    title: "Materiality Assessment",
    shortTitle: "Materiality",
    fields: [
      { field_id: "GOV_MA_01", field_name: "Materiality assessment conducted?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P4_E06", api_field: "materiality_conducted", options: yesNoOptions() },
      { field_id: "GOV_MA_02", field_name: "Material ESG topics identified", unit: "count", input_type: "number", brsr_ref: "C_P4_E06", api_field: "material_topics_count", integer: true, visibleWhen: { field: "materiality_conducted", equals: "yes" } },
      { field_id: "GOV_MA_03", field_name: "Review frequency", unit: "—", input_type: "dropdown", brsr_ref: "C_P4_E06", api_field: "materiality_review_freq", options: REVIEW_FREQ, visibleWhen: { field: "materiality_conducted", equals: "yes" } },
      { field_id: "GOV_MA_04", field_name: "Material topics with stakeholder mapping", unit: "—", input_type: "text_long", brsr_ref: "C_P4_E07", api_field: "material_topics_text", maxLength: 2000, visibleWhen: { field: "materiality_conducted", equals: "yes" } },
    ],
  },
  {
    id: "hr-training",
    title: "HR Training (Human Rights)",
    shortTitle: "HR Training",
    fields: [
      { field_id: "GOV_HT_01", field_name: "HR training sessions — employees", unit: "count", input_type: "number", brsr_ref: "C_P5_E01", api_field: "hr_training_sessions_emp", integer: true },
      { field_id: "GOV_HT_02", field_name: "Employee coverage — HR training", unit: "%", input_type: "percent", brsr_ref: "C_P5_E02", api_field: "hr_training_coverage_emp_pct" },
      { field_id: "GOV_HT_03", field_name: "HR training sessions — workers", unit: "count", input_type: "number", brsr_ref: "C_P5_E03", api_field: "hr_training_sessions_workers", integer: true },
      { field_id: "GOV_HT_04", field_name: "Worker coverage — HR training", unit: "%", input_type: "percent", brsr_ref: "C_P5_E04", api_field: "hr_training_coverage_workers_pct" },
      { field_id: "GOV_HT_05", field_name: "Designated focal point for human rights?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_E05", api_field: "hr_focal_point_exists", options: yesNoOptions() },
    ],
  },
  {
    id: "hr-complaints",
    title: "Human Rights Complaints",
    shortTitle: "Complaints",
    fields: [
      { field_id: "GOV_HC_01", field_name: "Sexual harassment complaints", unit: "count", input_type: "number", brsr_ref: "C_P5_E07", api_field: "hr_complaint_sexual_harassment", integer: true },
      { field_id: "GOV_HC_02", field_name: "Discrimination at workplace", unit: "count", input_type: "number", brsr_ref: "C_P5_E08", api_field: "hr_complaint_discrimination", integer: true },
      { field_id: "GOV_HC_03", field_name: "Child labour", unit: "count", input_type: "number", brsr_ref: "C_P5_E09", api_field: "hr_complaint_child_labour", integer: true },
      { field_id: "GOV_HC_04", field_name: "Forced / involuntary labour", unit: "count", input_type: "number", brsr_ref: "C_P5_E10", api_field: "hr_complaint_forced_labour", integer: true },
      { field_id: "GOV_HC_05", field_name: "Wages", unit: "count", input_type: "number", brsr_ref: "C_P5_E11", api_field: "hr_complaint_wages", integer: true },
      { field_id: "GOV_HC_06", field_name: "Other human rights issues", unit: "count", input_type: "number", brsr_ref: "C_P5_E12", api_field: "hr_complaint_other", integer: true },
    ],
  },
  {
    id: "grievances",
    title: "Grievance Mechanisms",
    shortTitle: "Grievances",
    fields: [
      { field_id: "GOV_GV_01", field_name: "Grievance channels available", unit: "count", input_type: "number", brsr_ref: "C_P3_E15", api_field: "grievance_channels_count", integer: true },
      { field_id: "GOV_GV_02", field_name: "Grievance channel details", unit: "—", input_type: "text_long", brsr_ref: "C_P3_E15", api_field: "grievance_channel_details", maxLength: 2000 },
      { field_id: "GOV_GV_03", field_name: "Grievances filed during the year", unit: "count", input_type: "number", brsr_ref: "C_P3_E16", api_field: "grievances_filed", integer: true },
      { field_id: "GOV_GV_04", field_name: "Grievances resolved", unit: "count", input_type: "number", brsr_ref: "C_P3_E16", api_field: "grievances_resolved", integer: true, maxField: "grievances_filed" },
      { field_id: "GOV_GV_05", field_name: "Grievances pending", unit: "count", input_type: "number", brsr_ref: "C_P3_E16", api_field: "grievances_pending", integer: true, readOnly: true, hint: "Calculated from filed minus resolved" },
      { field_id: "GOV_GV_06", field_name: "Average resolution time", unit: "days", input_type: "number_decimal", brsr_ref: "C_P3_E17", api_field: "grievance_avg_resolution_days", step: "0.1" },
    ],
  },
  {
    id: "hr-policies",
    title: "HR Policies",
    shortTitle: "Policies",
    fields: [
      { field_id: "GOV_HP_01", field_name: "Human rights policy exists?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L03", api_field: "hr_policy_exists", options: yesNoOptions() },
      { field_id: "GOV_HP_02", field_name: "Child labour prevention policy?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L03", api_field: "child_labour_policy_exists", options: yesNoOptions() },
      { field_id: "GOV_HP_03", field_name: "Forced labour prevention policy?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L03", api_field: "forced_labour_policy_exists", options: yesNoOptions() },
      { field_id: "GOV_HP_04", field_name: "Supply chain HR due diligence conducted?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L03", api_field: "supply_chain_hr_dd", options: yesNoOptions() },
      { field_id: "GOV_HP_05", field_name: "Premises accessible to differently-abled?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L01", api_field: "premises_accessible", options: yesNoOptions() },
      { field_id: "GOV_HP_06", field_name: "Business continuity & disaster management plan?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L02", api_field: "bcp_exists", options: yesNoOptions() },
      { field_id: "GOV_HP_07", field_name: "Operations near indigenous / tribal communities?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P5_L03", api_field: "indigenous_ops_flag", options: yesNoOptions() },
      { field_id: "GOV_HP_08", field_name: "Vulnerable populations identified", unit: "—", input_type: "text_long", brsr_ref: "C_P5_L03", api_field: "vulnerable_populations_text", maxLength: 2000, visibleWhen: { field: "indigenous_ops_flag", equals: "yes" } },
      { field_id: "GOV_HP_09", field_name: "Rehabilitation / resettlement measures", unit: "—", input_type: "text_long", brsr_ref: "C_P5_L03", api_field: "rehabilitation_measures_text", maxLength: 2000, visibleWhen: { field: "indigenous_ops_flag", equals: "yes" } },
    ],
  },
];

const BOOL_FIELDS = new Set([
  "materiality_conducted",
  "hr_focal_point_exists",
  "hr_policy_exists",
  "child_labour_policy_exists",
  "forced_labour_policy_exists",
  "supply_chain_hr_dd",
  "premises_accessible",
  "bcp_exists",
  "indigenous_ops_flag",
]);

const INT_FIELDS = new Set([
  "stakeholder_groups_count",
  "material_topics_count",
  "hr_training_sessions_emp",
  "hr_training_sessions_workers",
  "hr_complaint_sexual_harassment",
  "hr_complaint_discrimination",
  "hr_complaint_child_labour",
  "hr_complaint_forced_labour",
  "hr_complaint_wages",
  "hr_complaint_other",
  "grievance_channels_count",
  "grievances_filed",
  "grievances_resolved",
  "grievances_pending",
]);

export function emptyStakeholderHrForm(): Record<string, string> {
  const form: Record<string, string> = {};
  for (const section of STAKEHOLDER_HR_SECTIONS) {
    for (const field of section.fields ?? []) {
      form[field.api_field] = field.defaultValue != null ? String(field.defaultValue) : "";
    }
  }
  return form;
}

export function formFromStakeholderInputs(inputs?: StakeholderHrInputs): Record<string, string> {
  const form = emptyStakeholderHrForm();
  if (!inputs) return form;
  for (const key of Object.keys(form)) {
    const v = inputs[key as keyof StakeholderHrInputs];
    if (v == null) continue;
    if (BOOL_FIELDS.has(key)) form[key] = boolToForm(v as boolean);
    else if (typeof v === "number" && Number.isFinite(v)) form[key] = String(v);
    else if (typeof v === "string") form[key] = v;
  }
  return form;
}

export function inputsFromStakeholderForm(form: Record<string, string>): StakeholderHrInputs {
  const inputs: StakeholderHrInputs = {};
  for (const section of STAKEHOLDER_HR_SECTIONS) {
    for (const field of section.fields ?? []) {
      if (field.readOnly) continue;
      const raw = form[field.api_field]?.trim();
      if (!raw) continue;
      if (BOOL_FIELDS.has(field.api_field)) {
        const b = parseBoolForm(raw);
        if (b != null) inputs[field.api_field as keyof StakeholderHrInputs] = b as never;
      } else if (field.input_type === "text_long" || field.input_type === "dropdown") {
        inputs[field.api_field as keyof StakeholderHrInputs] = raw as never;
      } else if (INT_FIELDS.has(field.api_field)) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) inputs[field.api_field as keyof StakeholderHrInputs] = n as never;
      } else {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) inputs[field.api_field as keyof StakeholderHrInputs] = n as never;
      }
    }
  }
  const filed = inputs.grievances_filed;
  const resolved = inputs.grievances_resolved;
  if (filed != null && resolved != null) {
    inputs.grievances_pending = filed - resolved;
  }
  return inputs;
}

export type { StakeholderHrSectionId };
