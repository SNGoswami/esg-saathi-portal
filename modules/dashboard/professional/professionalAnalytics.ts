import type { BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import { brsrStatusLabel } from "@/modules/brsr/api/brsrApi";
import type { Client } from "@/modules/clients/api/clientsApi";
import type { IsfClientStatus } from "@/modules/isf-calculator/domain/types";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import type { DisclosureClientStatus, DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";

export type BrsrStatusSlice = { name: string; value: number; fill: string };

export type PillarAvg = { pillar: string; score: number; fill: string };

export type CalculatorCoverage = {
  label: string;
  done: number;
  total: number;
  fill: string;
};

export type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  severity: "high" | "medium" | "low";
  view?: string;
};

export type PortfolioInsight = {
  id: string;
  icon: string;
  tone: "success" | "warning" | "info";
  text: string;
};

export type ProfessionalAnalytics = {
  healthScore: number | null;
  healthLabel: string;
  brsrStatus: BrsrStatusSlice[];
  pillarAvgs: PillarAvg[];
  calculatorCoverage: CalculatorCoverage[];
  priorities: PriorityItem[];
  insights: PortfolioInsight[];
  totalReports: number;
  avgBrsrCompletion: number | null;
  avgEsgScore: number | null;
};

const STATUS_COLORS = {
  completed: "#006C49",
  in_progress: "#2563EB",
  draft: "#94A3B8",
};

function brsrStatusKey(status: string): keyof typeof STATUS_COLORS {
  const s = status.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "in_progress") return "in_progress";
  return "draft";
}

export function computeProfessionalAnalytics(input: {
  fy: string;
  clients: Client[];
  brsrList: BrsrAssessment[];
  isfStatus: IsfClientStatus[];
  scope3History: Scope3HistoryItem[];
  nzeTargets: NzeTargetResponse[];
  workforceHistory?: WorkforceHistoryItem[];
  governanceHistory?: DisclosureHistoryItem[];
  stakeholderHrHistory?: DisclosureHistoryItem[];
  workforceStatus?: DisclosureClientStatus[];
  governanceStatus?: DisclosureClientStatus[];
  stakeholderHrStatus?: DisclosureClientStatus[];
  showClients: boolean;
}): ProfessionalAnalytics {
  const {
    fy,
    clients,
    brsrList,
    isfStatus,
    scope3History,
    nzeTargets,
    workforceHistory = [],
    governanceHistory = [],
    stakeholderHrHistory = [],
    workforceStatus = [],
    governanceStatus = [],
    stakeholderHrStatus = [],
    showClients,
  } = input;

  const brsrFy = brsrList.filter((b) => b.fiscalYear === fy);
  const clientTotal = showClients ? Math.max(clients.length, isfStatus.length) : brsrFy.length;

  const statusCounts = { completed: 0, in_progress: 0, draft: 0 };
  for (const b of brsrFy) {
    statusCounts[brsrStatusKey(b.status)] += 1;
  }

  const brsrStatus: BrsrStatusSlice[] = [
    { name: "Completed", value: statusCounts.completed, fill: STATUS_COLORS.completed },
    { name: "In progress", value: statusCounts.in_progress, fill: STATUS_COLORS.in_progress },
    { name: "Draft", value: statusCounts.draft, fill: STATUS_COLORS.draft },
  ].filter((s) => s.value > 0);

  const withScores = brsrFy.filter((b) => b.totalScore != null && Number.isFinite(b.totalScore));
  const avgEsgScore = withScores.length
    ? Math.round((withScores.reduce((s, b) => s + (b.totalScore ?? 0), 0) / withScores.length) * 10) / 10
    : null;

  const avgE = brsrFy.filter((b) => b.eScore != null);
  const avgS = brsrFy.filter((b) => b.sScore != null);
  const avgG = brsrFy.filter((b) => b.gScore != null);

  const pillarAvgs: PillarAvg[] = [
    {
      pillar: "Environmental",
      score: avgE.length
        ? Math.round((avgE.reduce((s, b) => s + (b.eScore ?? 0), 0) / avgE.length) * 10) / 10
        : 0,
      fill: "#006C49",
    },
    {
      pillar: "Social",
      score: avgS.length
        ? Math.round((avgS.reduce((s, b) => s + (b.sScore ?? 0), 0) / avgS.length) * 10) / 10
        : 0,
      fill: "#2563EB",
    },
    {
      pillar: "Governance",
      score: avgG.length
        ? Math.round((avgG.reduce((s, b) => s + (b.gScore ?? 0), 0) / avgG.length) * 10) / 10
        : 0,
      fill: "#EA580C",
    },
  ].filter((p) => p.score > 0);

  const isfDone = isfStatus.filter((r) => r.has_calculation).length;
  const scope3Done = scope3History.filter((r) => r.fiscal_year === fy).length;
  const nzeDone = nzeTargets.length;
  const workforceDone = showClients
    ? workforceStatus.filter((r) => r.has_report).length
    : workforceHistory.filter((r) => r.fiscal_year === fy).length;
  const governanceDone = showClients
    ? governanceStatus.filter((r) => r.has_report).length
    : governanceHistory.filter((r) => r.fiscal_year === fy).length;
  const stakeholderHrDone = showClients
    ? stakeholderHrStatus.filter((r) => r.has_report).length
    : stakeholderHrHistory.filter((r) => r.fiscal_year === fy).length;
  const coverageTotal = showClients ? Math.max(clientTotal, 1) : Math.max(brsrFy.length, 1);

  const calculatorCoverage: CalculatorCoverage[] = [
    { label: "ISF saved", done: isfDone, total: showClients ? clientTotal : isfDone || 1, fill: "#006C49" },
    { label: "Scope 3 reports", done: scope3Done, total: coverageTotal, fill: "#2563EB" },
    { label: "Net zero targets", done: nzeDone, total: coverageTotal, fill: "#8B5CF6" },
    { label: "Workforce", done: workforceDone, total: coverageTotal, fill: "#0D9488" },
    { label: "Governance", done: governanceDone, total: coverageTotal, fill: "#EA580C" },
    { label: "Stakeholder HR", done: stakeholderHrDone, total: coverageTotal, fill: "#7C3AED" },
  ];

  const totalReports =
    isfDone + scope3Done + nzeDone + workforceDone + governanceDone + stakeholderHrDone;

  const avgBrsrCompletion = brsrFy.length
    ? Math.round(brsrFy.reduce((s, b) => s + b.completionPct, 0) / brsrFy.length)
    : null;

  const healthScore =
    brsrFy.length > 0 && avgBrsrCompletion != null
      ? Math.min(100, Math.round(avgBrsrCompletion * 0.7 + (avgEsgScore ?? 0) * 0.3))
      : totalReports > 0
        ? Math.min(100, Math.round((totalReports / Math.max(coverageTotal * 3, 1)) * 100))
        : null;

  const healthLabel =
    healthScore == null
      ? "Getting started"
      : healthScore >= 75
        ? "Strong momentum"
        : healthScore >= 50
          ? "On track"
          : healthScore >= 25
            ? "Needs focus"
            : "Early stage";

  const priorities: PriorityItem[] = [];

  for (const b of [...brsrFy].sort((a, c) => a.completionPct - c.completionPct).slice(0, 4)) {
    if (b.completionPct < 100) {
      priorities.push({
        id: `brsr-${b.id}`,
        title: b.clientCompanyName,
        meta: `${brsrStatusLabel(b.status)} · ${b.completionPct}% complete`,
        severity: b.completionPct < 35 ? "high" : b.completionPct < 65 ? "medium" : "low",
        view: "brsr-filing",
      });
    }
  }

  if (showClients) {
    for (const row of isfStatus.filter((r) => !r.has_calculation).slice(0, 3)) {
      priorities.push({
        id: `isf-${row.client_id}`,
        title: row.company_name,
        meta: `No ISF calculation for FY ${fy.replace("-", "–")}`,
        severity: "medium",
        view: "isf-calculator",
      });
    }
  }

  const insights: PortfolioInsight[] = [];

  if (brsrFy.length === 0) {
    insights.push({
      id: "no-brsr",
      icon: "file-certificate",
      tone: "info",
      text: `Start a BRSR assessment for FY ${fy.replace("-", "–")} to unlock portfolio analytics.`,
    });
  } else if (statusCounts.completed === brsrFy.length) {
    insights.push({
      id: "all-done",
      icon: "circle-check",
      tone: "success",
      text: `All ${brsrFy.length} BRSR engagement${brsrFy.length === 1 ? "" : "s"} for this fiscal year are completed.`,
    });
  } else if (statusCounts.in_progress > 0) {
    insights.push({
      id: "in-progress",
      icon: "progress",
      tone: "info",
      text: `${statusCounts.in_progress} BRSR filing${statusCounts.in_progress === 1 ? "" : "s"} in progress, avg ${avgBrsrCompletion ?? 0}% complete.`,
    });
  }

  if (showClients && isfStatus.length > 0) {
    const missing = isfStatus.filter((r) => !r.has_calculation).length;
    if (missing > 0) {
      insights.push({
        id: "isf-gap",
        icon: "calculator",
        tone: "warning",
        text: `${missing} client${missing === 1 ? "" : "s"} still need an ISF calculation for FY ${fy.replace("-", "–")}.`,
      });
    }
  }

  if (pillarAvgs.length >= 2) {
    const weakest = [...pillarAvgs].sort((a, b) => a.score - b.score)[0];
    if (weakest.score < 55) {
      insights.push({
        id: "weak-pillar",
        icon: "chart-bar",
        tone: "warning",
        text: `${weakest.pillar} scores average ${weakest.score}/100, consider targeted advisory across clients.`,
      });
    }
  }

  if (nzeDone === 0 && (isfDone > 0 || scope3Done > 0)) {
    insights.push({
      id: "nze-opportunity",
      icon: "plant-2",
      tone: "info",
      text: "Emissions data is available, create Net Zero targets to complete the decarbonisation story.",
    });
  }

  return {
    healthScore,
    healthLabel,
    brsrStatus,
    pillarAvgs,
    calculatorCoverage,
    priorities,
    insights,
    totalReports,
    avgBrsrCompletion,
    avgEsgScore,
  };
}
