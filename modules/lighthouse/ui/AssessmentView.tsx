"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";
import {
  WorkspaceBreadcrumb,
  type WorkspaceBreadcrumbItem,
} from "@/modules/dashboard/components/WorkspaceSectionNav";
import {
  buildAssessmentDashboardUrl,
  parseAssessmentTab,
  type AssessmentRouteParams,
  type AssessmentTab,
} from "@/modules/dashboard/nav/workspaceRoutes";
import LighthouseAssessmentListView from "@/modules/lighthouse/ui/LighthouseAssessmentListView";
import AssessmentSummaryView from "@/modules/lighthouse/ui/AssessmentSummaryView";
import BrsrAssessmentView from "@/modules/brsr/ui/BrsrAssessmentView";
import PlaceholderView from "@/modules/dashboard/views/PlaceholderView";

const BRSR_WORKSPACE_ROLES = new Set<RoleKey>([
  "ca",
  "cs",
  "esg_consultant",
  "assurer_auditor",
]);

const TAB_LABELS: Record<AssessmentTab, string> = {
  summary: "Summary",
  lighthouse: "Lighthouse",
  brsr: "BRSR",
};

function AssessmentTabButton({
  active,
  label,
  tabId,
  onClick,
}: {
  active: boolean;
  label: string;
  tabId: AssessmentTab;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`assessment-tab-${tabId}`}
      aria-selected={active}
      aria-controls={`assessment-panel-${tabId}`}
      className={`dash-tab${active ? " dash-tab--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MsmeBrsrPanel({ onNavigateView }: { onNavigateView?: (view: string) => void }) {
  return (
    <div className="card card--elevated assessment-brsr-notice">
      <p className="assessment-brsr-notice__title">BRSR disclosure assessments</p>
      <p className="assessment-brsr-notice__text">
        BRSR reports are structured for regulatory disclosure and are usually prepared with your
        CA, CS, or ESG consultant. Use Lighthouse for your self-assessment baseline in the meantime.
      </p>
      {onNavigateView && (
        <div className="assessment-brsr-notice__actions">
          <button type="button" className="btn-primary btn-sm" onClick={() => onNavigateView("reports")}>
            View saved reports
          </button>
        </div>
      )}
    </div>
  );
}

function resolveAssessmentTab(searchParams: URLSearchParams): AssessmentTab {
  const fromUrl = searchParams.get("tab");
  if (fromUrl) return parseAssessmentTab(fromUrl);
  if (searchParams.get("assessmentId")) return "brsr";
  if (searchParams.get("clientId")) return "lighthouse";
  return "summary";
}

export default function AssessmentView({
  onNavigateView,
  onNavigateToReport,
  onNavigateToAssessment,
}: {
  onNavigateView?: (view: string) => void;
  onNavigateToReport?: (category: string, reportId: string, extra?: { clientId?: string | null }) => void;
  onNavigateToAssessment?: (params?: AssessmentRouteParams) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<AssessmentTab>(() => resolveAssessmentTab(searchParams));
  const [drilldownLabel, setDrilldownLabel] = useState<string | null>(null);
  const [backToListSignal, setBackToListSignal] = useState(0);

  const deepLinkClientId = searchParams.get("clientId");
  const deepLinkAssessmentId = searchParams.get("assessmentId");

  const syncAssessmentUrl = useCallback(
    (nextTab: AssessmentTab, extra?: Pick<AssessmentRouteParams, "clientId" | "assessmentId">) => {
      const url = buildAssessmentDashboardUrl({
        tab: nextTab,
        clientId: extra?.clientId ?? null,
        assessmentId: extra?.assessmentId ?? null,
      });
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const selectTab = useCallback(
    (next: AssessmentTab) => {
      setTab(next);
      setDrilldownLabel(null);
      setBackToListSignal((n) => n + 1);
      syncAssessmentUrl(next);
    },
    [syncAssessmentUrl],
  );

  useEffect(() => {
    setTab(resolveAssessmentTab(searchParams));
  }, [searchParams]);

  const breadcrumb = useMemo<WorkspaceBreadcrumbItem[]>(() => {
    if (!drilldownLabel || tab === "summary") return [];
    return [
      {
        label: TAB_LABELS[tab],
        onClick: () => {
          setDrilldownLabel(null);
          setBackToListSignal((n) => n + 1);
          syncAssessmentUrl(tab);
        },
      },
      { label: drilldownLabel },
    ];
  }, [drilldownLabel, syncAssessmentUrl, tab]);

  if (role === "admin") {
    return <PlaceholderView view="assessment" icon="clipboard-check" />;
  }

  return (
    <div className="assessment-view">
      {breadcrumb.length > 0 && <WorkspaceBreadcrumb items={breadcrumb} />}

      <div className="dash-tabs assessment-view__tabs" role="tablist" aria-label="Assessment sections">
        <AssessmentTabButton
          active={tab === "summary"}
          label="Summary"
          tabId="summary"
          onClick={() => selectTab("summary")}
        />
        <AssessmentTabButton
          active={tab === "lighthouse"}
          label="Lighthouse"
          tabId="lighthouse"
          onClick={() => selectTab("lighthouse")}
        />
        <AssessmentTabButton
          active={tab === "brsr"}
          label="BRSR"
          tabId="brsr"
          onClick={() => selectTab("brsr")}
        />
      </div>

      <div
        role="tabpanel"
        id={`assessment-panel-${tab}`}
        aria-labelledby={`assessment-tab-${tab}`}
        className="assessment-view__panel"
      >
        {tab === "summary" && <AssessmentSummaryView onSelectTab={selectTab} />}

        {tab === "lighthouse" && (
          <LighthouseAssessmentListView
            embedded
            initialClientId={deepLinkClientId}
            backToListSignal={backToListSignal}
            onDrilldownChange={setDrilldownLabel}
            onNavigateToReport={onNavigateToReport}
            onNavigateToAssessment={onNavigateToAssessment}
          />
        )}

        {tab === "brsr" &&
          (role === "msme" ? (
            <MsmeBrsrPanel onNavigateView={onNavigateView} />
          ) : BRSR_WORKSPACE_ROLES.has(role) ? (
            <BrsrAssessmentView
              embedded
              initialAssessmentId={deepLinkAssessmentId}
              onDrilldownChange={setDrilldownLabel}
              onNavigateToReport={onNavigateToReport}
              onNavigateToAssessment={onNavigateToAssessment}
            />
          ) : (
            <MsmeBrsrPanel onNavigateView={onNavigateView} />
          ))}
      </div>
    </div>
  );
}
