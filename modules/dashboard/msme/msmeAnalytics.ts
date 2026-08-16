import { LIGHTHOUSE_KPIS } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";

export type MsmePillarAvg = { pillar: string; score: number; fill: string };

export type MsmeKpiProgress = { label: string; done: number; total: number; fill: string };

export type MsmePriority = {
  id: string;
  title: string;
  meta: string;
  severity: "high" | "medium" | "low";
  view?: string;
};

export type MsmeInsight = {
  id: string;
  icon: string;
  tone: "success" | "warning" | "info";
  text: string;
};

export type MsmePillarRow = {
  id: string;
  pillar: "E" | "S" | "G";
  name: string;
  category: string;
  score: number;
  done: number;
  total: number;
  color: string;
  bg: string;
  icon: string;
};

export type MsmeAnalytics = {
  healthScore: number | null;
  healthLabel: string;
  pillarAvgs: MsmePillarAvg[];
  kpiProgress: MsmeKpiProgress[];
  pillarRows: MsmePillarRow[];
  insights: MsmeInsight[];
  priorities: MsmePriority[];
  kpisCompleted: number;
  kpisTotal: number;
  savedReports: number;
};

const PILLAR_STYLE: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  E: { color: "#059669", bg: "#E8F5EE", icon: "ti-leaf", label: "Environmental" },
  S: { color: "#4338CA", bg: "#EEF2FF", icon: "ti-users", label: "Social" },
  G: { color: "#C2410C", bg: "#FFF7ED", icon: "ti-building-bank", label: "Governance" },
};

function severityForScore(score: number): "high" | "medium" | "low" {
  if (score < 30) return "high";
  if (score < 50) return "medium";
  return "low";
}

export function computeMsmeAnalytics(
  scores: LighthouseScoreResult | null,
  savedReports = 0,
): MsmeAnalytics {
  const kpisTotal = LIGHTHOUSE_KPIS.length;

  if (!scores) {
    return {
      healthScore: null,
      healthLabel: "Not assessed",
      pillarAvgs: [],
      kpiProgress: [],
      pillarRows: [],
      insights: [
        {
          id: "start-assessment",
          icon: "clipboard-check",
          tone: "info",
          text: "Complete your Lighthouse assessment to unlock ESG scores and personalised insights.",
        },
      ],
      priorities: [
        {
          id: "assessment",
          title: "Start Lighthouse assessment",
          meta: "Baseline your E, S, and G scores",
          severity: "high",
          view: "assessment",
        },
      ],
      kpisCompleted: 0,
      kpisTotal,
      savedReports,
    };
  }

  const pillarAvgs: MsmePillarAvg[] = [
    { pillar: "Environmental", score: Math.round(scores.pillarScores.E * 10) / 10, fill: "#006C49" },
    { pillar: "Social", score: Math.round(scores.pillarScores.S * 10) / 10, fill: "#2563EB" },
    { pillar: "Governance", score: Math.round(scores.pillarScores.G * 10) / 10, fill: "#EA580C" },
  ];

  const byPillar = {
    E: { done: 0, total: 0 },
    S: { done: 0, total: 0 },
    G: { done: 0, total: 0 },
  };

  for (const kpi of scores.kpiScores) {
    byPillar[kpi.pillar].total += 1;
    if (kpi.score > 0) byPillar[kpi.pillar].done += 1;
  }

  const kpiProgress: MsmeKpiProgress[] = [
    { label: "Environmental", done: byPillar.E.done, total: byPillar.E.total, fill: "#006C49" },
    { label: "Social", done: byPillar.S.done, total: byPillar.S.total, fill: "#2563EB" },
    { label: "Governance", done: byPillar.G.done, total: byPillar.G.total, fill: "#EA580C" },
  ];

  const pillarRows: MsmePillarRow[] = scores.kpiScores
    .map((kpi) => {
      const style = PILLAR_STYLE[kpi.pillar];
      return {
        id: kpi.kpiId,
        pillar: kpi.pillar,
        name: kpi.kpiLabel,
        category: style.label,
        score: Math.round(kpi.score),
        done: kpi.score > 0 ? 1 : 0,
        total: 1,
        color: style.color,
        bg: style.bg,
        icon: style.icon,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const kpisCompleted = scores.kpiScores.filter((k) => k.score > 0).length;

  const insights: MsmeInsight[] = [];
  const weakest = [...pillarAvgs].sort((a, b) => a.score - b.score)[0];
  const strongest = [...pillarAvgs].sort((a, b) => b.score - a.score)[0];

  if (weakest.score < 50) {
    insights.push({
      id: "weak-pillar",
      icon: "alert-triangle",
      tone: "warning",
      text: `${weakest.pillar} is your lowest pillar at ${weakest.score}. Focus here for the fastest score improvement.`,
    });
  }

  if (strongest.score >= 60) {
    insights.push({
      id: "strong-pillar",
      icon: "trending-up",
      tone: "success",
      text: `${strongest.pillar} leads at ${strongest.score}. Document practices here for BRSR and lender disclosures.`,
    });
  }

  insights.push({
    id: "readiness",
    icon: "chart-donut",
    tone: "info",
    text: `Overall readiness: ${scores.readiness} (${Math.round(scores.totalScore)} / 100).`,
  });

  const priorities: MsmePriority[] = scores.kpiScores
    .filter((k) => k.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((kpi) => ({
      id: kpi.kpiId,
      title: `Improve ${kpi.kpiLabel}`,
      meta: `${PILLAR_STYLE[kpi.pillar].label} · score ${Math.round(kpi.score)}`,
      severity: severityForScore(kpi.score),
      view: "assessment",
    }));

  if (priorities.length === 0) {
    priorities.push({
      id: "maintain",
      title: "Review assessment responses",
      meta: "Keep KPI evidence current for FY reporting",
      severity: "low",
      view: "assessment",
    });
  }

  return {
    healthScore: Math.round(scores.totalScore),
    healthLabel: scores.readiness,
    pillarAvgs,
    kpiProgress,
    pillarRows,
    insights,
    priorities,
    kpisCompleted,
    kpisTotal,
    savedReports,
  };
}
