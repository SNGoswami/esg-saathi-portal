export type FieldInputType =
  | "number"
  | "number_decimal"
  | "percent"
  | "text_long"
  | "text_url"
  | "boolean_dropdown"
  | "dropdown";

export type DisclosureFieldDef = {
  field_id: string;
  field_name: string;
  unit: string;
  input_type: FieldInputType;
  brsr_ref: string;
  api_field: string;
  step?: string;
  integer?: boolean;
  defaultValue?: string | number;
  maxField?: string;
  readOnly?: boolean;
  hint?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  visibleWhen?: { field: string; equals: string };
};

export type DisclosureSectionDef = {
  id: string;
  title: string;
  /** Shorter label for mobile section tabs */
  shortTitle?: string;
  subtitle?: string;
  fields?: DisclosureFieldDef[];
  variant?: "policy_matrix";
};

export type PolicyMatrixRow = {
  principle: string;
  policy_exists?: boolean;
  board_approved?: boolean;
  committee_oversight?: boolean;
  written_procedures?: boolean;
  grievance_mechanism?: boolean;
  web_url?: string;
};

export type DisclosureHistoryItem = {
  id: string;
  client_id?: string;
  client_company_name?: string;
  fiscal_year?: string;
  updated_at?: string;
};

export type DisclosureClientStatus = {
  client_id: string;
  company_name: string;
  has_report: boolean;
  report_id?: string;
};

export type DisclosureReportResponse<TInputs = Record<string, unknown>> = {
  id: string;
  client_id?: string;
  fiscal_year?: string;
  inputs?: TInputs;
  kpis?: Record<string, unknown>;
  brsr_linked?: boolean;
  created_at?: string;
  updated_at?: string;
};
