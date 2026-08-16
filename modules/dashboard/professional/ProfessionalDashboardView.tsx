"use client";

import { useMemo, useState, type CSSProperties } from "react";
import OverviewQuickActions from "@/modules/dashboard/overview/OverviewQuickActions";
import {
  professionalQuickActions,
} from "@/modules/dashboard/overview/overviewContent";
import {
  BrsrPipelineChart,
  CalculatorCoverageChart,
  EsgPillarsChart,
  SectorPieChart,
} from "@/modules/dashboard/professional/ProfessionalChartWidgets";
import ProfessionalHeroBanner from "@/modules/dashboard/professional/ProfessionalHeroBanner";
import {
  computeProfessionalAnalytics,
  type ProfessionalAnalytics,
} from "@/modules/dashboard/professional/professionalAnalytics";
import {
  PRO_WIDGET_META,
  reorderWidgets,
  visibleWidgets,
  type ProWidgetId,
} from "@/modules/dashboard/professional/professionalDashboardLayout";
import { useProDashboardLayout } from "@/modules/dashboard/professional/useProDashboardLayout";
import { useProfessionalDashboardData } from "@/modules/dashboard/hooks/useProfessionalDashboardData";
import { useMediaQuery } from "@/modules/dashboard/hooks/useMediaQuery";
import { DashboardWidgetCard } from "@/modules/dashboard/components/DashboardWidgetCard";
import { useDashboardWidgetDrag } from "@/modules/dashboard/hooks/useDashboardWidgetDrag";
import {
  buildClientSectorSlices,
  buildRecentActivity,
  buildRegulatoryDeadlines,
} from "@/modules/dashboard/professional/professionalPortfolioExtras";
import ProfessionalRecentActivity from "@/modules/dashboard/professional/ProfessionalRecentActivity";
import ProfessionalRegulatoryDeadlines from "@/modules/dashboard/professional/ProfessionalRegulatoryDeadlines";
import type { RoleKey } from "@/modules/platform/rbac/roles";



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



export default function ProfessionalDashboardView({

  role,

  onNavigateView,

}: {

  role: RoleKey;

  onNavigateView?: (view: string) => void;

}) {

  const {
    fy,
    showClients,
    hasBrsr,
    clients,
    brsrList,
    lighthouseList,
    isfHistory,
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
    getWidgetSources,
    refreshWidget,
    isStaticWidget,
    activityLoading,
  } = useProfessionalDashboardData(role);

  const [customizing, setCustomizing] = useState(false);

  const [layout, setLayout] = useProDashboardLayout(role);

  const { dragId, onDragStart, onDragEnd, onDragOver } = useDashboardWidgetDrag<ProWidgetId>();

  const isMobile = useMediaQuery("(max-width: 767px)");

  const layoutEditing = customizing;


  const analytics: ProfessionalAnalytics | null = useMemo(() => {

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



  const brsrThisFy = useMemo(

    () => brsrList.filter((b) => b.fiscalYear === fy),

    [brsrList, fy],

  );



  const recentClients = useMemo(() => clients.slice(0, 5), [clients]);



  const sectorSlices = useMemo(

    () => (showClients ? buildClientSectorSlices(clients) : []),

    [clients, showClients],

  );



  const recentActivity = useMemo(() => {
    if (activityLoading) return [];
    return buildRecentActivity({
      clients,
      brsrList,
      lighthouseList,
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
    clients,
    brsrList,
    lighthouseList,
    isfHistory,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    fy,
  ]);



  const regulatoryDeadlines = useMemo(() => buildRegulatoryDeadlines(), []);



  const widgetsToRender = useMemo(() => visibleWidgets(layout), [layout]);



  function renderWidget(id: ProWidgetId, embedded: boolean) {

    switch (id) {

      case "kpis":

        return (

          <div className="pro-kpi-grid">

            {showClients && (

              <KpiCard

                label="Active clients"

                value={loading ? "-" : clients.length}

                hint="Organisations in portfolio"

                icon="users-group"

                accent="#0D9488"

              />

            )}

            {hasBrsr && (

              <>

                <KpiCard

                  label="BRSR engagements"

                  value={loading ? "-" : brsrThisFy.length}

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

                  value={loading ? "-" : analytics?.avgEsgScore ?? "-"}

                  hint="Across scored BRSR filings"

                  icon="chart-bar"

                  accent="#2563EB"

                />

              </>

            )}

            <KpiCard

              label="Saved reports"

              value={loading ? "-" : analytics?.totalReports ?? 0}

              hint="ISF, Scope 3, and Net Zero"

              icon="file-description"

              accent="#8B5CF6"

            />

          </div>

        );



      case "chart-brsr":

        return <BrsrPipelineChart analytics={analytics} loading={loading} embedded={embedded} />;



      case "chart-pillars":

        return <EsgPillarsChart analytics={analytics} loading={loading} embedded={embedded} />;



      case "chart-sector":

        return <SectorPieChart sectorSlices={sectorSlices} loading={loading} embedded={embedded} />;



      case "chart-coverage":

        return <CalculatorCoverageChart analytics={analytics} loading={loading} embedded={embedded} />;



      case "insights":
        return (
          <>
            {loading && <p className="dash-muted overview-panel__empty">Loading insights…</p>}
            {!loading && (!analytics || analytics.insights.length === 0) && (
              <p className="dash-muted overview-panel__empty">
                Insights will appear as your portfolio grows.
              </p>
            )}
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
            {!loading && (!analytics || analytics.priorities.length === 0) && (
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


      case "recent-clients":
        return (
          <>
            {embedded && onNavigateView && (
              <div className="overview-panel__head overview-panel__head--actions-only">
                <button
                  type="button"
                  className="overview-panel__link"
                  onClick={() => onNavigateView("clients")}
                >
                  View all
                </button>
              </div>
            )}
            {loading && <p className="dash-muted overview-panel__empty">Loading clients…</p>}
            {!loading && recentClients.length === 0 && (
              <p className="dash-muted overview-panel__empty">
                No clients yet. Add your first organisation to start assessments and calculators.
              </p>
            )}
            {!loading && recentClients.length > 0 && (
              <ul className="overview-list">
                {recentClients.map((client) => (
                  <li key={client.id} className="overview-list__item">
                    <div className="overview-list__main">
                      <p className="overview-list__title">{client.companyName}</p>
                      <p className="overview-list__meta">
                        {[client.sector, client.subSector].filter(Boolean).join(" · ") ||
                          "Sector not set"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        );


      case "recent-activity":

        return (
          <ProfessionalRecentActivity
            items={recentActivity}
            loading={activityLoading}
            onNavigate={onNavigateView}
            embedded={embedded}
          />
        );



      case "regulatory-deadlines":

        return (
          <ProfessionalRegulatoryDeadlines
            deadlines={regulatoryDeadlines}
            onNavigate={onNavigateView}
            embedded={embedded}
          />
        );



      case "quick-actions":

        return (

          <OverviewQuickActions

            actions={professionalQuickActions(role)}

            onNavigate={onNavigateView}

          />

        );



      default:

        return null;

    }

  }



  return (

    <div className="overview-page">

      <ProfessionalHeroBanner
        role={role}
        analytics={analytics}
        loading={loading}
        fy={fy}
        customizing={layoutEditing}
        onCustomizeToggle={() => setCustomizing((open) => !open)}
      />



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
          const meta = PRO_WIDGET_META[id];
          const span = meta.span;
          const staticWidget = isStaticWidget(id);
          const isDragging = dragId === id;

          return (
            <div
              key={id}
              className={`pro-dashboard-widget${span === "full" ? " pro-dashboard-widget--full" : ""}${layoutEditing ? " pro-dashboard-widget--editing-item" : ""}${isDragging ? " pro-dashboard-widget--dragging" : ""}`}
              onDragOver={layoutEditing ? onDragOver : undefined}
              onDrop={
                layoutEditing
                  ? (e) => {
                      e.preventDefault();
                      if (!dragId || dragId === id) return;
                      setLayout({
                        ...layout,
                        order: reorderWidgets(layout.order, dragId, id),
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
                            order: reorderWidgets(layout.order, id, widgetsToRender[index - 1]),
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
                            order: reorderWidgets(layout.order, id, widgetsToRender[index + 1]),
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


