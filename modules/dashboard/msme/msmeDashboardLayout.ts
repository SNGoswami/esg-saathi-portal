export type MsmeWidgetId =
  | "kpis"
  | "chart-pillars"
  | "chart-kpi-progress"
  | "insights"
  | "priorities"
  | "regulatory-deadlines"
  | "pillar-breakdown"
  | "pending-actions"
  | "recent-activity"
  | "ai-coach"
  | "quick-actions";

export type MsmeLayoutConfig = {
  order: MsmeWidgetId[];
  hidden: MsmeWidgetId[];
};

export type MsmeWidgetMeta = {
  label: string;
  description: string;
  span: "full" | "default";
};

export const MSME_WIDGET_META: Record<MsmeWidgetId, MsmeWidgetMeta> = {
  kpis: { label: "Key metrics", description: "ESG score and pillar KPIs", span: "full" },
  "chart-pillars": { label: "ESG pillars", description: "Environmental, social, governance scores", span: "default" },
  "chart-kpi-progress": { label: "KPI completion", description: "Answered KPIs by pillar", span: "default" },
  insights: { label: "ESG insights", description: "Automated observations from your assessment", span: "default" },
  priorities: { label: "Needs attention", description: "Low-scoring areas to improve", span: "default" },
  "regulatory-deadlines": {
    label: "Regulatory deadlines",
    description: "Upcoming compliance milestones",
    span: "default",
  },
  "pillar-breakdown": { label: "Pillar breakdown", description: "KPI scores across pillars", span: "default" },
  "pending-actions": { label: "Pending actions", description: "Track improvement tasks", span: "default" },
  "recent-activity": { label: "Recent activity", description: "Last 7 days of assessment and report updates", span: "default" },
  "ai-coach": { label: "AI improvement plan", description: "Personalised ESG guidance", span: "default" },
  "quick-actions": { label: "Quick actions", description: "Shortcuts to common tasks", span: "full" },
};

const DEFAULT_ORDER: MsmeWidgetId[] = [
  "kpis",
  "chart-pillars",
  "chart-kpi-progress",
  "insights",
  "priorities",
  "regulatory-deadlines",
  "pillar-breakdown",
  "pending-actions",
  "recent-activity",
  "ai-coach",
  "quick-actions",
];

const STORAGE_KEY = "msme-dashboard-layout";

function isMsmeWidgetId(value: unknown): value is MsmeWidgetId {
  return typeof value === "string" && value in MSME_WIDGET_META;
}

export function getDefaultMsmeLayout(): MsmeLayoutConfig {
  return { order: [...DEFAULT_ORDER], hidden: [] };
}

export function resolveMsmeLayout(saved: MsmeLayoutConfig | null): MsmeLayoutConfig {
  if (!saved) return getDefaultMsmeLayout();

  const order = [
    ...saved.order.filter(isMsmeWidgetId),
    ...DEFAULT_ORDER.filter((id) => !saved.order.includes(id)),
  ];
  const hidden = saved.hidden.filter(isMsmeWidgetId);

  return { order, hidden };
}

export function loadMsmeLayout(): MsmeLayoutConfig {
  if (typeof window === "undefined") return getDefaultMsmeLayout();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultMsmeLayout();

    const parsed = JSON.parse(raw) as Partial<MsmeLayoutConfig>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter(isMsmeWidgetId) : [];
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isMsmeWidgetId) : [];

    return resolveMsmeLayout({ order, hidden });
  } catch {
    return getDefaultMsmeLayout();
  }
}

export function saveMsmeLayout(layout: MsmeLayoutConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function reorderMsmeWidgets(
  order: MsmeWidgetId[],
  from: MsmeWidgetId,
  to: MsmeWidgetId,
): MsmeWidgetId[] {
  if (from === to) return order;

  const next = [...order];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return order;

  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
}

export function visibleMsmeWidgets(layout: MsmeLayoutConfig): MsmeWidgetId[] {
  const hiddenSet = new Set(layout.hidden);
  return layout.order.filter((id) => !hiddenSet.has(id));
}
