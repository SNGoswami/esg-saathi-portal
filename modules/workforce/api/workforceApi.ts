import {
  calcCacheKey,
  fetchWithCalculatorCache,
  invalidateCalculatorCache,
  readCalculatorCache,
  writeCalculatorCache,
} from "@/modules/calculators/cache/calculatorCache";
import { apiFetch } from "@/modules/platform/api/client";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";
import type {
  WorkforceClientStatus,
  WorkforceHistoryItem,
  WorkforceInputs,
  WorkforceKpis,
  WorkforceReportResponse,
  WorkforceSaveRequest,
} from "@/modules/workforce/domain/types";

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toApiBody(req: WorkforceSaveRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    clientId: req.client_id ?? null,
    fiscalYear: req.fiscal_year,
    brsrAssessmentId: req.brsr_assessment_id ?? null,
  };
  for (const [key, value] of Object.entries(req)) {
    if (key === "client_id" || key === "fiscal_year" || key === "brsr_assessment_id") continue;
    if (value == null) continue;
    body[snakeToCamel(key)] = value;
  }
  return body;
}

function mapInputs(raw: Record<string, unknown> | undefined): WorkforceInputs | undefined {
  if (!raw) return undefined;
  const inputs: WorkforceInputs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    const snake = camelToSnake(key);
    (inputs as Record<string, number>)[snake] = Number(value);
  }
  return inputs;
}

function mapKpis(raw: Record<string, unknown> | undefined): WorkforceKpis | undefined {
  if (!raw) return undefined;
  return {
    kpi_s01: raw.kpiS01 as number | undefined,
    kpi_s02: raw.kpiS02 as number | undefined,
    kpi_s03: raw.kpiS03 as number | undefined,
    kpi_s04: raw.kpiS04 as number | undefined,
    kpi_s05: raw.kpiS05 as number | undefined,
    kpi_s05_status: raw.kpiS05Status as WorkforceKpis["kpi_s05_status"],
    kpi_s06: raw.kpiS06 as number | undefined,
    kpi_s07: raw.kpiS07 as number | undefined,
    kpi_s07_status: raw.kpiS07Status as WorkforceKpis["kpi_s07_status"],
    kpi_s08: raw.kpiS08 as number | undefined,
    kpi_s09: raw.kpiS09 as number | undefined,
  };
}

function mapResponse(raw: Record<string, unknown>): WorkforceReportResponse {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    inputs: mapInputs(raw.inputs as Record<string, unknown> | undefined),
    kpis: mapKpis(raw.kpis as Record<string, unknown> | undefined),
    brsr_linked: Boolean(raw.brsrLinked),
    created_at: raw.createdAt as string | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}

function mapHistoryItem(raw: Record<string, unknown>): WorkforceHistoryItem {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    client_company_name: raw.clientCompanyName as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    kpi_s01: raw.kpiS01 as number | undefined,
    kpi_s02: raw.kpiS02 as number | undefined,
    kpi_s07: raw.kpiS07 as number | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}

export async function saveWorkforceReport(req: WorkforceSaveRequest): Promise<WorkforceReportResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/api/workforce/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiBody(req)),
  });
  invalidateCalculatorCache("workforce");
  return mapResponse(raw);
}

async function fetchWorkforceHistory(params?: {
  clientId?: string;
  fiscalYear?: string;
}): Promise<WorkforceHistoryItem[]> {
  const qs = new URLSearchParams();
  if (params?.clientId) qs.set("clientId", params.clientId);
  if (params?.fiscalYear) qs.set("fiscalYear", params.fiscalYear);
  const suffix = qs.toString() ? `?${qs}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/workforce/history${suffix}`, {
    method: "GET",
  });
  return raw.map(mapHistoryItem);
}

export async function getWorkforceHistory(
  params?: { clientId?: string; fiscalYear?: string },
  onUpdate?: (items: WorkforceHistoryItem[]) => void,
): Promise<WorkforceHistoryItem[]> {
  const key = calcCacheKey("workforce", "history", params?.fiscalYear, params?.clientId);
  return fetchWithCalculatorCache(key, () => fetchWorkforceHistory(params), onUpdate);
}

async function fetchWorkforceClientStatus(fiscalYear: string): Promise<WorkforceClientStatus[]> {
  const qs = new URLSearchParams({ fiscalYear });
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/workforce/clients-status?${qs}`, {
    method: "GET",
  });
  return raw.map((row) => ({
    client_id: String(row.clientId),
    company_name: String(row.companyName),
    has_report: Boolean(row.hasReport),
    report_id: row.reportId ? String(row.reportId) : undefined,
  }));
}

export async function getWorkforceClientStatus(
  fiscalYear: string,
  onUpdate?: (rows: WorkforceClientStatus[]) => void,
): Promise<WorkforceClientStatus[]> {
  const key = calcCacheKey("workforce", "clients-status", fiscalYear);
  return fetchWithCalculatorCache(key, () => fetchWorkforceClientStatus(fiscalYear), onUpdate);
}

export async function getWorkforceReportById(id: string): Promise<WorkforceReportResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/workforce/reports/${id}`, {
    method: "GET",
  });
  return mapResponse(raw);
}

async function fetchWorkforceRecord(
  clientId: string,
  fiscalYear: string,
): Promise<WorkforceReportResponse | null> {
  const qs = new URLSearchParams({ clientId, fiscalYear });
  const response = await fetchWithSession(`/api/workforce/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed (${response.status})`;
    try {
      const data = JSON.parse(text) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  return mapResponse(raw);
}

export async function getWorkforceRecord(
  clientId: string,
  fiscalYear: string,
  onUpdate?: (record: WorkforceReportResponse | null) => void,
): Promise<WorkforceReportResponse | null> {
  const key = calcCacheKey("workforce", "record", clientId, fiscalYear);
  const cached = readCalculatorCache<WorkforceReportResponse | null>(key);
  if (cached !== null) {
    void fetchWorkforceRecord(clientId, fiscalYear)
      .then((fresh) => {
        writeCalculatorCache(key, fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {});
    return cached;
  }
  const fresh = await fetchWorkforceRecord(clientId, fiscalYear);
  writeCalculatorCache(key, fresh);
  return fresh;
}
