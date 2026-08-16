import { LIGHTHOUSE_KPIS, type PillarId } from "@/modules/lighthouse/domain/questionnaire";

export type PillarWeights = { e: number; s: number; g: number };

export const DEFAULT_PILLAR_WEIGHTS: PillarWeights = { e: 0.35, s: 0.35, g: 0.3 };

/** Industry-adjusted E/S/G weights (sum = 1). Falls back to default. */
export const SECTOR_PILLAR_WEIGHTS: Record<string, PillarWeights> = {
  "Energy & Utilities": { e: 0.5, s: 0.25, g: 0.25 },
  "Metals & Mining": { e: 0.45, s: 0.3, g: 0.25 },
  "Chemicals & Fertilizers": { e: 0.45, s: 0.3, g: 0.25 },
  "Automobile & Auto Components": { e: 0.4, s: 0.35, g: 0.25 },
  "Textiles & Apparel": { e: 0.4, s: 0.35, g: 0.25 },
  "Agriculture & Allied": { e: 0.4, s: 0.35, g: 0.25 },
  "Banking & Financial Services": { e: 0.2, s: 0.35, g: 0.45 },
  "Information Technology": { e: 0.25, s: 0.4, g: 0.35 },
  "Pharmaceuticals & Healthcare": { e: 0.3, s: 0.4, g: 0.3 },
};

export function getPillarWeights(sector?: string | null): PillarWeights {
  if (!sector) return DEFAULT_PILLAR_WEIGHTS;
  return SECTOR_PILLAR_WEIGHTS[sector] ?? DEFAULT_PILLAR_WEIGHTS;
}

export function kpiScore(q1: number, q2: number): number {
  return ((q1 + q2) / 2) * 20;
}

export function pillarScore(kpiScores: number[]): number {
  if (!kpiScores.length) return 0;
  return kpiScores.reduce((sum, s) => sum + s, 0) / kpiScores.length;
}

export function totalEsgScore(
  eScore: number,
  sScore: number,
  gScore: number,
  weights: PillarWeights,
): number {
  return eScore * weights.e + sScore * weights.s + gScore * weights.g;
}

export type ReadinessLevel = "Leader" | "Advanced" | "Developing" | "Beginner" | "Laggard";

export function readinessLevel(total: number): ReadinessLevel {
  if (total >= 80) return "Leader";
  if (total >= 60) return "Advanced";
  if (total >= 40) return "Developing";
  if (total >= 20) return "Beginner";
  return "Laggard";
}

export type KpiScoreResult = {
  kpiId: string;
  kpiLabel: string;
  pillar: PillarId;
  score: number;
  q1: number;
  q2: number;
};

export type LighthouseScoreResult = {
  kpiScores: KpiScoreResult[];
  pillarScores: Record<PillarId, number>;
  totalScore: number;
  readiness: ReadinessLevel;
  weights: PillarWeights;
};

export function computeLighthouseScores(
  answers: Record<string, number>,
  sector?: string | null,
): LighthouseScoreResult {
  const weights = getPillarWeights(sector);
  const kpiScores: KpiScoreResult[] = [];
  const byPillar: Record<PillarId, number[]> = { E: [], S: [], G: [] };

  for (const kpi of LIGHTHOUSE_KPIS) {
    const q1 = answers[kpi.questions[0].id];
    const q2 = answers[kpi.questions[1].id];
    if (q1 == null || q2 == null) {
      throw new Error("Incomplete assessment");
    }
    const score = kpiScore(q1, q2);
    kpiScores.push({
      kpiId: kpi.id,
      kpiLabel: kpi.label,
      pillar: kpi.pillar,
      score,
      q1,
      q2,
    });
    byPillar[kpi.pillar].push(score);
  }

  const pillarScores: Record<PillarId, number> = {
    E: pillarScore(byPillar.E),
    S: pillarScore(byPillar.S),
    G: pillarScore(byPillar.G),
  };

  const totalScore = totalEsgScore(pillarScores.E, pillarScores.S, pillarScores.G, weights);

  return {
    kpiScores,
    pillarScores,
    totalScore,
    readiness: readinessLevel(totalScore),
    weights,
  };
}
