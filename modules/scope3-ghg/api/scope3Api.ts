import {
  calcCacheKey,
  fetchWithCalculatorCache,
  hasCalculatorCache,
  invalidateCalculatorCacheExcept,
  readCalculatorCache,
  writeCalculatorCache,
} from "@/modules/calculators/cache/calculatorCache";
import { apiFetch } from "@/modules/platform/api/client";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";
import type {
  Scope3CalculateRequest,
  Scope3CalculationResponse,
  Scope3CategoryFactor,
  Scope3ClientStatus,
  Scope3HistoryItem,
  Scope3SummaryResponse,
} from "@/modules/scope3-ghg/domain/types";

function toApiBody(req: Scope3CalculateRequest): Record<string, unknown> {
  return {
    clientId: req.client_id ?? null,
    fiscalYear: req.fiscal_year,
    categoryNumber: req.category_number,
    method: req.method,
    material: req.material ?? false,
    spendInr: req.spend_inr,
    activityInputs: req.activity_inputs,
    brsrAssessmentId: req.brsr_assessment_id ?? null,
  };
}

function mapCalc(raw: Record<string, unknown>): Scope3CalculationResponse {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    category_number: raw.categoryNumber as number,
    category_name: raw.categoryName as string,
    method: raw.method as Scope3CalculationResponse["method"],
    material: Boolean(raw.material),
    spend_inr: raw.spendInr as number | undefined,
    eeio_factor: raw.eeioFactor as number | undefined,
    activity_inputs: raw.activityInputs as Record<string, unknown> | undefined,
    emissions_tco2e: raw.emissionsTco2e as number,
    calculation_details: raw.calculationDetails as Record<string, unknown> | undefined,
    brsr_auto_populated: raw.brsrAutoPopulated as boolean | undefined,
    created_at: raw.createdAt as string | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}

function mapSummary(raw: Record<string, unknown>): Scope3SummaryResponse {
  const cats = (raw.categories as Record<string, unknown>[] | undefined) ?? [];
  return {
    client_id: raw.clientId as string | undefined,
    client_company_name: raw.clientCompanyName as string | undefined,
    fiscal_year: String(raw.fiscalYear),
    total_scope3_tco2e: raw.totalScope3Tco2e as number,
    material_categories: (raw.materialCategories as number[]) ?? [],
    categories: cats.map((c) => ({
      number: c.number as number,
      name: c.name as string,
      method_used: c.methodUsed as string | null | undefined,
      emissions_tco2e: c.emissionsTco2e as number | null | undefined,
      material: Boolean(c.material),
      calculation_id: c.calculationId as string | null | undefined,
    })),
    report_id: raw.reportId as string | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}

const SCOPE3_FACTORS_STORAGE_KEY = "scope3_factors_v1";

function readScope3FactorsStorage(): Scope3CategoryFactor[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SCOPE3_FACTORS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Scope3CategoryFactor[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeScope3FactorsStorage(factors: Scope3CategoryFactor[]): void {
  try {
    localStorage.setItem(SCOPE3_FACTORS_STORAGE_KEY, JSON.stringify(factors));
  } catch {
    /* quota */
  }
}

async function fetchScope3Factors(): Promise<Scope3CategoryFactor[]> {
  const raw = await apiFetch<{ categories: Record<string, unknown>[] }>("/api/scope3/factors");
  return (raw.categories ?? []).map((c) => ({
    number: c.number as number,
    name: c.name as string,
    methods: c.methods as Scope3CategoryFactor["methods"],
    spend_factor_kgco2e_per_inr: c.spendFactorKgco2ePerInr as number | undefined,
    activity_inputs: c.activityInputs as Scope3CategoryFactor["activity_inputs"],
  }));
}

export async function getScope3Factors(
  onUpdate?: (factors: Scope3CategoryFactor[]) => void,
): Promise<Scope3CategoryFactor[]> {
  const key = calcCacheKey("scope3", "factors");
  const sessionCached = hasCalculatorCache(key) ? readCalculatorCache<Scope3CategoryFactor[]>(key) : null;
  const stored = readScope3FactorsStorage();
  const immediate = sessionCached?.length ? sessionCached : stored;

  if (immediate?.length) {
    void fetchScope3Factors()
      .then((fresh) => {
        writeCalculatorCache(key, fresh);
        writeScope3FactorsStorage(fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {});
    return immediate;
  }

  const fresh = await fetchScope3Factors();
  writeCalculatorCache(key, fresh);
  writeScope3FactorsStorage(fresh);
  onUpdate?.(fresh);
  return fresh;
}

export async function calculateScope3(req: Scope3CalculateRequest): Promise<Scope3CalculationResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/api/scope3/calculate", {
    method: "POST",
    body: JSON.stringify(toApiBody(req)),
  });
  invalidateCalculatorCacheExcept("scope3", ["factors"]);
  return mapCalc(raw);
}

async function fetchScope3Summary(fiscalYear: string, clientId?: string): Promise<Scope3SummaryResponse> {
  const params = new URLSearchParams({ fiscalYear });
  if (clientId) params.set("clientId", clientId);
  const raw = await apiFetch<Record<string, unknown>>(`/api/scope3/summary?${params}`);
  return mapSummary(raw);
}

export async function getScope3Summary(
  fiscalYear: string,
  clientId?: string,
  onUpdate?: (summary: Scope3SummaryResponse) => void,
): Promise<Scope3SummaryResponse> {
  const key = calcCacheKey("scope3", "summary", fiscalYear, clientId);
  return fetchWithCalculatorCache(key, () => fetchScope3Summary(fiscalYear, clientId), onUpdate);
}

async function fetchScope3Record(
  clientId: string,
  fiscalYear: string,
): Promise<Scope3SummaryResponse | null> {
  const params = new URLSearchParams({ clientId, fiscalYear });
  const res = await fetchWithSession(`/api/scope3/record?${params}`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error("Failed to load Scope 3 record");
  return mapSummary((await res.json()) as Record<string, unknown>);
}

export async function getScope3Record(
  clientId: string,
  fiscalYear: string,
  onUpdate?: (summary: Scope3SummaryResponse | null) => void,
): Promise<Scope3SummaryResponse | null> {
  const key = calcCacheKey("scope3", "record", clientId, fiscalYear);
  if (hasCalculatorCache(key)) {
    const cached = readCalculatorCache<Scope3SummaryResponse | null>(key);
    void fetchScope3Record(clientId, fiscalYear)
      .then((fresh) => {
        writeCalculatorCache(key, fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {});
    return cached;
  }
  const fresh = await fetchScope3Record(clientId, fiscalYear);
  writeCalculatorCache(key, fresh);
  onUpdate?.(fresh);
  return fresh;
}

async function fetchScope3History(clientId?: string, fiscalYear?: string): Promise<Scope3HistoryItem[]> {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (fiscalYear) params.set("fiscalYear", fiscalYear);
  const q = params.toString();
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/scope3/history${q ? `?${q}` : ""}`);
  return raw.map((r) => ({
    id: String(r.id),
    client_id: r.clientId as string | undefined,
    client_company_name: r.clientCompanyName as string | undefined,
    fiscal_year: r.fiscalYear as string | undefined,
    total_scope3_tco2e: r.totalScope3Tco2e as number | undefined,
    categories_completed: r.categoriesCompleted as number | undefined,
    updated_at: r.updatedAt as string | undefined,
  }));
}

export async function getScope3History(
  clientId?: string,
  fiscalYear?: string,
  onUpdate?: (items: Scope3HistoryItem[]) => void,
): Promise<Scope3HistoryItem[]> {
  const key = calcCacheKey("scope3", "history", fiscalYear, clientId);
  return fetchWithCalculatorCache(key, () => fetchScope3History(clientId, fiscalYear), onUpdate);
}

async function fetchScope3ClientStatus(fiscalYear: string): Promise<Scope3ClientStatus[]> {
  const raw = await apiFetch<Record<string, unknown>[]>(
    `/api/scope3/clients-status?fiscalYear=${encodeURIComponent(fiscalYear)}`,
  );
  return raw.map((r) => ({
    client_id: String(r.clientId),
    company_name: r.companyName as string,
    has_calculations: Boolean(r.hasCalculations),
    categories_completed: (r.categoriesCompleted as number) ?? 0,
    report_id: r.reportId as string | undefined,
  }));
}

export async function getScope3ClientStatus(
  fiscalYear: string,
  onUpdate?: (rows: Scope3ClientStatus[]) => void,
): Promise<Scope3ClientStatus[]> {
  const key = calcCacheKey("scope3", "clients-status", fiscalYear);
  return fetchWithCalculatorCache(key, () => fetchScope3ClientStatus(fiscalYear), onUpdate);
}

async function fetchScope3ById(id: string): Promise<Scope3CalculationResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/scope3/calculations/${id}`);
  return mapCalc(raw);
}

export async function getScope3ById(
  id: string,
  onUpdate?: (calc: Scope3CalculationResponse) => void,
): Promise<Scope3CalculationResponse> {
  const key = calcCacheKey("scope3", "calc", id);
  return fetchWithCalculatorCache(key, () => fetchScope3ById(id), onUpdate);
}

/** Loads full report summary for a saved calculation (cached by fiscal year + client). */
export async function getScope3ReportByCalculationId(
  calculationId: string,
  onUpdate?: (summary: Scope3SummaryResponse) => void,
): Promise<Scope3SummaryResponse> {
  const calc = await getScope3ById(calculationId);
  return getScope3Summary(calc.fiscal_year ?? "", calc.client_id, onUpdate);
}
