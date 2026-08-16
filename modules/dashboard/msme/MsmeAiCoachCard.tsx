"use client";

import type { MsmeAnalytics } from "@/modules/dashboard/msme/msmeAnalytics";

function estimateUplift(weakestScore: number): number {
  const target = 60;
  if (weakestScore >= target) return 4;
  return Math.min(15, Math.max(5, Math.round((target - weakestScore) * 0.25)));
}

export default function MsmeAiCoachCard({
  analytics,
  loading,
  onNavigate,
}: {
  analytics: MsmeAnalytics | null;
  loading: boolean;
  onNavigate?: (view: string) => void;
}) {
  const pillars = analytics?.pillarAvgs ?? [];
  const weakest = pillars.length ? [...pillars].sort((a, b) => a.score - b.score)[0] : null;
  const strongest = pillars.length ? [...pillars].sort((a, b) => b.score - a.score)[0] : null;
  const uplift = weakest ? estimateUplift(weakest.score) : null;
  const hasScores = analytics?.healthScore != null;

  return (
    <div className="msme-ai-coach">
      {loading && (
        <div className="msme-ai-coach__loading" aria-live="polite">
          <span className="msme-ai-coach__loading-dot" />
          <span className="msme-ai-coach__loading-dot" />
          <span className="msme-ai-coach__loading-dot" />
          <span>Building your plan…</span>
        </div>
      )}

      {!loading && !hasScores && (
        <div className="msme-ai-coach__empty">
          <p className="msme-ai-coach__empty-lead">
            Complete Lighthouse to unlock a personalised ESG improvement plan.
          </p>
          <ol className="msme-ai-coach__steps">
            <li>
              <span className="msme-ai-coach__step-num">1</span>
              <span>Run the questionnaire across E, S, and G pillars</span>
            </li>
            <li>
              <span className="msme-ai-coach__step-num">2</span>
              <span>See pillar scores and priority areas</span>
            </li>
            <li>
              <span className="msme-ai-coach__step-num">3</span>
              <span>Get AI guidance on disclosures and calculators</span>
            </li>
          </ol>
        </div>
      )}

      {!loading && hasScores && (
        <div className="msme-ai-coach__tips">
          {weakest && (
            <article className="msme-ai-coach__tip msme-ai-coach__tip--focus">
              <div className="msme-ai-coach__tip-head">
                <span className="msme-ai-coach__tip-label">
                  <i className="ti ti-target" aria-hidden="true" />
                  Focus area
                </span>
                {uplift != null && (
                  <span className="msme-ai-coach__uplift">+{uplift} pts potential</span>
                )}
              </div>
              <p className="msme-ai-coach__tip-text">
                Strengthen <strong>{weakest.pillar}</strong> (score {weakest.score}) for the
                fastest overall score gain.
              </p>
            </article>
          )}

          {strongest && strongest.score >= 55 && (
            <article className="msme-ai-coach__tip msme-ai-coach__tip--strength">
              <div className="msme-ai-coach__tip-head">
                <span className="msme-ai-coach__tip-label">
                  <i className="ti ti-trending-up" aria-hidden="true" />
                  Your strength
                </span>
              </div>
              <p className="msme-ai-coach__tip-text">
                <strong>{strongest.pillar}</strong> leads at {strongest.score} — document this
                for BRSR and lender packs.
              </p>
            </article>
          )}
        </div>
      )}

      {onNavigate && (
        <div className="msme-ai-coach__footer">
          <button
            type="button"
            className="msme-ai-coach__cta"
            onClick={() => onNavigate("ai-advisor")}
          >
            <i className="ti ti-sparkles" aria-hidden="true" />
            Open AI Advisor
            <i className="ti ti-arrow-right msme-ai-coach__cta-arrow" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
