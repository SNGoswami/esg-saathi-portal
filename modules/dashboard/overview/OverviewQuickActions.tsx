"use client";

import type { OverviewQuickAction } from "@/modules/dashboard/overview/overviewContent";

export default function OverviewQuickActions({
  actions,
  onNavigate,
}: {
  actions: OverviewQuickAction[];
  onNavigate?: (view: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <section className="overview-quick" aria-label="Quick actions">
      <h2 className="overview-section__title">Quick access</h2>
      <div className="overview-quick__grid">
        {actions.map((action) => (
          <button
            key={action.view}
            type="button"
            className="overview-quick__card"
            onClick={() => onNavigate?.(action.view)}
          >
            <span className="overview-quick__icon" aria-hidden="true">
              <i className={`ti ti-${action.icon}`} />
            </span>
            <span className="overview-quick__text">
              <span className="overview-quick__label">{action.label}</span>
              <span className="overview-quick__desc">{action.description}</span>
            </span>
            <i className="ti ti-chevron-right overview-quick__arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
