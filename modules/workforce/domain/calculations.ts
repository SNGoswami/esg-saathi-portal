import type { WorkforceInputs, WorkforceKpis, KpiStatus } from "@/modules/workforce/domain/types";

function pct(numerator?: number, denominator?: number): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function ratio(numerator?: number, denominator?: number): { value: number | null; status: KpiStatus } {
  if (numerator == null || denominator == null) return { value: null, status: null };
  if (denominator === 0) return { value: null, status: "NOT_APPLICABLE" };
  return { value: numerator / denominator, status: "OK" };
}

/** Client-side KPI preview — server recomputes on save. */
export function computeWorkforceKpis(inputs: WorkforceInputs): WorkforceKpis {
  const wageGap = ratio(inputs.median_wage_male_inr, inputs.median_wage_female_inr);
  const posh = ratio(inputs.posh_resolved, inputs.posh_filed);
  const poshPct = posh.status === "OK" && posh.value != null ? posh.value * 100 : null;

  return {
    kpi_s01: pct(inputs.board_women, inputs.board_total),
    kpi_s02: pct(inputs.perm_emp_women, inputs.perm_emp_total),
    kpi_s03: pct(inputs.perm_worker_women, inputs.perm_worker_total),
    kpi_s04: pct(inputs.female_wage_bill_inr, inputs.total_wage_bill_inr),
    kpi_s05: wageGap.value,
    kpi_s05_status: wageGap.status,
    kpi_s06:
      inputs.training_hrs_emp != null && inputs.perm_emp_total
        ? inputs.training_hrs_emp / inputs.perm_emp_total
        : null,
    kpi_s07: poshPct,
    kpi_s07_status: posh.status === "OK" ? "OK" : posh.status,
    kpi_s08: pct(inputs.new_hires_tier23, inputs.new_hires_total),
    kpi_s09: pct(inputs.new_hires_women, inputs.new_hires_total),
  };
}
