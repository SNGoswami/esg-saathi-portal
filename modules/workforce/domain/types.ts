export type WorkforceInputs = {
  perm_emp_total?: number;
  perm_emp_women?: number;
  contract_emp_total?: number;
  contract_emp_women?: number;
  perm_worker_total?: number;
  perm_worker_women?: number;
  contract_worker_total?: number;
  contract_worker_women?: number;
  board_total?: number;
  board_women?: number;
  diff_abled_emp?: number;
  diff_abled_workers?: number;
  total_wage_bill_inr?: number;
  female_wage_bill_inr?: number;
  median_wage_male_inr?: number;
  median_wage_female_inr?: number;
  min_wage_compliance_emp_pct?: number;
  min_wage_compliance_workers_pct?: number;
  ltifr_employees?: number;
  ltifr_workers?: number;
  fatalities_emp?: number;
  fatalities_workers?: number;
  high_consequence_inj_emp?: number;
  high_consequence_inj_workers?: number;
  training_hrs_emp?: number;
  training_hrs_workers?: number;
  emp_trained_pct?: number;
  workers_trained_pct?: number;
  health_ins_emp_pct?: number;
  health_ins_workers_pct?: number;
  accident_ins_emp_pct?: number;
  accident_ins_workers_pct?: number;
  parental_leave_return_pct?: number;
  pf_gratuity_count?: number;
  wellbeing_spend_pct?: number;
  new_hires_total?: number;
  new_hires_women?: number;
  new_hires_tier23?: number;
  local_sourcing_pct?: number;
  posh_filed?: number;
  posh_resolved?: number;
  posh_pending?: number;
};

export type KpiStatus = "OK" | "NOT_APPLICABLE" | null;

export type WorkforceKpis = {
  kpi_s01?: number | null;
  kpi_s02?: number | null;
  kpi_s03?: number | null;
  kpi_s04?: number | null;
  kpi_s05?: number | null;
  kpi_s05_status?: KpiStatus;
  kpi_s06?: number | null;
  kpi_s07?: number | null;
  kpi_s07_status?: KpiStatus;
  kpi_s08?: number | null;
  kpi_s09?: number | null;
};

export type WorkforceReportResponse = {
  id: string;
  client_id?: string;
  fiscal_year?: string;
  inputs?: WorkforceInputs;
  kpis?: WorkforceKpis;
  brsr_linked?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type WorkforceSaveRequest = WorkforceInputs & {
  client_id?: string | null;
  fiscal_year?: string;
  brsr_assessment_id?: string | null;
};

export type WorkforceHistoryItem = {
  id: string;
  client_id?: string;
  client_company_name?: string;
  fiscal_year?: string;
  kpi_s01?: number;
  kpi_s02?: number;
  kpi_s07?: number;
  updated_at?: string;
};

export type WorkforceClientStatus = {
  client_id: string;
  company_name: string;
  has_report: boolean;
  report_id?: string;
};

export type WorkforceSectionId =
  | "employee-headcount"
  | "worker-headcount"
  | "board-diversity"
  | "wage-data"
  | "safety"
  | "training"
  | "benefits"
  | "new-hires"
  | "posh";
