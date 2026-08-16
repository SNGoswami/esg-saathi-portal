"use client";

import type { MsmePillarRow } from "@/modules/dashboard/msme/msmeAnalytics";

export default function MsmePillarBreakdown({
  rows,
  loading,
  onNavigate,
}: {
  rows: MsmePillarRow[];
  loading: boolean;
  onNavigate?: (view: string) => void;
}) {
  return (
    <section className="card overview-panel">
      <div className="overview-panel__head">
        <h2 className="overview-section__title">Pillar breakdown</h2>
        {onNavigate && (
          <button type="button" className="overview-panel__link" onClick={() => onNavigate("assessment")}>
            Open assessment
          </button>
        )}
      </div>

      {loading && <p className="dash-muted overview-panel__empty">Loading pillar data…</p>}
      {!loading && rows.length === 0 && (
        <p className="dash-muted overview-panel__empty">
          Complete your Lighthouse assessment to see KPI breakdown.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <ul className="msme-pillar-list">
          {rows.map((row) => (
            <li key={row.id} className="msme-pillar-list__item">
              <span
                className={`msme-pillar-list__icon msme-pillar-list__icon--${row.pillar.toLowerCase()}`}
                aria-hidden="true"
              >
                <i className={`ti ${row.icon}`} />
              </span>
              <div className="msme-pillar-list__main">
                <p className="overview-list__title">{row.name}</p>
                <p className="overview-list__meta">
                  {row.category} · {row.done}/{row.total}
                </p>
              </div>
              <div className="msme-pillar-list__track" aria-hidden="true">
                <div
                  className={`msme-pillar-list__fill msme-pillar-list__fill--${row.pillar.toLowerCase()}`}
                  style={{ width: `${Math.min(100, row.score)}%` }}
                />
              </div>
              <span className={`msme-pillar-list__score msme-pillar-list__score--${row.pillar.toLowerCase()}`}>
                {row.score}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
