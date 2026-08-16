export type NzeTargetRequest = {
  client_id?: string | null;
  name: string;
  target_type: "absolute" | "intensity" | "net_zero";
  scope: string[];
  baseline_year: number;
  baseline_emissions_tco2e: number;
  target_year: number;
  target_reduction_pct: number;
  pathway_type: "linear" | "front_loaded" | "back_loaded";
};

export type SbtiValidation = {
  baseline_year_check: boolean;
  near_term_reduction_check: boolean;
  near_term_timeline_check: boolean;
  long_term_reduction_check: boolean;
  target_ceiling_check: boolean;
};

export type GapAnalysis = {
  current_year_emissions?: number;
  expected_year_emissions?: number;
  gap_tco2e?: number;
  remaining_reduction_needed_pct?: number;
  required_annual_reduction_rate_pct?: number;
  years_to_target?: number;
};

export type NzeTargetResponse = {
  id: string;
  client_id?: string;
  client_company_name?: string;
  name: string;
  target_type: string;
  scope: string[];
  baseline_year: number;
  baseline_emissions_tco2e: number;
  target_year: number;
  target_reduction_pct: number;
  pathway_type: string;
  sbti_aligned: boolean;
  sbti_validation?: SbtiValidation;
  status: string;
  gap_analysis?: GapAnalysis;
  created_at?: string;
  updated_at?: string;
};

export type NzePathwayResponse = {
  pathway_type: string;
  records: Array<{
    fiscal_year: string;
    calendar_year: number;
    expected_emissions_tco2e: number;
    cumulative_reduction_pct: number;
  }>;
};

export type NzeProgressRequest = {
  fiscal_year: string;
  actual_emissions_tco2e: number;
  offset_credits_tco2e?: number;
  notes?: string;
};

export type NzeProgressResponse = {
  id: string;
  target_id: string;
  fiscal_year: string;
  actual_emissions_tco2e: number;
  offset_credits_tco2e?: number;
  net_emissions_tco2e: number;
  expected_emissions_tco2e: number;
  on_track: boolean;
  notes?: string;
  created_at?: string;
};

export type NzeAutoBaselineResponse = {
  baseline_emissions_tco2e: number;
  sources: Record<string, number>;
};

export type NzeSourceFiscalYear = {
  fiscal_year: string;
  has_isf: boolean;
  has_scope3: boolean;
};

export type NzeClientStatus = {
  client_id: string;
  company_name: string;
  has_target: boolean;
  target_id?: string;
  active_targets: number;
};
