import {
  calcCacheKey,
  fetchWithCalculatorCache,
  invalidateCalculatorCache,
} from "@/modules/calculators/cache/calculatorCache";
import { apiFetch } from "@/modules/platform/api/client";
import type {
  NzeAutoBaselineResponse,
  NzeClientStatus,
  NzePathwayResponse,
  NzeProgressRequest,
  NzeProgressResponse,
  NzeSourceFiscalYear,
  NzeTargetRequest,
  NzeTargetResponse,
} from "@/modules/net-zero/domain/types";

function toTargetBody(req: NzeTargetRequest): Record<string, unknown> {
  return {
    clientId: req.client_id ?? null,
    name: req.name,
    targetType: req.target_type,
    scope: req.scope,
    baselineYear: req.baseline_year,
    baselineEmissionsTco2e: req.baseline_emissions_tco2e,
    targetYear: req.target_year,
    targetReductionPct: req.target_reduction_pct,
    pathwayType: req.pathway_type,
  };
}

function mapTarget(raw: Record<string, unknown>): NzeTargetResponse {
  const sbti = raw.sbtiValidation as Record<string, boolean> | undefined;
  const gap = raw.gapAnalysis as Record<string, number> | undefined;
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    client_company_name: raw.clientCompanyName as string | undefined,
    name: raw.name as string,
    target_type: raw.targetType as string,
    scope: (raw.scope as string[]) ?? [],
    baseline_year: raw.baselineYear as number,
    baseline_emissions_tco2e: raw.baselineEmissionsTco2e as number,
    target_year: raw.targetYear as number,
    target_reduction_pct: raw.targetReductionPct as number,
    pathway_type: raw.pathwayType as string,
    sbti_aligned: Boolean(raw.sbtiAligned),
    sbti_validation: sbti
      ? {
          baseline_year_check: sbti.baselineYearCheck,
          near_term_reduction_check: sbti.nearTermReductionCheck,
          near_term_timeline_check: sbti.nearTermTimelineCheck,
          long_term_reduction_check: sbti.longTermReductionCheck,
          target_ceiling_check: sbti.targetCeilingCheck,
        }
      : undefined,
    status: raw.status as string,
    gap_analysis: gap
      ? {
          current_year_emissions: gap.currentYearEmissions,
          expected_year_emissions: gap.expectedYearEmissions,
          gap_tco2e: gap.gapTco2e,
          remaining_reduction_needed_pct: gap.remainingReductionNeededPct,
          required_annual_reduction_rate_pct: gap.requiredAnnualReductionRatePct,
          years_to_target: gap.yearsToTarget,
        }
      : undefined,
    created_at: raw.createdAt as string | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}

export async function createNzeTarget(req: NzeTargetRequest): Promise<NzeTargetResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/api/v1/nze/targets", {
    method: "POST",
    body: JSON.stringify(toTargetBody(req)),
  });
  invalidateCalculatorCache("nze");
  return mapTarget(raw);
}

async function fetchNzeTargets(clientId?: string): Promise<NzeTargetResponse[]> {
  const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/v1/nze/targets${q}`);
  return raw.map(mapTarget);
}

export async function listNzeTargets(
  clientId?: string,
  onUpdate?: (targets: NzeTargetResponse[]) => void,
): Promise<NzeTargetResponse[]> {
  const key = calcCacheKey("nze", "targets", clientId);
  return fetchWithCalculatorCache(key, () => fetchNzeTargets(clientId), onUpdate);
}

export async function getNzeTarget(id: string): Promise<NzeTargetResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/v1/nze/targets/${id}`);
  return mapTarget(raw);
}

export async function getNzePathway(id: string): Promise<NzePathwayResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/v1/nze/targets/${id}/pathway`);
  const records = (raw.records as Record<string, unknown>[]) ?? [];
  return {
    pathway_type: raw.pathwayType as string,
    records: records.map((r) => ({
      fiscal_year: r.fiscalYear as string,
      calendar_year: r.calendarYear as number,
      expected_emissions_tco2e: r.expectedEmissionsTco2e as number,
      cumulative_reduction_pct: r.cumulativeReductionPct as number,
    })),
  };
}

export async function recordNzeProgress(
  targetId: string,
  req: NzeProgressRequest,
): Promise<NzeProgressResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/v1/nze/targets/${targetId}/progress`, {
    method: "POST",
    body: JSON.stringify({
      fiscalYear: req.fiscal_year,
      actualEmissionsTco2e: req.actual_emissions_tco2e,
      offsetCreditsTco2e: req.offset_credits_tco2e ?? 0,
      notes: req.notes,
    }),
  });
  invalidateCalculatorCache("nze");
  return {
    id: String(raw.id),
    target_id: String(raw.targetId),
    fiscal_year: raw.fiscalYear as string,
    actual_emissions_tco2e: raw.actualEmissionsTco2e as number,
    offset_credits_tco2e: raw.offsetCreditsTco2e as number | undefined,
    net_emissions_tco2e: raw.netEmissionsTco2e as number,
    expected_emissions_tco2e: raw.expectedEmissionsTco2e as number,
    on_track: Boolean(raw.onTrack),
    notes: raw.notes as string | undefined,
    created_at: raw.createdAt as string | undefined,
  };
}

export async function getNzeProgressHistory(targetId: string): Promise<NzeProgressResponse[]> {
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/v1/nze/targets/${targetId}/progress`);
  return raw.map((r) => ({
    id: String(r.id),
    target_id: String(r.targetId),
    fiscal_year: r.fiscalYear as string,
    actual_emissions_tco2e: r.actualEmissionsTco2e as number,
    offset_credits_tco2e: r.offsetCreditsTco2e as number | undefined,
    net_emissions_tco2e: r.netEmissionsTco2e as number,
    expected_emissions_tco2e: r.expectedEmissionsTco2e as number,
    on_track: Boolean(r.onTrack),
    notes: r.notes as string | undefined,
    created_at: r.createdAt as string | undefined,
  }));
}

export async function listNzeSourceFiscalYears(clientId?: string): Promise<NzeSourceFiscalYear[]> {
  const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/v1/nze/source-fiscal-years${q}`);
  return raw.map((r) => ({
    fiscal_year: String(r.fiscalYear),
    has_isf: Boolean(r.hasIsf),
    has_scope3: Boolean(r.hasScope3),
  }));
}

export async function autoNzeBaseline(params: {
  baselineYear: number;
  fiscalYear: string;
  clientId?: string;
}): Promise<NzeAutoBaselineResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/api/v1/nze/auto-baseline", {
    method: "POST",
    body: JSON.stringify({
      clientId: params.clientId ?? null,
      baselineYear: params.baselineYear,
      fiscalYear: params.fiscalYear,
    }),
  });
  return {
    baseline_emissions_tco2e: raw.baselineEmissionsTco2e as number,
    sources: (raw.sources as Record<string, number>) ?? {},
  };
}

async function fetchNzeClientStatus(): Promise<NzeClientStatus[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/api/v1/nze/clients-status");
  return raw.map((r) => ({
    client_id: String(r.clientId),
    company_name: r.companyName as string,
    has_target: Boolean(r.hasTarget),
    target_id: r.targetId as string | undefined,
    active_targets: (r.activeTargets as number) ?? 0,
  }));
}

export async function getNzeClientStatus(
  onUpdate?: (rows: NzeClientStatus[]) => void,
): Promise<NzeClientStatus[]> {
  const key = calcCacheKey("nze", "clients-status");
  return fetchWithCalculatorCache(key, fetchNzeClientStatus, onUpdate);
}
