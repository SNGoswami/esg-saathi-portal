"use client";

import type { PillarId } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";

export function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const dash = `${clamped}, 100`;

  return (
    <div className="assessment-msme-summary__gauge" aria-hidden="true">
      <svg viewBox="0 0 42 42" className="assessment-msme-summary__gauge-svg">
        <circle
          className="assessment-msme-summary__gauge-track"
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          strokeWidth="3"
        />
        <circle
          className="assessment-msme-summary__gauge-fill"
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          strokeWidth="3"
          strokeDasharray={dash}
          strokeDashoffset="25"
          pathLength="100"
        />
      </svg>
      <div className="assessment-msme-summary__gauge-center">
        <span className="assessment-msme-summary__gauge-value">{score.toFixed(1)}</span>
        <span className="assessment-msme-summary__gauge-unit">/ 100</span>
      </div>
    </div>
  );
}

export function PillarComparisonBars({ scores }: { scores: LighthouseScoreResult }) {
  const pillars: PillarId[] = ["E", "S", "G"];

  return (
    <div className="assessment-msme-summary__pillar-bars">
      {pillars.map((pillar) => {
        const value = scores.pillarScores[pillar];
        const weight = scores.weights[pillar === "E" ? "e" : pillar === "S" ? "s" : "g"];
        return (
          <div key={pillar} className="assessment-msme-summary__pillar-bar-row">
            <div className="assessment-msme-summary__pillar-bar-head">
              <span className={`assessment-msme-summary__pillar-bar-label assessment-msme-summary__pillar-bar-label--${pillar.toLowerCase()}`}>
                {pillar === "E" ? "Environmental" : pillar === "S" ? "Social" : "Governance"}
              </span>
              <span className="assessment-msme-summary__pillar-bar-meta">
                {Math.round(value)} · {Math.round(weight * 100)}% weight
              </span>
            </div>
            <div className="assessment-msme-summary__pillar-bar-track">
              <div
                className={`assessment-msme-summary__pillar-bar-fill assessment-msme-summary__pillar-bar-fill--${pillar.toLowerCase()}`}
                style={{ width: `${Math.min(100, value)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
