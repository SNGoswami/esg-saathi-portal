import { brsrStatusLabel } from "@/modules/brsr/api/brsrApi";
import type { BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import type { Client } from "@/modules/clients/api/clientsApi";
import type { LighthouseAssessmentSummary } from "@/modules/lighthouse/api/lighthouseApi";
import type { IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";
import { pillarHistoryToActivity } from "@/modules/dashboard/data/pillarReportActivity";

/** Only surface activity from this window in the Recent activity widget. */
export const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const RECENT_ACTIVITY_LIMIT = 6;

export function isRecentActivityTimestamp(sortKey: number, now = Date.now()): boolean {
  return sortKey > 0 && now - sortKey <= RECENT_ACTIVITY_WINDOW_MS;
}

export function finalizeRecentActivity(items: ActivityItem[], limit = RECENT_ACTIVITY_LIMIT): ActivityItem[] {
  const now = Date.now();
  return items
    .filter((item) => isRecentActivityTimestamp(item.sortKey, now))
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit);
}

export function latestActivityTimestamp(items: ActivityItem[]): number | null {
  if (items.length === 0) return null;
  return Math.max(...items.map((item) => item.sortKey));
}

export type ActivityItem = {
  id: string;
  text: string;
  time: string;
  dot: string;
  sortKey: number;
  view?: string;
};

export type SectorSlice = { name: string; value: number; fill: string };

export type RegulatoryDeadline = {
  id: string;
  dateLabel: string;
  title: string;
  daysLeft: number;
  soon: boolean;
  category: string;
};

const SECTOR_COLORS = [
  "#006C49",
  "#2563EB",
  "#8B5CF6",
  "#EA580C",
  "#0D9488",
  "#DC2626",
  "#64748B",
  "#F59E0B",
];

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

export function buildClientSectorSlices(clients: Client[]): SectorSlice[] {
  const counts = new Map<string, number>();

  for (const client of clients) {
    const sector = (client.sector?.trim() || "Unspecified").replace(/\s+/g, " ");
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }));
}

export function buildRecentActivity(input: {
  clients: Client[];
  brsrList: BrsrAssessment[];
  lighthouseList?: LighthouseAssessmentSummary[];
  isfHistory?: IsfHistoryItem[];
  scope3History: Scope3HistoryItem[];
  nzeTargets: NzeTargetResponse[];
  workforceHistory?: WorkforceHistoryItem[];
  governanceHistory?: DisclosureHistoryItem[];
  stakeholderHrHistory?: DisclosureHistoryItem[];
  fy: string;
}): ActivityItem[] {
  const {
    clients,
    brsrList,
    lighthouseList = [],
    isfHistory = [],
    scope3History,
    nzeTargets,
    workforceHistory = [],
    governanceHistory = [],
    stakeholderHrHistory = [],
    fy,
  } = input;
  const items: ActivityItem[] = [];

  for (const row of lighthouseList) {
    const t = formatRelativeTime(row.updatedAt ?? row.createdAt);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    const client = row.clientCompanyName ? `${row.clientCompanyName} · ` : "";
    const score = row.totalScore != null ? row.totalScore.toFixed(1) : "-";
    items.push({
      id: `lighthouse-${row.id}`,
      text: `Lighthouse assessment completed, ${client}score ${score}`,
      time: t.label,
      dot: "#006C49",
      sortKey: t.sortKey,
      view: "assessment",
    });
  }

  for (const b of brsrList.filter((r) => r.fiscalYear === fy)) {
    const t = formatRelativeTime(b.updatedAt ?? b.createdAt);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    items.push({
      id: `brsr-${b.id}`,
      text: `BRSR ${brsrStatusLabel(b.status).toLowerCase()}, ${b.clientCompanyName} (${b.completionPct}%)`,
      time: t.label,
      dot: b.status.toLowerCase() === "completed" ? "#10B981" : "#2563EB",
      sortKey: t.sortKey,
      view: "assessment",
    });
  }

  for (const row of isfHistory.filter((r) => r.fiscal_year === fy)) {
    const t = formatRelativeTime(row.created_at);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    const client = row.client_company_name ? `${row.client_company_name} · ` : "";
    items.push({
      id: `isf-${row.id}`,
      text: `ISF calculation saved, ${client}FY ${row.fiscal_year ?? fy}`,
      time: t.label,
      dot: "#006C49",
      sortKey: t.sortKey,
      view: "isf-calculator",
    });
  }

  for (const row of scope3History.filter((r) => r.fiscal_year === fy)) {
    const t = formatRelativeTime(row.updated_at);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    const client = row.client_company_name ?? "Client";
    items.push({
      id: `scope3-${row.id}`,
      text: `Scope 3 report saved, ${client}`,
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
      text: `Net Zero target updated, ${target.client_company_name ?? target.name}`,
      time: t.label,
      dot: "#8B5CF6",
      sortKey: t.sortKey,
      view: "net-zero",
    });
  }

  for (const client of clients) {
    const t = formatRelativeTime(client.createdAt);
    if (!isRecentActivityTimestamp(t.sortKey)) continue;
    items.push({
      id: `client-${client.id}`,
      text: `Client onboarded, ${client.companyName}`,
      time: t.label,
      dot: "#0D9488",
      sortKey: t.sortKey,
      view: "clients",
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

  return finalizeRecentActivity(items);
}

const DEADLINE_TEMPLATES: Array<{
  id: string;
  month: number;
  day: number;
  title: string;
  category: string;
}> = [
  {
    id: "brsr-filing",
    month: 5,
    day: 31,
    title: "BRSR annual submission (post FY Mar close)",
    category: "BRSR",
  },
  {
    id: "assurance-pack",
    month: 6,
    day: 30,
    title: "Assurance evidence & working papers",
    category: "Assurance",
  },
  {
    id: "scope3-review",
    month: 7,
    day: 31,
    title: "Scope 3 category review & client sign-off",
    category: "GHG",
  },
  {
    id: "agm-cycle",
    month: 8,
    day: 15,
    title: "AGM / business responsibility report cycle",
    category: "Governance",
  },
  {
    id: "fy-freeze",
    month: 2,
    day: 28,
    title: "FY ESG data freeze & calculator reconciliation",
    category: "Reporting",
  },
  {
    id: "value-chain",
    month: 3,
    day: 31,
    title: "Value-chain ESG disclosure readiness",
    category: "SEBI",
  },
];

export function buildRegulatoryDeadlines(): RegulatoryDeadline[] {
  const now = new Date();
  const year = now.getFullYear();

  const resolved = DEADLINE_TEMPLATES.map((tpl) => {
    let date = new Date(year, tpl.month - 1, tpl.day);
    if (date.getTime() < now.getTime()) {
      date = new Date(year + 1, tpl.month - 1, tpl.day);
    }
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    const dateLabel = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    return {
      id: tpl.id,
      dateLabel,
      title: tpl.title,
      daysLeft,
      soon: daysLeft <= 30,
      category: tpl.category,
    };
  });

  return resolved.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
}
