export type StakeholderHrInputs = {
  stakeholder_groups_count?: number;
  stakeholder_freq_text?: string;
  stakeholder_channels_text?: string;
  board_consultation_process?: string;
  vulnerable_engagement_text?: string;
  materiality_conducted?: boolean;
  material_topics_count?: number;
  materiality_review_freq?: string;
  material_topics_text?: string;
  hr_training_sessions_emp?: number;
  hr_training_coverage_emp_pct?: number;
  hr_training_sessions_workers?: number;
  hr_training_coverage_workers_pct?: number;
  hr_focal_point_exists?: boolean;
  hr_complaint_sexual_harassment?: number;
  hr_complaint_discrimination?: number;
  hr_complaint_child_labour?: number;
  hr_complaint_forced_labour?: number;
  hr_complaint_wages?: number;
  hr_complaint_other?: number;
  grievance_channels_count?: number;
  grievance_channel_details?: string;
  grievances_filed?: number;
  grievances_resolved?: number;
  grievances_pending?: number;
  grievance_avg_resolution_days?: number;
  hr_policy_exists?: boolean;
  child_labour_policy_exists?: boolean;
  forced_labour_policy_exists?: boolean;
  supply_chain_hr_dd?: boolean;
  premises_accessible?: boolean;
  bcp_exists?: boolean;
  indigenous_ops_flag?: boolean;
  vulnerable_populations_text?: string;
  rehabilitation_measures_text?: string;
};

export type StakeholderHrSectionId =
  | "stakeholder-engagement"
  | "materiality"
  | "hr-training"
  | "hr-complaints"
  | "grievances"
  | "hr-policies";
