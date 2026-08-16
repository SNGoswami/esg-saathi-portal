"use client";

import type { ActivityItem } from "@/modules/dashboard/professional/professionalPortfolioExtras";

export default function ProfessionalRecentActivity({
  items,
  loading,
  onNavigate,
  embedded = false,
}: {
  items: ActivityItem[];
  loading: boolean;
  onNavigate?: (view: string) => void;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "overview-panel overview-panel--embedded" : "card overview-panel"}>
      {!embedded && (
        <div className="overview-panel__head">
          <h2 className="overview-section__title">Recent activity</h2>
        </div>
      )}

      {loading && <p className="dash-muted overview-panel__empty">Loading activity…</p>}

      {!loading && items.length === 0 && (
        <p className="dash-muted overview-panel__empty">
          Activity from the last 7 days will appear here — assessments, reports, and client updates.
        </p>
      )}

      {!loading && items.length > 0 && (
        <ul className="pro-activity-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="pro-activity-item"
                onClick={() => item.view && onNavigate?.(item.view)}
                disabled={!item.view || !onNavigate}
              >
                <span className="pro-activity-item__dot" style={{ background: item.dot }} aria-hidden="true" />
                <span className="pro-activity-item__text">{item.text}</span>
                <span className="pro-activity-item__time">{item.time}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
