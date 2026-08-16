"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";
import {
  useMsmeAssessmentSummaryData,
  useProfessionalAssessmentSummaryData,
} from "@/modules/lighthouse/hooks/useAssessmentSummaryData";
import { computeProfessionalAnalytics } from "@/modules/dashboard/professional/professionalAnalytics";
import { readMsmeCompanyFromProfileCache, readLighthouseAssessment } from "@/modules/lighthouse/domain/storage";
import { countAnswered } from "@/modules/lighthouse/domain/questionnaire";
import {
  PillarComparisonBars,
  ScoreGauge,
} from "@/modules/lighthouse/ui/MsmeAssessmentSummaryAnalytics";
import { formatReportTakenAt } from "@/modules/reports/domain/formatReportDate";
import type { AssessmentTab } from "@/modules/dashboard/nav/workspaceRoutes";
import {
  BrsrPipelineChart,
  EsgPillarsChart,
} from "@/modules/dashboard/professional/ProfessionalChartWidgets";

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="card card--elevated pro-kpi-card" style={{ "--kpi-accent": accent } as CSSProperties}>
      <div className="pro-kpi-card__icon">
        <i className={`ti ti-${icon}`} aria-hidden="true" />
      </div>
      <div className="pro-kpi-card__body">
        <span className="dash-score-card__label">{label}</span>
        <p className="pro-kpi-card__value">{value}</p>
        {hint && <p className="pro-kpi-card__hint">{hint}</p>}
      </div>
    </div>
  );
}

const INSIGHT_TONE: Record<string, string> = {
  success: "pro-insight--success",
  warning: "pro-insight--warning",
  info: "pro-insight--info",
};

function MsmeScoreSummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="card card--elevated assessment-msme-summary__score-panel">
      <header className="assessment-msme-summary__score-card-head">
        <i className={`ti ti-${icon}`} aria-hidden="true" />
        <h3 className="assessment-msme-summary__score-card-title">{title}</h3>
      </header>
      {children}
    </section>
  );
}

function MsmeAssessmentSummary({ onSelectTab }: { onSelectTab: (tab: AssessmentTab) => void }) {
  const { scores, reportCreatedAt, reportUpdatedAt, loading } = useMsmeAssessmentSummaryData();

  const hasLighthouse = scores != null;
  const lighthouseDraftInProgress = useMemo(() => {
    if (hasLighthouse || typeof window === "undefined") return false;
    const saved = readLighthouseAssessment(null);
    return saved?.status === "draft" && countAnswered(saved.answers) > 0;
  }, [hasLighthouse]);
  const takenAt = reportUpdatedAt ?? reportCreatedAt;
  const { date, time } = formatReportTakenAt(takenAt);
  const organisation =
    typeof window !== "undefined" ? readMsmeCompanyFromProfileCache() || "My organisation" : "My organisation";

  if (loading) {
    return (
      <div className="assessment-msme-summary assessment-msme-summary--loading" aria-busy="true">
        <div className="assessment-msme-summary__skeleton assessment-msme-summary__skeleton--hero" />
        <div className="assessment-msme-summary__skeleton assessment-msme-summary__skeleton--block" />
        <div className="assessment-msme-summary__skeleton assessment-msme-summary__skeleton--block" />
      </div>
    );
  }

  return (
    <div className="assessment-msme-summary">
      <section className="assessment-msme-summary__executive card card--elevated">
        <div className="assessment-msme-summary__executive-top">
          <p className="assessment-msme-summary__eyebrow">ESG assessment overview</p>
          <h2 className="assessment-msme-summary__org">{organisation}</h2>
          <p className="assessment-msme-summary__intro">
            Consolidated Lighthouse baseline and BRSR readiness for voluntary disclosure planning.
          </p>
        </div>

        <div className="assessment-msme-summary__status-grid">
          <article className="assessment-msme-summary__status-card">
            <div className="assessment-msme-summary__status-card-head">
              <i className="ti ti-file-certificate" aria-hidden="true" />
              <span>BRSR</span>
            </div>
            <span className="assessment-msme-summary__badge assessment-msme-summary__badge--muted">
              Not taken
            </span>
            <p className="assessment-msme-summary__status-card-note">
              Regulatory disclosure · typically prepared with your CA or ESG consultant
            </p>
          </article>

          <article className="assessment-msme-summary__status-card">
            <div className="assessment-msme-summary__status-card-head">
              <i className="ti ti-chart-donut" aria-hidden="true" />
              <span>Lighthouse</span>
            </div>
            {hasLighthouse && takenAt ? (
              <>
                <span className="assessment-msme-summary__badge assessment-msme-summary__badge--done">
                  Completed
                </span>
                <p className="assessment-msme-summary__status-card-note">
                  Assessment taken on{" "}
                  <time dateTime={takenAt}>
                    {date} · {time}
                  </time>
                </p>
              </>
            ) : (
              <>
                <span className="assessment-msme-summary__badge assessment-msme-summary__badge--muted">
                  Not taken
                </span>
                <p className="assessment-msme-summary__status-card-note">
                  Self-assessment baseline · 9 KPIs across E, S, and G pillars
                </p>
              </>
            )}
          </article>
        </div>
      </section>

      <MsmeScoreSummaryCard title="Lighthouse score summary" icon="chart-donut">
        {hasLighthouse && scores ? (
          <div className="assessment-msme-summary__score-split">
            <div className="assessment-msme-summary__score-left">
              <ScoreGauge score={scores.totalScore} />
              <div className="assessment-msme-summary__score-copy">
                <p className="assessment-msme-summary__score-label">Total ESG score</p>
                <span
                  className={`assessment-msme-summary__readiness assessment-msme-summary__readiness--${scores.readiness.toLowerCase()}`}
                >
                  {scores.readiness}
                </span>
                <p className="assessment-msme-summary__score-caption">
                  Industry-weighted composite · FY baseline for lenders and voluntary disclosure
                </p>
              </div>
            </div>

            <div className="assessment-msme-summary__score-right">
              <h4 className="assessment-msme-summary__pillar-title">Pillar breakdown</h4>
              <PillarComparisonBars scores={scores} />
            </div>
          </div>
        ) : (
          <div className="assessment-msme-summary__score-empty">
            <span className="assessment-msme-summary__badge assessment-msme-summary__badge--muted">
              Not taken
            </span>
            <p className="assessment-msme-summary__score-empty-text">
              Complete the 18-question self-assessment to unlock your total ESG score and pillar
              breakdown.
            </p>
            <button type="button" className="btn-primary btn-sm" onClick={() => onSelectTab("lighthouse")}>
              {lighthouseDraftInProgress ? "Continue assessment" : "Take assessment"}
            </button>
          </div>
        )}
      </MsmeScoreSummaryCard>

      <MsmeScoreSummaryCard title="BRSR score summary" icon="file-certificate">
        <div className="assessment-msme-summary__score-empty">
          <span className="assessment-msme-summary__badge assessment-msme-summary__badge--muted">
            Not taken
          </span>
          <p className="assessment-msme-summary__score-empty-text">
            BRSR disclosure scores appear here once your CA, CS, or ESG consultant completes a BRSR
            assessment for your organisation.
          </p>
        </div>
      </MsmeScoreSummaryCard>
    </div>
  );
}

function ProfessionalAssessmentSummary({ role }: { role: RoleKey }) {
  const {
    fy,
    showClients,
    hasBrsr,
    clients,
    brsrList,
    isfStatus,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    workforceStatus,
    governanceStatus,
    stakeholderHrStatus,
    loading,
  } = useProfessionalAssessmentSummaryData(role);

  const analytics = useMemo(() => {
    if (loading) return null;
    return computeProfessionalAnalytics({
      fy,
      clients,
      brsrList,
      isfStatus,
      scope3History,
      nzeTargets,
      workforceHistory,
      governanceHistory,
      stakeholderHrHistory,
      workforceStatus,
      governanceStatus,
      stakeholderHrStatus,
      showClients,
    });
  }, [
    loading,
    fy,
    clients,
    brsrList,
    isfStatus,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    workforceStatus,
    governanceStatus,
    stakeholderHrStatus,
    showClients,
  ]);

  const brsrThisFy = useMemo(() => brsrList.filter((b) => b.fiscalYear === fy), [brsrList, fy]);

  if (loading) {
    return <p className="dash-muted assessment-summary__loading">Loading portfolio analytics…</p>;
  }

  return (
    <div className="assessment-summary">
      <div className="pro-kpi-grid">
        {showClients && (
          <KpiCard
            label="Active clients"
            value={clients.length}
            hint="Organisations in portfolio"
            icon="users-group"
            accent="#0D9488"
          />
        )}
        {hasBrsr && (
          <>
            <KpiCard
              label="BRSR engagements"
              value={brsrThisFy.length}
              hint={
                analytics?.avgBrsrCompletion != null
                  ? `Avg ${analytics.avgBrsrCompletion}% complete`
                  : `FY ${fy.replace("-", "–")}`
              }
              icon="file-certificate"
              accent="#006C49"
            />
            <KpiCard
              label="Avg ESG score"
              value={analytics?.avgEsgScore ?? "-"}
              hint="Across scored BRSR filings"
              icon="chart-bar"
              accent="#2563EB"
            />
          </>
        )}
        <KpiCard
          label="Portfolio health"
          value={analytics?.healthScore ?? "-"}
          hint={analytics?.healthLabel ?? "Getting started"}
          icon="activity-heartbeat"
          accent="#8B5CF6"
        />
      </div>

      {hasBrsr && (
        <div className="assessment-summary__charts">
          <BrsrPipelineChart analytics={analytics} loading={false} embedded />
          <EsgPillarsChart analytics={analytics} loading={false} embedded />
        </div>
      )}

      {analytics && analytics.insights.length > 0 && (
        <section className="card overview-panel">
          <div className="overview-panel__head">
            <h2 className="overview-section__title">Insights</h2>
          </div>
          <ul className="pro-insights-list">
            {analytics.insights.map((item) => (
              <li key={item.id} className={`pro-insight ${INSIGHT_TONE[item.tone]}`}>
                <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AssessmentSummaryView({
  onSelectTab,
}: {
  onSelectTab: (tab: AssessmentTab) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  if (role === "msme") {
    return <MsmeAssessmentSummary onSelectTab={onSelectTab} />;
  }

  return <ProfessionalAssessmentSummary role={role} />;
}
