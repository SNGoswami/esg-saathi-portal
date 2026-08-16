import type { PolicyMatrixRow } from "@/modules/calculators/domain/disclosureTypes";

export type GovernanceInputs = {
  policy_matrix?: PolicyMatrixRow[];
  esg_committee_exists?: boolean;
  esg_committee_freq?: string;
  esg_committee_independent?: number;
  esg_committee_composition?: string;
  anti_corruption_policy?: boolean;
  anti_corruption_training_hrs?: number;
  disciplinary_actions_corruption?: number;
  conflict_interest_filed?: number;
  conflict_interest_pending?: number;
  whistleblower_filed?: number;
  whistleblower_resolved?: number;
  fines_paid_inr_lakhs?: number;
  trade_assoc_count?: number;
  trade_assoc_advocacy?: boolean;
  trade_assoc_top10_text?: string;
  csr_applicable?: boolean;
  csr_obligation_inr_lakhs?: number;
  csr_spent_inr_lakhs?: number;
  csr_unspent_inr_lakhs?: number;
  csr_persons_benefited?: number;
  csr_impact_assessment?: boolean;
  board_size_total?: number;
  board_independent?: number;
  board_women?: number;
  board_esg_expertise?: boolean;
};

export type GovernanceKpis = {
  kpi_g01?: string | null;
  kpi_g02?: string | null;
  kpi_g03?: string | null;
  kpi_g04?: number | null;
  kpi_g04_status?: string | null;
  kpi_g05?: number | null;
  kpi_g05_status?: string | null;
  kpi_g06?: number | null;
  kpi_g06_status?: string | null;
  kpi_g07?: number | null;
  kpi_g07_status?: string | null;
  kpi_g08?: number | null;
  kpi_g08_status?: string | null;
};

export type GovernanceSectionId =
  | "policy-matrix"
  | "esg-committee"
  | "anti-corruption"
  | "trade-associations"
  | "csr"
  | "board-structure";

export const BRSR_PRINCIPLES = [
  { id: "P1", label: "Ethics, transparency & accountability" },
  { id: "P2", label: "Products & services sustainability" },
  { id: "P3", label: "Employee wellbeing" },
  { id: "P4", label: "Stakeholder engagement" },
  { id: "P5", label: "Human rights" },
  { id: "P6", label: "Environment" },
  { id: "P7", label: "Public & regulatory policy" },
  { id: "P8", label: "Inclusive growth" },
  { id: "P9", label: "Customer value" },
] as const;

export function emptyPolicyMatrix(): PolicyMatrixRow[] {
  return BRSR_PRINCIPLES.map((p) => ({ principle: p.id }));
}
