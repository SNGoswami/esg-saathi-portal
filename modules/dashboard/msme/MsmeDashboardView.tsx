"use client";

import { useMemo, useState, type CSSProperties } from "react";
import OverviewQuickActions from "@/modules/dashboard/overview/OverviewQuickActions";
import { msmeQuickActions } from "@/modules/dashboard/overview/overviewContent";
import MsmeAiCoachCard from "@/modules/dashboard/msme/MsmeAiCoachCard";
import { MsmeKpiProgressChart, MsmePillarsChart } from "@/modules/dashboard/msme/MsmeChartWidgets";
import MsmeHeroBanner from "@/modules/dashboard/msme/MsmeHeroBanner";
import MsmePillarBreakdown from "@/modules/dashboard/msme/MsmePillarBreakdown";
import MsmeTaskList from "@/modules/dashboard/msme/MsmeTaskList";
import { computeMsmeAnalytics, type MsmeAnalytics } from "@/modules/dashboard/msme/msmeAnalytics";
import {
  MSME_WIDGET_META,
  reorderMsmeWidgets,
  visibleMsmeWidgets,
  type MsmeWidgetId,
} from "@/modules/dashboard/msme/msmeDashboardLayout";
import { buildMsmeActivity, buildRegulatoryDeadlines } from "@/modules/dashboard/msme/msmeExtras";
import { useMsmeDashboardLayout } from "@/modules/dashboard/msme/useMsmeDashboardLayout";
import { useMsmeDashboardData } from "@/modules/dashboard/hooks/useMsmeDashboardData";
import { useMediaQuery } from "@/modules/dashboard/hooks/useMediaQuery";
import { DashboardWidgetCard } from "@/modules/dashboard/components/DashboardWidgetCard";
import { useDashboardWidgetDrag } from "@/modules/dashboard/hooks/useDashboardWidgetDrag";
import ProfessionalRecentActivity from "@/modules/dashboard/professional/ProfessionalRecentActivity";
import ProfessionalRegulatoryDeadlines from "@/modules/dashboard/professional/ProfessionalRegulatoryDeadlines";

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
        <p className="pro-kpi-card__value">
          {value}
        </p>
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

const PRIORITY_TONE: Record<string, string> = {
  high: "pro-priority--high",
  medium: "pro-priority--medium",
  low: "pro-priority--low",
};

export default function MsmeDashboardView({
  onNavigateView,
}: {
  onNavigateView?: (view: string) => void;
}) {
  const {
    fy,
    scores,
    report,
    savedReports,
    isfHistory,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    loading,
    activityLoading,
    getWidgetSources,
    refreshWidget,
    isStaticWidget,
  } = useMsmeDashboardData();
  const [customizing, setCustomizing] = useState(false);
  const [layout, setLayout] = useMsmeDashboardLayout();
  const { dragId, onDragStart, onDragEnd, onDragOver } = useDashboardWidgetDrag<MsmeWidgetId>();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const layoutEditing = customizing;

  const analytics: MsmeAnalytics | null = useMemo(() => {
    if (loading) return null;
    return computeMsmeAnalytics(scores, savedReports);
  }, [loading, scores, savedReports]);

  const recentActivity = useMemo(() => {
    if (activityLoading) return [];
    return buildMsmeActivity({
      scores,
      assessmentUpdatedAt: report?.updatedAt ?? report?.createdAt,
      isfHistory,
      scope3History,
      nzeTargets,
      workforceHistory,
      governanceHistory,
      stakeholderHrHistory,
      fy,
    });
  }, [
    activityLoading,
    scores,
    report,
    isfHistory,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    fy,
  ]);

  const regulatoryDeadlines = useMemo(() => buildRegulatoryDeadlines(), []);
  const widgetsToRender = useMemo(() => visibleMsmeWidgets(layout), [layout]);

  function renderWidget(id: MsmeWidgetId, embedded: boolean) {
    switch (id) {
      case "kpis":
        return (
          <div className="pro-kpi-grid">
            <KpiCard
              label="Overall ESG"
              value={loading ? "-" : analytics?.healthScore ?? "-"}
              hint={analytics?.healthLabel ?? "Complete Lighthouse assessment"}
              icon="chart-donut"
              accent="#006C49"
            />
            <KpiCard
              label="Environmental"
              value={loading ? "-" : scores ? Math.round(scores.pillarScores.E) : "-"}
              hint={
                analytics
                  ? `${analytics.kpiProgress[0]?.done ?? 0}/${analytics.kpiProgress[0]?.total ?? 0} KPIs`
                  : "Not assessed"
              }
              icon="leaf"
              accent="#059669"
            />
            <KpiCard
              label="Social"
              value={loading ? "-" : scores ? Math.round(scores.pillarScores.S) : "-"}
              hint={
                analytics
                  ? `${analytics.kpiProgress[1]?.done ?? 0}/${analytics.kpiProgress[1]?.total ?? 0} KPIs`
                  : "Not assessed"
              }
              icon="users"
              accent="#2563EB"
            />
            <KpiCard
              label="Governance"
              value={loading ? "-" : scores ? Math.round(scores.pillarScores.G) : "-"}
              hint={
                analytics
                  ? `${analytics.kpiProgress[2]?.done ?? 0}/${analytics.kpiProgress[2]?.total ?? 0} KPIs`
                  : "Not assessed"
              }
              icon="building-bank"
              accent="#EA580C"
            />
          </div>
        );

      case "chart-pillars":
        return <MsmePillarsChart analytics={analytics} loading={loading} embedded={embedded} />;

      case "chart-kpi-progress":
        return <MsmeKpiProgressChart analytics={analytics} loading={loading} embedded={embedded} />;

      case "insights":
        return (
          <>
            {loading && <p className="dash-muted overview-panel__empty">Loading insights…</p>}
            {!loading && analytics && analytics.insights.length > 0 && (
              <ul className="pro-insights-list">
                {analytics.insights.map((item) => (
                  <li key={item.id} className={`pro-insight ${INSIGHT_TONE[item.tone]}`}>
                    <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        );

      case "priorities":
        return (
          <>
            {loading && <p className="dash-muted overview-panel__empty">Loading priorities…</p>}
            {!loading && analytics && analytics.priorities.length === 0 && (
              <p className="dash-muted overview-panel__empty">Nothing flagged right now.</p>
            )}
            {!loading && analytics && analytics.priorities.length > 0 && (
              <ul className="pro-priority-list">
                {analytics.priorities.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`pro-priority ${PRIORITY_TONE[item.severity]}`}
                      onClick={() => item.view && onNavigateView?.(item.view)}
                      disabled={!item.view || !onNavigateView}
                    >
                      <span className="pro-priority__dot" aria-hidden="true" />
                      <span className="pro-priority__main">
                        <span className="pro-priority__title">{item.title}</span>
                        <span className="pro-priority__meta">{item.meta}</span>
                      </span>
                      {item.view && onNavigateView && (
                        <i className="ti ti-chevron-right pro-priority__arrow" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        );

      case "regulatory-deadlines":
        return (
          <ProfessionalRegulatoryDeadlines
            deadlines={regulatoryDeadlines}
            onNavigate={onNavigateView}
            embedded={embedded}
          />
        );

      case "pillar-breakdown":
        return (
          <MsmePillarBreakdown
            rows={analytics?.pillarRows ?? []}
            loading={loading}
            onNavigate={onNavigateView}
          />
        );

      case "pending-actions":
        return <MsmeTaskList priorities={analytics?.priorities ?? []} loading={loading} />;

      case "recent-activity":
        return (
          <ProfessionalRecentActivity
            items={recentActivity}
            loading={activityLoading}
            onNavigate={onNavigateView}
            embedded={embedded}
          />
        );

      case "ai-coach":
        return (
          <MsmeAiCoachCard
            analytics={analytics}
            loading={loading}
            onNavigate={onNavigateView}
          />
        );

      case "quick-actions":
        return <OverviewQuickActions actions={msmeQuickActions()} onNavigate={onNavigateView} />;

      default:
        return null;
    }
  }

  return (
    <div className="overview-page">
      <MsmeHeroBanner
        analytics={analytics}
        loading={loading}
        fy={fy}
        customizing={layoutEditing}
        onCustomizeToggle={() => setCustomizing((open) => !open)}
      />

      {!loading && !scores && onNavigateView && (
        <div className="dash-alert" style={{ marginBottom: "0.5rem" }}>
          <button
            type="button"
            className="btn-primary overview-welcome__cta"
            onClick={() => onNavigateView("assessment")}
          >
            Start Lighthouse assessment
          </button>
        </div>
      )}

      {layoutEditing && (
        <div className="pro-customize-bar card">
          <p className="pro-customize-bar__text">
            <i className="ti ti-grip-vertical" aria-hidden="true" />
            {isMobile ? "Use ↑ ↓ on each card to reorder." : "Drag the handle on a card to reorder."}
          </p>
        </div>
      )}

      <div
        className={`pro-dashboard-widgets${layoutEditing ? " pro-dashboard-widgets--editing" : ""}`}
        onDragOver={layoutEditing ? onDragOver : undefined}
      >
        {widgetsToRender.map((id, index) => {
          const meta = MSME_WIDGET_META[id];
          const span = meta.span;
          const staticWidget = isStaticWidget(id);
          const isDragging = dragId === id;

          return (
            <div
              key={id}
              className={`pro-dashboard-widget${span === "full" ? " pro-dashboard-widget--full" : ""}${id === "ai-coach" ? " pro-dashboard-widget--compact pro-dashboard-widget--ai-coach" : ""}${layoutEditing ? " pro-dashboard-widget--editing-item" : ""}${isDragging ? " pro-dashboard-widget--dragging" : ""}`}
              onDragOver={layoutEditing ? onDragOver : undefined}
              onDrop={
                layoutEditing
                  ? (e) => {
                      e.preventDefault();
                      if (!dragId || dragId === id) return;
                      setLayout({
                        ...layout,
                        order: reorderMsmeWidgets(layout.order, dragId, id),
                      });
                    }
                  : undefined
              }
            >
              {layoutEditing && (
                <div className="pro-dashboard-widget__toolbar">
                  {!isMobile && (
                    <button
                      type="button"
                      className="pro-dashboard-widget__handle"
                      draggable
                      aria-label={`Drag to reorder ${meta.label}`}
                      onDragStart={(e) => onDragStart(id, e)}
                      onDragEnd={onDragEnd}
                    >
                      <i className="ti ti-grip-vertical" aria-hidden="true" />
                    </button>
                  )}
                  {isMobile && (
                    <>
                      <button
                        type="button"
                        className="pro-dashboard-widget__nudge"
                        aria-label={`Move ${meta.label} up`}
                        disabled={index === 0}
                        onClick={() =>
                          setLayout({
                            ...layout,
                            order: reorderMsmeWidgets(layout.order, id, widgetsToRender[index - 1]),
                          })
                        }
                      >
                        <i className="ti ti-chevron-up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pro-dashboard-widget__nudge"
                        aria-label={`Move ${meta.label} down`}
                        disabled={index === widgetsToRender.length - 1}
                        onClick={() =>
                          setLayout({
                            ...layout,
                            order: reorderMsmeWidgets(layout.order, id, widgetsToRender[index + 1]),
                          })
                        }
                      >
                        <i className="ti ti-chevron-down" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="pro-dashboard-widget__content">
                <DashboardWidgetCard
                  title={meta.label}
                  description={meta.description}
                  sources={getWidgetSources(id)}
                  onRefresh={staticWidget ? undefined : () => void refreshWidget(id)}
                  hideChrome={staticWidget}
                >
                  {renderWidget(id, !staticWidget)}
                </DashboardWidgetCard>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
