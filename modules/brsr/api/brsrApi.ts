import { apiFetch } from "@/modules/platform/api/client";

export type BrsrAssessment = {
  id: string;
  clientId: string;
  clientCompanyName: string;
  fiscalYear: string;
  status: string;
  completionPct: number;
  eScore?: number | null;
  sScore?: number | null;
  gScore?: number | null;
  totalScore?: number | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function num(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAssessment(raw: Record<string, unknown>): BrsrAssessment {
  return {
    id: String(raw.id),
    clientId: String(raw.clientId),
    clientCompanyName: String(raw.clientCompanyName ?? ""),
    fiscalYear: String(raw.fiscalYear ?? ""),
    status: String(raw.status ?? "draft"),
    completionPct: num(raw.completionPct),
    eScore: raw.eScore != null ? num(raw.eScore) : null,
    sScore: raw.sScore != null ? num(raw.sScore) : null,
    gScore: raw.gScore != null ? num(raw.gScore) : null,
    totalScore: raw.totalScore != null ? num(raw.totalScore) : null,
    completedAt: raw.completedAt ? String(raw.completedAt) : null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export function listBrsrAssessments() {
  return apiFetch<Record<string, unknown>[]>("/api/brsr", { method: "GET" }).then((rows) =>
    rows.map(normalizeAssessment),
  );
}

export function getBrsrAssessment(id: string) {
  return apiFetch<Record<string, unknown>>(`/api/brsr/${id}`, { method: "GET" }).then(
    normalizeAssessment,
  );
}

export function createBrsrAssessment(payload: { clientId: string; fiscalYear: string }) {
  return apiFetch<Record<string, unknown>>("/api/brsr", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeAssessment);
}

export function brsrStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "In progress";
  return "Draft";
}

export function isBrsrInProgress(assessment: BrsrAssessment): boolean {
  return assessment.status.toLowerCase() !== "completed";
}
