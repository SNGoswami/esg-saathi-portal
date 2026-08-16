import type { BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import type { Client } from "@/modules/clients/api/clientsApi";

const CACHE_KEY = "brsr_assessments_v1";

export type AssessmentsCacheEntry = {
  clients: Client[];
  assessments: BrsrAssessment[];
};

export function readAssessmentsCache(): AssessmentsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AssessmentsCacheEntry) : null;
  } catch {
    return null;
  }
}

export function writeAssessmentsCache(data: AssessmentsCacheEntry) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateAssessmentsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
