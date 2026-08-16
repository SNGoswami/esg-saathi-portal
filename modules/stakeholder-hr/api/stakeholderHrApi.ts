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
import type { StakeholderHrInputs } from "@/modules/stakeholder-hr/domain/types";

const PREFIX = "stakeholder-hr";

export async function saveStakeholderHrReport(
  req: StakeholderHrInputs & { client_id?: string | null; fiscal_year?: string },
) {
  const raw = await apiFetch<Record<string, unknown>>(`/api/stakeholder-hr/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toDisclosureApiBody(req as Record<string, unknown>)),
  });
  invalidateCalculatorCache(PREFIX);
  return mapDisclosureResponse<StakeholderHrInputs>(raw);
}

async function fetchHistory(params?: { clientId?: string; fiscalYear?: string }) {
  const qs = new URLSearchParams();
  if (params?.clientId) qs.set("clientId", params.clientId);
  if (params?.fiscalYear) qs.set("fiscalYear", params.fiscalYear);
  const suffix = qs.toString() ? `?${qs}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/stakeholder-hr/history${suffix}`);
  return raw.map(mapDisclosureHistory);
}

export async function getStakeholderHrHistory(
  params?: { clientId?: string; fiscalYear?: string },
  onUpdate?: (items: DisclosureHistoryItem[]) => void,
): Promise<DisclosureHistoryItem[]> {
  const key = calcCacheKey(PREFIX, "history", params?.fiscalYear, params?.clientId);
  return fetchWithCalculatorCache(key, () => fetchHistory(params), onUpdate);
}

export async function getStakeholderHrClientStatus(fiscalYear: string): Promise<DisclosureClientStatus[]> {
  const qs = new URLSearchParams({ fiscalYear });
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/stakeholder-hr/clients-status?${qs}`);
  return raw.map((row) => ({
    client_id: String(row.clientId),
    company_name: String(row.companyName),
    has_report: Boolean(row.hasReport),
    report_id: row.reportId ? String(row.reportId) : undefined,
  }));
}

export async function getStakeholderHrReportById(id: string) {
  const raw = await apiFetch<Record<string, unknown>>(`/api/stakeholder-hr/reports/${id}`);
  return mapDisclosureResponse<StakeholderHrInputs>(raw);
}

async function fetchRecord(clientId: string, fiscalYear: string) {
  const qs = new URLSearchParams({ clientId, fiscalYear });
  const response = await fetchWithSession(`/api/stakeholder-hr/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const raw = (await response.json()) as Record<string, unknown>;
  return mapDisclosureResponse<StakeholderHrInputs>(raw);
}

async function fetchMsmeRecord(fiscalYear: string) {
  const qs = new URLSearchParams({ fiscalYear });
  const response = await fetchWithSession(`/api/stakeholder-hr/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const raw = (await response.json()) as Record<string, unknown>;
  return mapDisclosureResponse<StakeholderHrInputs>(raw);
}

export async function getStakeholderHrRecord(clientId: string, fiscalYear: string) {
  const key = calcCacheKey(PREFIX, "record", clientId, fiscalYear);
  const cached = readCalculatorCache<ReturnType<typeof mapDisclosureResponse<StakeholderHrInputs>> | null>(key);
  if (cached !== null) {
    void fetchRecord(clientId, fiscalYear).then((fresh) => writeCalculatorCache(key, fresh));
    return cached;
  }
  const fresh = await fetchRecord(clientId, fiscalYear);
  writeCalculatorCache(key, fresh);
  return fresh;
}

export async function getStakeholderHrMsmeRecord(fiscalYear: string) {
  const key = calcCacheKey(PREFIX, "msme-record", fiscalYear);
  return fetchWithCalculatorCache(key, () => fetchMsmeRecord(fiscalYear));
}
