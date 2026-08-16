import {
  buildRegulatoryDeadlines,
  finalizeRecentActivity,
  isRecentActivityTimestamp,
  RECENT_ACTIVITY_WINDOW_MS,
} from "@/modules/dashboard/professional/professionalPortfolioExtras";
import type { ActivityItem } from "@/modules/dashboard/professional/professionalPortfolioExtras";
import { pillarHistoryToActivity } from "@/modules/dashboard/data/pillarReportActivity";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";
import type { IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import { PILLARS } from "@/modules/platform/theme/tokens";

function formatRelativeTime(iso?: string | null): { label: string; sortKey: number } {
  if (!iso) return { label: "-", sortKey: 0 };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { label: "-", sortKey: 0 };

  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return { label: `${Math.max(1, diffMins)}m ago`, sortKey: d.getTime() };
  if (diffHours < 24) return { label: `${diffHours}h ago`, sortKey: d.getTime() };
  if (diffDays === 1) return { label: "Yesterday", sortKey: d.getTime() };
  if (diffDays < 7) return { label: `${diffDays}d ago`, sortKey: d.getTime() };

  return {
    label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    sortKey: d.getTime(),
  };
}

export function buildMsmeActivity(input: {
  scores: LighthouseScoreResult | null;
  assessmentUpdatedAt?: string | null;
  isfHistory?: IsfHistoryItem[];
  scope3History?: Scope3HistoryItem[];
  nzeTargets?: NzeTargetResponse[];
  workforceHistory?: WorkforceHistoryItem[];
  governanceHistory?: DisclosureHistoryItem[];
  stakeholderHrHistory?: DisclosureHistoryItem[];
  fy: string;
}): ActivityItem[] {
  const {
    scores,
    assessmentUpdatedAt,
    isfHistory = [],
    scope3History = [],
    nzeTargets = [],
    workforceHistory = [],
    governanceHistory = [],
    stakeholderHrHistory = [],
    fy,
  } = input;
  const items: ActivityItem[] = [];

  if (scores && assessmentUpdatedAt) {
    const t = formatRelativeTime(assessmentUpdatedAt);
    if (isRecentActivityTimestamp(t.sortKey)) {
      items.push({
        id: "lighthouse-update",
        text: `Lighthouse assessment updated, score ${Math.round(scores.totalScore)} (${scores.readiness})`,
        time: t.label,
        dot: PILLARS.environment.base,
        sortKey: t.sortKey,
        view: "assessment",
      });
    }
  }

  for (const row of isfHistory.filter((r) => r.fiscal_year === fy)) {
    const t = formatRelativeTime(row.created_at);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    items.push({
      id: `isf-${row.id}`,
      text: `ISF calculation saved, FY ${row.fiscal_year ?? fy}`,
      time: t.label,
      dot: "#006C49",
      sortKey: t.sortKey,
      view: "isf-calculator",
    });
  }

  for (const row of scope3History.filter((r) => r.fiscal_year === fy)) {
    const t = formatRelativeTime(row.updated_at);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    items.push({
      id: `scope3-${row.id}`,
      text: `Scope 3 report saved`,
      time: t.label,
      dot: "#6366F1",
      sortKey: t.sortKey,
      view: "scope-3-ghg",
    });
  }

  for (const target of nzeTargets) {
    const t = formatRelativeTime(target.updated_at);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    items.push({
      id: `nze-${target.id}`,
      text: `Net Zero target updated, ${target.name}`,
      time: t.label,
      dot: "#8B5CF6",
      sortKey: t.sortKey,
      view: "net-zero",
    });
  }

  items.push(
    ...pillarHistoryToActivity(workforceHistory, {
      label: "Workforce",
      view: "workforce",
      dot: "#0D9488",
      fy,
      maxAgeMs: RECENT_ACTIVITY_WINDOW_MS,
    }),
    ...pillarHistoryToActivity(governanceHistory, {
      label: "Governance",
      view: "governance",
      dot: "#C2410C",
      fy,
      maxAgeMs: RECENT_ACTIVITY_WINDOW_MS,
    }),
    ...pillarHistoryToActivity(stakeholderHrHistory, {
      label: "Stakeholder HR",
      view: "stakeholder-hr",
      dot: "#7C3AED",
      fy,
      maxAgeMs: RECENT_ACTIVITY_WINDOW_MS,
    }),
  );

  const recent = finalizeRecentActivity(items);
  if (recent.length > 0) return recent;

  return [
    {
      id: "get-started",
      text: "Complete Lighthouse assessment to start tracking activity",
      time: "-",
      dot: "#94A3B8",
      sortKey: 0,
      view: "assessment",
    },
  ];
}

export { buildRegulatoryDeadlines };
