import { roleHasClients } from "@/modules/dashboard/overview/overviewContent";
import type { RoleKey } from "@/modules/platform/rbac/roles";

export type ProWidgetId =
  | "kpis"
  | "chart-brsr"
  | "chart-pillars"
  | "chart-sector"
  | "chart-coverage"
  | "insights"
  | "priorities"
  | "recent-clients"
  | "recent-activity"
  | "regulatory-deadlines"
  | "quick-actions";

export type ProLayoutConfig = {
  order: ProWidgetId[];
  hidden: ProWidgetId[];
};

export type ProWidgetMeta = {
  label: string;
  description: string;
  span: "full" | "default";
};

export const PRO_WIDGET_META: Record<ProWidgetId, ProWidgetMeta> = {
  kpis: { label: "Key metrics", description: "Clients, BRSR, and saved reports", span: "full" },
  "chart-brsr": { label: "BRSR pipeline", description: "Status breakdown for current FY", span: "default" },
  "chart-pillars": { label: "ESG pillars", description: "Average scores across engagements", span: "default" },
  "chart-sector": { label: "Clients by sector", description: "Portfolio sector distribution", span: "default" },
  "chart-coverage": {
    label: "Calculator adoption",
    description: "Saved outputs vs portfolio size",
    span: "default",
  },
  insights: { label: "Portfolio insights", description: "Automated portfolio observations", span: "default" },
  priorities: { label: "Needs attention", description: "Items requiring follow-up", span: "default" },
  "recent-clients": { label: "Recent clients", description: "Latest onboarded organisations", span: "default" },
  "recent-activity": { label: "Recent activity", description: "Last 7 days of workspace events", span: "default" },
  "regulatory-deadlines": {
    label: "Regulatory deadlines",
    description: "Upcoming compliance milestones",
    span: "default",
  },
  "quick-actions": { label: "Quick actions", description: "Shortcuts to common tasks", span: "full" },
};

const DEFAULT_ORDER: ProWidgetId[] = [
  "kpis",
  "chart-brsr",
  "chart-pillars",
  "chart-sector",
  "priorities",
  "chart-coverage",
  "insights",
  "regulatory-deadlines",
  "recent-activity",
  "recent-clients",
  "quick-actions",
];

function storageKey(role: RoleKey) {
  return `pro-dashboard-layout:${role}`;
}

function roleHasBrsr(role: RoleKey) {
  return role === "ca" || role === "cs" || role === "esg_consultant" || role === "assurer_auditor";
}

export function getAvailableWidgets(role: RoleKey): ProWidgetId[] {
  const showClients = roleHasClients(role);
  const hasBrsr = roleHasBrsr(role);

  return DEFAULT_ORDER.filter((id) => {
    if (id === "chart-sector" || id === "recent-clients") return showClients;
    if (id === "chart-brsr" || id === "chart-pillars") return hasBrsr;
    return true;
  });
}

export function getDefaultLayout(role: RoleKey): ProLayoutConfig {
  return { order: getAvailableWidgets(role), hidden: [] };
}

function isProWidgetId(value: unknown): value is ProWidgetId {
  return typeof value === "string" && value in PRO_WIDGET_META;
}

export function resolveLayout(saved: ProLayoutConfig | null, role: RoleKey): ProLayoutConfig {
  const available = getAvailableWidgets(role);
  const availableSet = new Set(available);

  if (!saved) {
    return getDefaultLayout(role);
  }

  const order = [
    ...saved.order.filter((id) => availableSet.has(id)),
    ...available.filter((id) => !saved.order.includes(id)),
  ];

  const hidden = saved.hidden.filter((id) => availableSet.has(id));

  return { order, hidden };
}

export function loadLayout(role: RoleKey): ProLayoutConfig {
  if (typeof window === "undefined") return getDefaultLayout(role);

  try {
    const raw = localStorage.getItem(storageKey(role));
    if (!raw) return getDefaultLayout(role);

    const parsed = JSON.parse(raw) as Partial<ProLayoutConfig>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter(isProWidgetId) : [];
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isProWidgetId) : [];

    return resolveLayout({ order, hidden }, role);
  } catch {
    return getDefaultLayout(role);
  }
}

export function saveLayout(role: RoleKey, layout: ProLayoutConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(role), JSON.stringify(layout));
}

export function reorderWidgets(
  order: ProWidgetId[],
  from: ProWidgetId,
  to: ProWidgetId,
): ProWidgetId[] {
  if (from === to) return order;

  const next = [...order];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return order;

  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
}

export function toggleWidgetVisibility(hidden: ProWidgetId[], id: ProWidgetId): ProWidgetId[] {
  return hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id];
}

export function visibleWidgets(layout: ProLayoutConfig): ProWidgetId[] {
  const hiddenSet = new Set(layout.hidden);
  return layout.order.filter((id) => !hiddenSet.has(id));
}
