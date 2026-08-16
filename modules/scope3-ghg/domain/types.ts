export type Scope3Method = "spend_based" | "activity_based";

export type Scope3CalculateRequest = {
  client_id?: string | null;
  fiscal_year: string;
  category_number: number;
  method: Scope3Method;
  material?: boolean;
  spend_inr?: number;
  activity_inputs?: Record<string, number | string>;
  brsr_assessment_id?: string | null;
};

export type Scope3CalculationResponse = {
  id: string;
  client_id?: string;
  fiscal_year?: string;
  category_number: number;
  category_name: string;
  method: Scope3Method;
  material: boolean;
  spend_inr?: number;
  eeio_factor?: number;
  activity_inputs?: Record<string, unknown>;
  emissions_tco2e: number;
  calculation_details?: Record<string, unknown>;
  brsr_auto_populated?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Scope3CategoryFactor = {
  number: number;
  name: string;
  methods: Scope3Method[];
  spend_factor_kgco2e_per_inr?: number;
  activity_inputs?: Array<{
    field: string;
    type: string;
    required?: boolean;
    unit?: string;
    default?: string;
  }>;
};

export type Scope3CategorySummary = {
  number: number;
  name: string;
  method_used?: string | null;
  emissions_tco2e?: number | null;
  material: boolean;
  calculation_id?: string | null;
};

export type Scope3SummaryResponse = {
  client_id?: string;
  client_company_name?: string;
  fiscal_year: string;
  total_scope3_tco2e: number;
  material_categories: number[];
  categories: Scope3CategorySummary[];
  report_id?: string;
  updated_at?: string;
};

export type Scope3HistoryItem = {
  id: string;
  client_id?: string;
  client_company_name?: string;
  fiscal_year?: string;
  total_scope3_tco2e?: number;
  categories_completed?: number;
  updated_at?: string;
};

export type Scope3ClientStatus = {
  client_id: string;
  company_name: string;
  has_calculations: boolean;
  categories_completed: number;
  report_id?: string;
};
