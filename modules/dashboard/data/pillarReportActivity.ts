import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { ActivityItem } from "@/modules/dashboard/professional/professionalPortfolioExtras";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";

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

export function pillarHistoryToActivity(
  items: Array<DisclosureHistoryItem | WorkforceHistoryItem>,
  config: { label: string; view: string; dot: string; fy: string; maxAgeMs?: number },
): ActivityItem[] {
  const now = Date.now();
  return items
    .filter((row) => row.fiscal_year === config.fy)
    .map((row) => {
      const t = formatRelativeTime(row.updated_at);
      const client = row.client_company_name ?? "Your organisation";
      return {
        id: `${config.view}-${row.id}`,
        text: `${config.label} report saved, ${client}`,
        time: t.label,
        dot: config.dot,
        sortKey: t.sortKey,
        view: config.view,
      };
    })
    .filter((row) => {
      if (config.maxAgeMs == null) return true;
      return row.sortKey > 0 && now - row.sortKey <= config.maxAgeMs;
    });
}
