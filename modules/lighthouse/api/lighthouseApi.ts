import { apiFetch } from "@/modules/platform/api/client";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";
import { writeLighthouseReportCache } from "@/modules/lighthouse/domain/reportCache";
import type { PillarId } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult, ReadinessLevel } from "@/modules/lighthouse/domain/scoring";

export type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type LighthousePillarReport = {
  pillar?: string;
  pillarLabel?: string;
  pillarScore?: number;
  weight?: number;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  kpiBreakdown?: Array<{
    kpiId?: string;
    kpiLabel?: string;
    score?: number;
    q1?: number;
    q2?: number;
    insight?: string;
  }>;
};

export type LighthouseStrengthReport = {
  totalScore?: number;
  readiness?: string;
  overallSummary?: string;
  pillarScores?: Record<string, number>;
  weights?: { e?: number; s?: number; g?: number };
  kpiScores?: Array<{
    kpiId?: string;
    kpiLabel?: string;
    pillar?: string;
    score?: number;
    q1?: number;
    q2?: number;
  }>;
  strengths?: Array<{ title?: string; detail?: string; pillar?: string } | string>;
};

export type LighthouseImprovementReport = {
  overallSummary?: string;
  improvements?: Array<{
    title?: string;
    detail?: string;
    priority?: string;
    pillar?: string;
  }>;
};

export type LighthouseAssessmentApi = {
  id: string;
  clientId?: string | null;
  clientCompanyName?: string | null;
  totalScore?: number | null;
  readiness?: string | null;
  createdAt: string;
  updatedAt?: string;
  env: LighthousePillarReport;
  social: LighthousePillarReport;
  gov: LighthousePillarReport;
  esgStrength: LighthouseStrengthReport;
  esgScopeOfImprovement: LighthouseImprovementReport;
};

export type LighthouseAssessmentSummary = {
  id: string;
  clientId: string | null;
  clientCompanyName: string | null;
  totalScore: number | null;
  readiness: string | null;
  createdAt: string;
  updatedAt?: string;
};

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeAssessment(raw: Record<string, unknown>): LighthouseAssessmentApi {
  return {
    id: String(raw.id),
    clientId: raw.clientId != null ? String(raw.clientId) : null,
    clientCompanyName: raw.clientCompanyName != null ? String(raw.clientCompanyName) : null,
    totalScore: num(raw.totalScore),
    readiness: raw.readiness != null ? String(raw.readiness) : null,
    createdAt: String(raw.createdAt),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    env: (raw.env as LighthousePillarReport) ?? {},
    social: (raw.social as LighthousePillarReport) ?? {},
    gov: (raw.gov as LighthousePillarReport) ?? {},
    esgStrength: (raw.esgStrength as LighthouseStrengthReport) ?? {},
    esgScopeOfImprovement: (raw.esgScopeOfImprovement as LighthouseImprovementReport) ?? {},
  };
}

function toSummary(assessment: LighthouseAssessmentApi): LighthouseAssessmentSummary {
  return {
    id: assessment.id,
    clientId: assessment.clientId ?? null,
    clientCompanyName: assessment.clientCompanyName ?? null,
    totalScore: assessment.totalScore ?? assessment.esgStrength?.totalScore ?? null,
    readiness: assessment.readiness ?? assessment.esgStrength?.readiness ?? null,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

async function fetchLighthouse(
  path: string,
  allowEmpty = true,
): Promise<LighthouseAssessmentApi | null> {
  const response = await fetchWithSession(path, { method: "GET" }, true, false);

  if (response.status === 204 || response.status === 404) {
    return null;
  }
  if (response.status === 403 && allowEmpty) {
    return null;
  }
  if (!response.ok) {
    let message = "Could not load Lighthouse assessment";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  return normalizeAssessment(raw);
}

export function listLighthouseAssessments() {
  return apiFetch<Record<string, unknown>[]>("/api/lighthouse", { method: "GET" }).then((rows) =>
    rows.map((row) => toSummary(normalizeAssessment(row))),
  );
}

export async function getMyLighthouseAssessment(): Promise<LighthouseAssessmentApi | null> {
  return fetchLighthouse("/api/lighthouse/me");
}

export async function getLighthouseForClient(clientId: string): Promise<LighthouseAssessmentApi | null> {
  return fetchLighthouse(`/api/lighthouse/client/${clientId}`);
}

export async function submitLighthouseAssessment(payload: {
  clientId?: string;
  answers: Record<string, number>;
  sector?: string;
}): Promise<LighthouseAssessmentApi> {
  const result = await apiFetch<Record<string, unknown>>("/api/lighthouse/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const normalized = normalizeAssessment(result);
  writeLighthouseReportCache(normalized, payload.clientId ?? null);
  return normalized;
}

/**
 * Loads the latest Lighthouse report for export.
 */
export async function fetchLighthouseReportForExport(clientId?: string | null): Promise<{
  report: LighthouseAssessmentApi;
  scores: LighthouseScoreResult;
}> {
  const report = clientId
    ? await getLighthouseForClient(clientId)
    : await getMyLighthouseAssessment();
  if (!report) {
    throw new Error("Complete your Lighthouse assessment before downloading a report.");
  }
  const scores = scoresFromLighthouseApi(report);
  if (!scores) {
    throw new Error("Report data from the server is incomplete. Refresh and try again.");
  }
  writeLighthouseReportCache(report, clientId ?? null);
  return { report, scores };
}

export function scoresFromLighthouseApi(
  report: LighthouseAssessmentApi,
): LighthouseScoreResult | null {
  const s = report.esgStrength;
  if (s?.totalScore == null || !s.pillarScores || !s.kpiScores?.length) {
    return null;
  }

  const weights = {
    e: s.weights?.e ?? 0.35,
    s: s.weights?.s ?? 0.35,
    g: s.weights?.g ?? 0.3,
  };

  const pillarScores: Record<PillarId, number> = {
    E: Number(s.pillarScores.E ?? s.pillarScores.e ?? 0),
    S: Number(s.pillarScores.S ?? s.pillarScores.s ?? 0),
    G: Number(s.pillarScores.G ?? s.pillarScores.g ?? 0),
  };

  return {
    totalScore: Number(s.totalScore),
    readiness: (s.readiness as ReadinessLevel) || "Developing",
    weights,
    pillarScores,
    kpiScores: s.kpiScores.map((k) => ({
      kpiId: k.kpiId || "",
      kpiLabel: k.kpiLabel || "",
      pillar: (k.pillar as PillarId) || "E",
      score: Number(k.score ?? 0),
      q1: Number(k.q1 ?? 0),
      q2: Number(k.q2 ?? 0),
    })),
  };
}
