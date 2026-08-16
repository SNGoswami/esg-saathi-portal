import type { LighthouseAssessmentSummary } from "@/modules/lighthouse/api/lighthouseApi";
import type { Client } from "@/modules/clients/api/clientsApi";

const CACHE_KEY = "lighthouse_assessments_v1";

export type LighthouseAssessmentsCacheEntry = {
  clients: Client[];
  assessments: LighthouseAssessmentSummary[];
};

export function readLighthouseAssessmentsCache(): LighthouseAssessmentsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LighthouseAssessmentsCacheEntry) : null;
  } catch {
    return null;
  }
}

export function writeLighthouseAssessmentsCache(data: LighthouseAssessmentsCacheEntry) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateLighthouseAssessmentsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
