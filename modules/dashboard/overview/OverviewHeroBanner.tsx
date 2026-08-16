"use client";

export type OverviewHeroMetric = {
  icon: string;
  label: string;
  value: string;
  progressPct: number;
};

export type OverviewHeroStat = {
  icon: string;
  label: string;
};

export type OverviewHeroBannerProps = {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  fy: string;
  scoreLabel: string;
  score: number | null;
  statusLabel: string;
  statusClass: string;
  loading: boolean;
  customizing?: boolean;
  onCustomizeToggle?: () => void;
  metric?: OverviewHeroMetric | null;
  stats?: OverviewHeroStat[];
};

export default function OverviewHeroBanner({
  ariaLabel,
  eyebrow,
  title,
  description,
  fy,
  scoreLabel,
  score,
  statusLabel,
  statusClass,
  loading,
  customizing,
  onCustomizeToggle,
  metric,
  stats = [],
}: OverviewHeroBannerProps) {
  const fyLabel = fy.replace("-", "–");
  const ringPct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  const showFooter = loading || metric != null || stats.length > 0;
  const scoreLabelParts = scoreLabel.split(/\s+/).filter(Boolean);

  return (
    <section className="pro-overview-hero" aria-label={ariaLabel}>
      <div className="pro-overview-hero__top">
        <div className="pro-overview-hero__brand">
          <p className="pro-overview-hero__eyebrow">{eyebrow}</p>
          <span className="pro-overview-hero__fy-badge">FY {fyLabel}</span>
        </div>
        {onCustomizeToggle && (
          <button
            type="button"
            className={`pro-overview-hero__customize${customizing ? " pro-overview-hero__customize--active" : ""}`}
            onClick={onCustomizeToggle}
            aria-pressed={customizing}
          >
            <i className={`ti ti-${customizing ? "check" : "layout-grid-add"}`} aria-hidden="true" />
            {customizing ? "Done" : "Customize"}
          </button>
        )}
      </div>

      <div className="pro-overview-hero__body">
        <div className="pro-overview-hero__main">
          <h2 className="pro-overview-hero__title">{title}</h2>
          <p className="pro-overview-hero__desc">{description}</p>
        </div>

        <div className="pro-overview-hero__score-panel">
          <div
            className="pro-overview-hero__ring"
            style={{
              background: `conic-gradient(var(--hero-ring-color) ${ringPct * 3.6}deg, var(--hero-ring-track) 0)`,
            }}
            role="img"
            aria-label={
              loading ? `${scoreLabel} loading` : `${scoreLabel} ${score ?? "not available"}`
            }
          >
            <div className="pro-overview-hero__ring-inner">
              <span className="pro-overview-hero__ring-value">
                {loading ? "-" : score != null ? score : "-"}
              </span>
              <span className="pro-overview-hero__score-label">
                {scoreLabelParts.map((part) => (
                  <span key={part} className="pro-overview-hero__score-label-line">
                    {part}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <span className={`pro-overview-hero__status ${statusClass}`}>
            {loading ? "Analysing…" : statusLabel}
          </span>
        </div>
      </div>

      {showFooter && !loading && metric && (
        <div className="pro-overview-hero__footer">
          <div className="pro-overview-hero__kpi-meter">
            <div className="pro-overview-hero__kpi-head">
              <span className="pro-overview-hero__kpi-label">
                <i className={`ti ti-${metric.icon}`} aria-hidden="true" />
                {metric.label}
              </span>
              <span className="pro-overview-hero__kpi-value">{metric.value}</span>
            </div>
            <div className="pro-overview-hero__kpi-track" aria-hidden="true">
              <div
                className="pro-overview-hero__kpi-fill"
                style={{ width: `${Math.min(100, Math.max(0, metric.progressPct))}%` }}
              />
            </div>
          </div>

          {stats.length > 0 && (
            <div className="pro-overview-hero__stats">
              {stats.map((stat) => (
                <span key={stat.label} className="pro-overview-hero__stat">
                  <i className={`ti ti-${stat.icon}`} aria-hidden="true" />
                  {stat.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {showFooter && loading && (
        <div className="pro-overview-hero__footer pro-overview-hero__footer--loading" aria-hidden="true">
          <div className="pro-overview-hero__skeleton pro-overview-hero__skeleton--wide" />
          <div className="pro-overview-hero__skeleton pro-overview-hero__skeleton--narrow" />
        </div>
      )}
    </section>
  );
}
