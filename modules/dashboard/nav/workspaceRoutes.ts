export type AssessmentTab = "summary" | "lighthouse" | "brsr";

export type AssessmentRouteParams = {
  tab?: AssessmentTab;
  clientId?: string | null;
  assessmentId?: string | null;
};

export type ReportsRouteParams = {
  category?: string;
  reportId?: string | null;
  clientId?: string | null;
};

export function buildAssessmentDashboardUrl(params?: AssessmentRouteParams): string {
  const search = new URLSearchParams({ view: "assessment" });
  if (params?.tab) search.set("tab", params.tab);
  if (params?.clientId) search.set("clientId", params.clientId);
  if (params?.assessmentId) search.set("assessmentId", params.assessmentId);
  return `/user/dashboard?${search}`;
}

export function buildReportsDashboardUrl(params?: ReportsRouteParams): string {
  const search = new URLSearchParams({ view: "reports" });
  if (params?.category && params.category !== "all") search.set("category", params.category);
  if (params?.reportId) search.set("reportId", params.reportId);
  if (params?.clientId) search.set("clientId", params.clientId);
  return `/user/dashboard?${search}`;
}

export function parseAssessmentTab(value: string | null): AssessmentTab {
  if (value === "lighthouse" || value === "brsr" || value === "summary") return value;
  return "summary";
}
