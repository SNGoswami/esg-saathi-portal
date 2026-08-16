"use client";

import type { RegulatoryDeadline } from "@/modules/dashboard/professional/professionalPortfolioExtras";

export default function ProfessionalRegulatoryDeadlines({
  deadlines,
  onNavigate,
  embedded = false,
}: {
  deadlines: RegulatoryDeadline[];
  onNavigate?: (view: string) => void;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "overview-panel overview-panel--embedded" : "card overview-panel"}>
      {!embedded && (
        <div className="overview-panel__head">
          <h2 className="overview-section__title">Regulatory deadlines</h2>
          {onNavigate && (
            <button
              type="button"
              className="overview-panel__link"
              onClick={() => onNavigate("regulatory-deadline")}
            >
              View all
            </button>
          )}
        </div>
      )}
      {embedded && onNavigate && (
        <div className="overview-panel__head overview-panel__head--actions-only">
          <button
            type="button"
            className="overview-panel__link"
            onClick={() => onNavigate("regulatory-deadline")}
          >
            View all
          </button>
        </div>
      )}

      <ul className="pro-deadline-list">
        {deadlines.map((d) => (
          <li key={d.id} className="pro-deadline-item">
            <p
              className={`pro-deadline-item__date${d.soon ? " pro-deadline-item__date--soon" : ""}`}
            >
              {d.dateLabel}
            </p>
            <div className="pro-deadline-item__main">
              <p className="pro-deadline-item__title">{d.title}</p>
              <p className="pro-deadline-item__category">{d.category}</p>
            </div>
            <span
              className={`pro-deadline-item__badge${d.soon ? " pro-deadline-item__badge--soon" : ""}`}
            >
              {d.daysLeft}d
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
