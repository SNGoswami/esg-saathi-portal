"use client";

import LighthouseReportVisuals from "@/modules/lighthouse/ui/LighthouseReportVisuals";
import type { PillarId } from "@/modules/lighthouse/domain/questionnaire";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import type { LighthouseAssessmentApi } from "@/modules/lighthouse/api/lighthouseApi";
import { scoresFromLighthouseApi } from "@/modules/lighthouse/api/lighthouseApi";

const PILLAR_SECTION_CLASS: Record<PillarId, string> = {
  E: "lighthouse-report-section--green",
  S: "lighthouse-report-section--blue",
  G: "lighthouse-report-section--orange",
};

const PILLAR_CARD_CLASS: Record<PillarId, string> = {
  E: "lighthouse-pillar-card--e",
  S: "lighthouse-pillar-card--s",
  G: "lighthouse-pillar-card--g",
};

function improvementAccent(priority?: string) {
  if (priority === "high") return "#dc2626";
  if (priority === "medium") return "#2563eb";
  return "#006c49";
}

function PillarReportCard({
  title,
  pillar,
  report,
}: {
  title: string;
  pillar: PillarId;
  report?: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    pillarScore?: number;
    kpiBreakdown?: Array<{ kpiId?: string; kpiLabel?: string; score?: number; insight?: string }>;
  };
}) {
  if (!report) return null;
  return (
    <div className={`card card--elevated lighthouse-pillar-card ${PILLAR_CARD_CLASS[pillar]}`}>
      <div className={`lighthouse-report-section ${PILLAR_SECTION_CLASS[pillar]}`}>
        <p className="lighthouse-insight-card__title" style={{ color: "var(--pillar-accent)" }}>
          {title}
          {report.pillarScore != null && (
            <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
              {" "}
              · {report.pillarScore.toFixed(1)} / 100
            </span>
          )}
        </p>
      </div>
      {report.summary && <p className="lighthouse-insight-card__body">{report.summary}</p>}
      {report.kpiBreakdown && report.kpiBreakdown.length > 0 && (
        <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: "none" }}>
          {report.kpiBreakdown.map((k) => (
            <li key={k.kpiId} className="lighthouse-pillar-kpi-item">
              <strong>
                {k.kpiId}: {k.kpiLabel}
              </strong>
              {k.score != null && (
                <span className="lighthouse-pillar-kpi-item__score">, {k.score.toFixed(1)}</span>
              )}
              {k.insight && <p className="lighthouse-pillar-kpi-item__insight">{k.insight}</p>}
            </li>
          ))}
        </ul>
      )}
      {report.strengths && report.strengths.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="lighthouse-pillar-mini-label">Strengths</p>
          <ul className="lighthouse-insight-list">
            {report.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {report.improvements && report.improvements.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="lighthouse-pillar-mini-label lighthouse-insight-card__title--improvement">
            Areas to improve
          </p>
          <ul className="lighthouse-insight-list">
            {report.improvements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function LighthouseReportDetail({
  report,
  scores: scoresProp,
}: {
  report: LighthouseAssessmentApi;
  scores?: LighthouseScoreResult | null;
}) {
  const scores = scoresProp ?? scoresFromLighthouseApi(report);
  const strengthReport = report.esgStrength;
  const improvementReport = report.esgScopeOfImprovement;

  return (
    <div className="dash-content report-detail-root">
      {scores && <LighthouseReportVisuals scores={scores} />}

      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
          }}
        >
          Narrative insights
        </p>

        {strengthReport?.overallSummary && (
          <div className="card card--elevated lighthouse-insight-card lighthouse-insight-card--strength">
            <div className="lighthouse-report-section lighthouse-report-section--green">
              <p className="lighthouse-insight-card__title lighthouse-insight-card__title--strength">
                ESG strengths
              </p>
            </div>
            <p className="lighthouse-insight-card__body">{strengthReport.overallSummary}</p>
            {strengthReport.strengths && strengthReport.strengths.length > 0 && (
              <ul className="lighthouse-insight-list">
                {strengthReport.strengths.map((item, i) => {
                  if (typeof item === "string") {
                    return <li key={item}>{item}</li>;
                  }
                  return (
                    <li key={`${item.title}-${i}`}>
                      <strong>{item.title}</strong>
                      {item.detail ? `, ${item.detail}` : ""}
                      {item.pillar ? ` (${item.pillar})` : ""}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {improvementReport?.overallSummary && (
          <div className="card card--elevated lighthouse-insight-card lighthouse-insight-card--improvement">
            <div className="lighthouse-report-section lighthouse-report-section--red">
              <p className="lighthouse-insight-card__title lighthouse-insight-card__title--improvement">
                Areas for improvement
              </p>
            </div>
            <p className="lighthouse-insight-card__body">{improvementReport.overallSummary}</p>
            {improvementReport.improvements && improvementReport.improvements.length > 0 && (
              <ul className="lighthouse-insight-list lighthouse-insight-list--plain">
                {improvementReport.improvements.map((item, i) => {
                  const accent = improvementAccent(item.priority);
                  return (
                    <li
                      key={`${item.title}-${i}`}
                      className="lighthouse-improvement-item"
                      style={{ ["--improvement-accent" as string]: accent }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{item.title}</span>
                      {item.priority && (
                        <span className="lighthouse-improvement-item__priority">{item.priority}</span>
                      )}
                      {item.detail && <p className="lighthouse-improvement-item__detail">{item.detail}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <PillarReportCard title="Environmental" pillar="E" report={report.env} />
        <PillarReportCard title="Social" pillar="S" report={report.social} />
        <PillarReportCard title="Governance" pillar="G" report={report.gov} />

        {report.createdAt && (
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Report generated {new Date(report.createdAt).toLocaleString()}.
          </p>
        )}
      </div>
    </div>
  );
}
