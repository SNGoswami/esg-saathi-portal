import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";

function storageKey(clientId?: string | null) {
  return clientId ? `lighthouse_assessment_v1_${clientId}` : "lighthouse_assessment_v1";
}

export type LighthouseAssessmentRecord = {
  status: "draft" | "completed";
  answers: Record<string, number>;
  sector?: string;
  completedAt?: string;
  scores?: LighthouseScoreResult;
};

export function readLighthouseAssessment(clientId?: string | null): LighthouseAssessmentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(clientId));
    return raw ? (JSON.parse(raw) as LighthouseAssessmentRecord) : null;
  } catch {
    return null;
  }
}

export function writeLighthouseAssessment(data: LighthouseAssessmentRecord, clientId?: string | null) {
  try {
    sessionStorage.setItem(storageKey(clientId), JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function isLighthouseAssessmentLocked(clientId?: string | null): boolean {
  const record = readLighthouseAssessment(clientId);
  return record?.status === "completed";
}

export function clearLighthouseAssessment(clientId?: string | null) {
  try {
    sessionStorage.removeItem(storageKey(clientId));
  } catch {
    /* ignore */
  }
}

/** Sector from cached MSME profile (no API). */
export function readMsmeSectorFromProfileCache(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem("profile_data_MSME");
    if (!raw) return undefined;
    const profile = JSON.parse(raw) as { sector?: string };
    return profile.sector?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function readMsmeCompanyFromProfileCache(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem("profile_data_MSME");
    if (!raw) return undefined;
    const profile = JSON.parse(raw) as { companyName?: string };
    return profile.companyName?.trim() || undefined;
  } catch {
    return undefined;
  }
}
