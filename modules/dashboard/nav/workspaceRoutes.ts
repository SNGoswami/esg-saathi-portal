import { normalizeRole } from "@/modules/platform/rbac/roles";
import { ADMIN_HOME, USER_HOME } from "@/modules/platform/auth/redirect";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

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

function searchParamsFromRecord(params?: SearchParamsRecord | null): URLSearchParams {
  const search = new URLSearchParams();
  if (!params) return search;
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else if (value != null && value !== "") {
      search.set(key, value);
    }
  }
  return search;
}

export function workspaceBasePath(role: string | null | undefined): string {
  return normalizeRole(role) === "admin" ? ADMIN_HOME : USER_HOME;
}

export function buildWorkspaceHref(
  role: string | null | undefined,
  view = "dashboard",
  extra?: URLSearchParams | SearchParamsRecord | null,
): string {
  const base = workspaceBasePath(role);
  const search =
    extra instanceof URLSearchParams ? new URLSearchParams(extra.toString()) : searchParamsFromRecord(extra);
  if (view && view !== "dashboard") search.set("view", view);
  else search.delete("view");
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

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
