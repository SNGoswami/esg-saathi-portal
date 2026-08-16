import type { DisclosureSectionDef, PolicyMatrixRow } from "@/modules/calculators/domain/disclosureTypes";
import {
  boolToForm,
  parseBoolForm,
  yesNoOptions,
} from "@/modules/calculators/domain/disclosureFormHelpers";
import type { GovernanceInputs } from "@/modules/governance/domain/types";
import { emptyPolicyMatrix } from "@/modules/governance/domain/types";

const ESG_FREQ = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "annually", label: "Annually" },
  { value: "ad_hoc", label: "Ad hoc" },
];

export const GOVERNANCE_SECTIONS: DisclosureSectionDef[] = [
  {
    id: "policy-matrix",
    title: "Policy Matrix (Principles 1–9)",
    shortTitle: "P1–P9",
    subtitle: "BRSR principles coverage for your organisation",
    variant: "policy_matrix",
  },
  {
    id: "esg-committee",
    title: "ESG / Sustainability Committee",
    shortTitle: "ESG Committee",
    fields: [
      { field_id: "GOV_EC_01", field_name: "ESG / sustainability committee exists?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "B_ESG_01", api_field: "esg_committee_exists", options: yesNoOptions() },
      { field_id: "GOV_EC_02", field_name: "Meeting frequency", unit: "—", input_type: "dropdown", brsr_ref: "B_ESG_02", api_field: "esg_committee_freq", options: ESG_FREQ, visibleWhen: { field: "esg_committee_exists", equals: "yes" } },
      { field_id: "GOV_EC_03", field_name: "Independent members on committee", unit: "count", input_type: "number", brsr_ref: "B_ESG_03", api_field: "esg_committee_independent", integer: true, visibleWhen: { field: "esg_committee_exists", equals: "yes" } },
      { field_id: "GOV_EC_04", field_name: "Committee members & roles", unit: "—", input_type: "text_long", brsr_ref: "B_ESG_04", api_field: "esg_committee_composition", maxLength: 2000, visibleWhen: { field: "esg_committee_exists", equals: "yes" } },
    ],
  },
  {
    id: "anti-corruption",
    title: "Anti-Corruption & Ethics",
    shortTitle: "Ethics",
    fields: [
      { field_id: "GOV_AC_01", field_name: "Anti-corruption / anti-bribery policy exists?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P1_E08", api_field: "anti_corruption_policy", options: yesNoOptions() },
      { field_id: "GOV_AC_02", field_name: "Anti-corruption training hours (total)", unit: "hours", input_type: "number", brsr_ref: "C_P1_E08", api_field: "anti_corruption_training_hrs" },
      { field_id: "GOV_AC_03", field_name: "Disciplinary actions for corruption", unit: "count", input_type: "number", brsr_ref: "C_P1_E08", api_field: "disciplinary_actions_corruption", integer: true },
      { field_id: "GOV_AC_04", field_name: "Conflict of interest complaints — filed", unit: "count", input_type: "number", brsr_ref: "C_P1_E06", api_field: "conflict_interest_filed", integer: true },
      { field_id: "GOV_AC_05", field_name: "Conflict of interest complaints — pending", unit: "count", input_type: "number", brsr_ref: "C_P1_E07", api_field: "conflict_interest_pending", integer: true, maxField: "conflict_interest_filed" },
      { field_id: "GOV_AC_06", field_name: "Whistleblower complaints — filed", unit: "count", input_type: "number", brsr_ref: "C_P1_E06", api_field: "whistleblower_filed", integer: true },
      { field_id: "GOV_AC_07", field_name: "Whistleblower complaints — resolved", unit: "count", input_type: "number", brsr_ref: "C_P1_E06", api_field: "whistleblower_resolved", integer: true, maxField: "whistleblower_filed" },
      { field_id: "GOV_AC_08", field_name: "Fines / penalties paid (current FY)", unit: "INR Lakhs", input_type: "number_decimal", brsr_ref: "C_P1_E08", api_field: "fines_paid_inr_lakhs", step: "0.01" },
    ],
  },
  {
    id: "trade-associations",
    title: "Trade Associations",
    shortTitle: "Trade",
    fields: [
      { field_id: "GOV_TA_01", field_name: "Trade / industry associations affiliated", unit: "count", input_type: "number", brsr_ref: "C_P7_E01", api_field: "trade_assoc_count", integer: true },
      { field_id: "GOV_TA_02", field_name: "Lobbied / advocated for public good through associations?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P7_E03", api_field: "trade_assoc_advocacy", options: yesNoOptions() },
      { field_id: "GOV_TA_03", field_name: "Top 10 associations (by turnover)", unit: "—", input_type: "text_long", brsr_ref: "C_P7_E02", api_field: "trade_assoc_top10_text", maxLength: 2000 },
    ],
  },
  {
    id: "csr",
    title: "CSR — Section 135",
    shortTitle: "CSR",
    fields: [
      { field_id: "GOV_CS_01", field_name: "Is CSR applicable to the entity?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P8_E05", api_field: "csr_applicable", options: yesNoOptions() },
      { field_id: "GOV_CS_02", field_name: "CSR obligation amount", unit: "INR Lakhs", input_type: "number_decimal", brsr_ref: "C_P8_E05", api_field: "csr_obligation_inr_lakhs", step: "0.01", visibleWhen: { field: "csr_applicable", equals: "yes" } },
      { field_id: "GOV_CS_03", field_name: "CSR amount spent", unit: "INR Lakhs", input_type: "number_decimal", brsr_ref: "C_P8_E05", api_field: "csr_spent_inr_lakhs", step: "0.01", visibleWhen: { field: "csr_applicable", equals: "yes" } },
      { field_id: "GOV_CS_04", field_name: "CSR unspent amount", unit: "INR Lakhs", input_type: "number_decimal", brsr_ref: "C_P8_E05", api_field: "csr_unspent_inr_lakhs", step: "0.01", readOnly: true, hint: "Calculated from obligation minus spent", visibleWhen: { field: "csr_applicable", equals: "yes" } },
      { field_id: "GOV_CS_05", field_name: "Persons benefited from CSR projects", unit: "count", input_type: "number", brsr_ref: "C_P8_E06", api_field: "csr_persons_benefited", integer: true, visibleWhen: { field: "csr_applicable", equals: "yes" } },
      { field_id: "GOV_CS_06", field_name: "Impact assessment conducted?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "C_P8_E06", api_field: "csr_impact_assessment", options: yesNoOptions(), visibleWhen: { field: "csr_applicable", equals: "yes" } },
    ],
  },
  {
    id: "board-structure",
    title: "Board Structure",
    shortTitle: "Board",
    fields: [
      { field_id: "GOV_BRD_01", field_name: "Total board size", unit: "count", input_type: "number", brsr_ref: "B_Board_01", api_field: "board_size_total", integer: true, hint: "At least 1" },
      { field_id: "GOV_BRD_02", field_name: "Independent directors", unit: "count", input_type: "number", brsr_ref: "B_Board_02", api_field: "board_independent", integer: true, maxField: "board_size_total" },
      { field_id: "GOV_BRD_03", field_name: "Women directors", unit: "count", input_type: "number", brsr_ref: "B_Board_03", api_field: "board_women", integer: true, maxField: "board_size_total" },
      { field_id: "GOV_BRD_04", field_name: "Director with ESG / sustainability expertise?", unit: "—", input_type: "boolean_dropdown", brsr_ref: "B_Board_04", api_field: "board_esg_expertise", options: yesNoOptions() },
    ],
  },
];

const BOOL_FIELDS = new Set([
  "esg_committee_exists",
  "anti_corruption_policy",
  "trade_assoc_advocacy",
  "csr_applicable",
  "csr_impact_assessment",
  "board_esg_expertise",
]);

const INT_FIELDS = new Set([
  "esg_committee_independent",
  "disciplinary_actions_corruption",
  "conflict_interest_filed",
  "conflict_interest_pending",
  "whistleblower_filed",
  "whistleblower_resolved",
  "trade_assoc_count",
  "csr_persons_benefited",
  "board_size_total",
  "board_independent",
  "board_women",
]);

export function emptyGovernanceForm(): Record<string, string> {
  const form: Record<string, string> = {};
  for (const section of GOVERNANCE_SECTIONS) {
    for (const field of section.fields ?? []) {
      form[field.api_field] = "";
    }
  }
  return form;
}

export function formFromGovernanceInputs(inputs?: GovernanceInputs): Record<string, string> {
  const form = emptyGovernanceForm();
  if (!inputs) return form;
  for (const key of Object.keys(form)) {
    const v = inputs[key as keyof GovernanceInputs];
    if (v == null) continue;
    if (BOOL_FIELDS.has(key)) form[key] = boolToForm(v as boolean);
    else if (typeof v === "number" && Number.isFinite(v)) form[key] = String(v);
    else if (typeof v === "string") form[key] = v;
  }
  if (inputs.csr_obligation_inr_lakhs != null && inputs.csr_spent_inr_lakhs != null) {
    form.csr_unspent_inr_lakhs = String(inputs.csr_obligation_inr_lakhs - inputs.csr_spent_inr_lakhs);
  }
  return form;
}

export function policyMatrixFromInputs(inputs?: GovernanceInputs): PolicyMatrixRow[] {
  if (!inputs?.policy_matrix?.length) return emptyPolicyMatrix();
  const byPrinciple = new Map(inputs.policy_matrix.map((r) => [r.principle, r]));
  return emptyPolicyMatrix().map((base) => ({ ...base, ...byPrinciple.get(base.principle) }));
}

export function inputsFromGovernanceForm(
  form: Record<string, string>,
  policyMatrix?: PolicyMatrixRow[],
): GovernanceInputs {
  const inputs: GovernanceInputs = { policy_matrix: policyMatrix ?? emptyPolicyMatrix() };
  for (const section of GOVERNANCE_SECTIONS) {
    for (const field of section.fields ?? []) {
      if (field.readOnly) continue;
      const raw = form[field.api_field]?.trim();
      if (!raw) continue;
      if (BOOL_FIELDS.has(field.api_field)) {
        const b = parseBoolForm(raw);
        if (b != null) inputs[field.api_field as keyof GovernanceInputs] = b as never;
      } else if (field.input_type === "text_long" || field.input_type === "dropdown") {
        inputs[field.api_field as keyof GovernanceInputs] = raw as never;
      } else if (INT_FIELDS.has(field.api_field)) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) inputs[field.api_field as keyof GovernanceInputs] = n as never;
      } else {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) inputs[field.api_field as keyof GovernanceInputs] = n as never;
      }
    }
  }
  if (form.csr_applicable === "yes") {
    const obligation = inputs.csr_obligation_inr_lakhs;
    const spent = inputs.csr_spent_inr_lakhs;
    if (obligation != null && spent != null) {
      inputs.csr_unspent_inr_lakhs = obligation - spent;
    }
  }
  return inputs;
}
