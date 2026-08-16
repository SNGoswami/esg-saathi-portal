"use client";

import { PILLAR_META, type PillarId } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";

const PILLARS: PillarId[] = ["E", "S", "G"];

export function LighthouseKpiBreakdown({
  scores,
  showAnswers = true,
  compact = false,
}: {
  scores: LighthouseScoreResult;
  showAnswers?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`lighthouse-results__kpi-columns${compact ? " lighthouse-results__kpi-columns--compact" : ""}`}
    >
      {PILLARS.map((pillar) => {
        const pillarKpis = scores.kpiScores.filter((k) => k.pillar === pillar);
        return (
          <section
            key={pillar}
            className="lighthouse-results__kpi-column"
            data-pillar={pillar}
            aria-label={`${PILLAR_META[pillar].label} KPIs`}
          >
            <header className="lighthouse-results__kpi-column-head">
              <span
                className={`lighthouse-results__pillar-badge lighthouse-results__pillar-badge--${pillar.toLowerCase()}`}
              >
                {pillar}
              </span>
              <h4 className="lighthouse-results__kpi-column-title">{PILLAR_META[pillar].label}</h4>
              <span className="lighthouse-results__kpi-column-score">
                {scores.pillarScores[pillar].toFixed(1)}
              </span>
            </header>

            <div className="lighthouse-results__kpi-column-list">
              {pillarKpis.map((k) => (
                <article key={k.kpiId} className="lighthouse-results__kpi-item">
                  <div className="lighthouse-results__kpi-item-top">
                    <span className="lighthouse-results__kpi-id">{k.kpiId}</span>
                    <span className="lighthouse-results__kpi-score">{k.score.toFixed(1)}</span>
                  </div>
                  <h4 className="lighthouse-results__kpi-label">{k.kpiLabel}</h4>
                  {showAnswers && (
                    <div className="lighthouse-results__kpi-answers">
                      <span className="lighthouse-results__kpi-answer">
                        <span className="lighthouse-results__kpi-answer-label">Q1</span>
                        {k.q1}
                      </span>
                      <span className="lighthouse-results__kpi-answer">
                        <span className="lighthouse-results__kpi-answer-label">Q2</span>
                        {k.q2}
                      </span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
