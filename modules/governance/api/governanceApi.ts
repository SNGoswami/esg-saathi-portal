import {
  calcCacheKey,
  fetchWithCalculatorCache,
  invalidateCalculatorCache,
  readCalculatorCache,
  writeCalculatorCache,
} from "@/modules/calculators/cache/calculatorCache";
import {
  mapDisclosureHistory,
  mapDisclosureResponse,
  toDisclosureApiBody,
} from "@/modules/calculators/domain/disclosureApiMappers";
import type { DisclosureClientStatus, DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import { apiFetch } from "@/modules/platform/api/client";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";
import type { GovernanceInputs } from "@/modules/governance/domain/types";

const PREFIX = "governance";

export async function saveGovernanceReport(
  req: GovernanceInputs & { client_id?: string | null; fiscal_year?: string },
) {
  const raw = await apiFetch<Record<string, unknown>>(`/api/governance/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toDisclosureApiBody(req as Record<string, unknown>)),
  });
  invalidateCalculatorCache(PREFIX);
  return mapDisclosureResponse<GovernanceInputs>(raw);
}

async function fetchHistory(params?: { clientId?: string; fiscalYear?: string }) {
  const qs = new URLSearchParams();
  if (params?.clientId) qs.set("clientId", params.clientId);
  if (params?.fiscalYear) qs.set("fiscalYear", params.fiscalYear);
  const suffix = qs.toString() ? `?${qs}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/governance/history${suffix}`);
  return raw.map(mapDisclosureHistory);
}

export async function getGovernanceHistory(
  params?: { clientId?: string; fiscalYear?: string },
  onUpdate?: (items: DisclosureHistoryItem[]) => void,
): Promise<DisclosureHistoryItem[]> {
  const key = calcCacheKey(PREFIX, "history", params?.fiscalYear, params?.clientId);
  return fetchWithCalculatorCache(key, () => fetchHistory(params), onUpdate);
}

export async function getGovernanceClientStatus(fiscalYear: string): Promise<DisclosureClientStatus[]> {
  const qs = new URLSearchParams({ fiscalYear });
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/governance/clients-status?${qs}`);
  return raw.map((row) => ({
    client_id: String(row.clientId),
    company_name: String(row.companyName),
    has_report: Boolean(row.hasReport),
    report_id: row.reportId ? String(row.reportId) : undefined,
  }));
}

export async function getGovernanceReportById(id: string) {
  const raw = await apiFetch<Record<string, unknown>>(`/api/governance/reports/${id}`);
  return mapDisclosureResponse<GovernanceInputs>(raw);
}

async function fetchRecord(clientId: string, fiscalYear: string) {
  const qs = new URLSearchParams({ clientId, fiscalYear });
  const response = await fetchWithSession(`/api/governance/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const raw = (await response.json()) as Record<string, unknown>;
  return mapDisclosureResponse<GovernanceInputs>(raw);
}

async function fetchMsmeRecord(fiscalYear: string) {
  const qs = new URLSearchParams({ fiscalYear });
  const response = await fetchWithSession(`/api/governance/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const raw = (await response.json()) as Record<string, unknown>;
  return mapDisclosureResponse<GovernanceInputs>(raw);
}

export async function getGovernanceRecord(clientId: string, fiscalYear: string) {
  const key = calcCacheKey(PREFIX, "record", clientId, fiscalYear);
  const cached = readCalculatorCache<ReturnType<typeof mapDisclosureResponse<GovernanceInputs>> | null>(key);
  if (cached !== null) {
    void fetchRecord(clientId, fiscalYear).then((fresh) => writeCalculatorCache(key, fresh));
    return cached;
  }
  const fresh = await fetchRecord(clientId, fiscalYear);
  writeCalculatorCache(key, fresh);
  return fresh;
}

export async function getGovernanceMsmeRecord(fiscalYear: string) {
  const key = calcCacheKey(PREFIX, "msme-record", fiscalYear);
  return fetchWithCalculatorCache(key, () => fetchMsmeRecord(fiscalYear));
}
