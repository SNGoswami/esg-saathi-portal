"use client";

import type { ReactNode } from "react";
import {
  formatWidgetUpdatedLabel,
  getWidgetFreshness,
  type WidgetSourceState,
} from "@/modules/dashboard/data/widgetFreshness";

export type DashboardWidgetCardProps = {
  title: string;
  description?: string;
  sources: WidgetSourceState[];
  onRefresh?: () => void;
  hideChrome?: boolean;
  children: ReactNode;
};

export function DashboardWidgetCard({
  title,
  description,
  sources,
  onRefresh,
  hideChrome = false,
  children,
}: DashboardWidgetCardProps) {
  if (hideChrome) {
    return <>{children}</>;
  }

  const freshness = getWidgetFreshness(sources);
  const refreshing = sources.some((s) => s.refreshing);
  const updatedLabel = formatWidgetUpdatedLabel(sources);

  return (
    <div className="dash-widget-card">
      <div className="dash-widget-card__header">
        <div className="dash-widget-card__title-row">
          <span
            className={[
              "dash-widget-card__status",
              freshness === "fresh" && "dash-widget-card__status--fresh",
              freshness === "stale" && "dash-widget-card__status--stale",
              freshness === "unknown" && "dash-widget-card__status--unknown",
            ]
              .filter(Boolean)
              .join(" ")}
            title={
              freshness === "fresh"
                ? "Data is up to date"
                : freshness === "stale"
                  ? "Data may be outdated — refresh"
                  : "Loading data"
            }
            aria-hidden="true"
          />
          <div className="dash-widget-card__titles">
            <h2 className="dash-widget-card__title">{title}</h2>
            {description && (
              <p className="dash-widget-card__desc">{description}</p>
            )}
          </div>
        </div>
        <div className="dash-widget-card__actions">
          <span className="dash-widget-card__updated">{updatedLabel}</span>
          {onRefresh && (
            <button
              type="button"
              className="dash-widget-card__refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={`Refresh ${title}`}
              title="Refresh"
            >
              <i className={`ti ti-refresh${refreshing ? " dash-widget-card__refresh--spin" : ""}`} />
            </button>
          )}
        </div>
      </div>
      <div className="dash-widget-card__body">{children}</div>
    </div>
  );
}
