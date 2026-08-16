"use client";

import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import { LighthouseKpiBreakdown } from "@/modules/lighthouse/ui/LighthouseKpiBreakdown";
import {
  PillarComparisonBars,
  ScoreGauge,
} from "@/modules/lighthouse/ui/MsmeAssessmentSummaryAnalytics";

export default function LighthouseResultsScreen({
  embedded,
  clientId,
  scores,
  sector,
  onBack,
  onOpenReport,
}: {
  embedded?: boolean;
  clientId?: string | null;
  scores: LighthouseScoreResult;
  sector: string;
  onBack: () => void;
  onOpenReport?: () => void;
}) {
  const readinessKey = scores.readiness.toLowerCase();

  return (
    <div className={`${embedded ? "lighthouse-assessment" : "dash-content"} lighthouse-results`}>
      <div className="lighthouse-results__toolbar">
        <button type="button" className="calc-back-btn" onClick={onBack}>
          ← Back to list
        </button>
        {onOpenReport && (
          <button type="button" className="btn-ghost lighthouse-results__report-btn" onClick={onOpenReport}>
            <i className="ti ti-file-text" aria-hidden="true" />
            View full report
          </button>
        )}
      </div>

      <section className="lighthouse-results__score-panel card card--elevated">
        <header className="lighthouse-results__score-head">
          <i className="ti ti-chart-donut" aria-hidden="true" />
          <h2 className="lighthouse-results__score-title">Lighthouse score summary</h2>
        </header>

        <div className="lighthouse-results__score-split">
          <div className="lighthouse-results__score-left">
            <ScoreGauge score={scores.totalScore} />
            <div className="lighthouse-results__score-copy">
              <p className="lighthouse-results__score-label">Total ESG score</p>
              <span
                className={`assessment-msme-summary__readiness assessment-msme-summary__readiness--${readinessKey}`}
              >
                {scores.readiness}
              </span>
              <p className="lighthouse-results__score-caption">
                Industry-weighted composite · out of 100
              </p>
              {sector && (
                <p className="lighthouse-results__score-weights">
                  Weights for {sector}: E {(scores.weights.e * 100).toFixed(0)}% · S{" "}
                  {(scores.weights.s * 100).toFixed(0)}% · G {(scores.weights.g * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>

          <div className="lighthouse-results__score-right">
            <h3 className="lighthouse-results__pillar-title">Pillar breakdown</h3>
            <PillarComparisonBars scores={scores} />
          </div>
        </div>
      </section>

      <section className="lighthouse-results__kpis card card--elevated">
        <header className="lighthouse-results__kpis-head">
          <div>
            <h3 className="lighthouse-results__kpis-title">KPI breakdown</h3>
            <p className="lighthouse-results__kpis-subtitle">
              Scores from 9 KPIs · 2 questions each · Likert scale 1–5
            </p>
          </div>
          <span className="lighthouse-results__kpis-badge">{scores.kpiScores.length} KPIs</span>
        </header>

        <LighthouseKpiBreakdown scores={scores} />
      </section>

      <p className="lighthouse-results__footnote">
        Only one Lighthouse submission is permitted per {clientId ? "client" : "organisation"}.
      </p>
    </div>
  );
}
