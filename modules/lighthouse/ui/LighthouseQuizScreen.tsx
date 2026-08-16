"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  LIGHTHOUSE_KPIS,
  TOTAL_QUESTIONS,
  type LighthouseQuestion,
  type PillarId,
} from "@/modules/lighthouse/domain/questionnaire";
import { INDUSTRIES } from "@/modules/auth-ui/constants/industries";

export function firstIncompleteKpiIndex(answers: Record<string, number>): number {
  for (let i = 0; i < LIGHTHOUSE_KPIS.length; i++) {
    const kpi = LIGHTHOUSE_KPIS[i];
    if (answers[kpi.questions[0].id] == null || answers[kpi.questions[1].id] == null) {
      return i;
    }
  }
  return LIGHTHOUSE_KPIS.length - 1;
}

function scrollQuizToTop() {
  document.querySelector<HTMLElement>(".dash-main")?.scrollTo({ top: 0, behavior: "smooth" });
}

function PillarProgressBar({
  pillarProgress,
}: {
  pillarProgress: Record<PillarId, { answered: number; total: number }>;
}) {
  const pillars: PillarId[] = ["E", "S", "G"];

  return (
    <div className="lighthouse-quiz__pillar-progress">
      {pillars.map((p, i) => {
        const { answered, total } = pillarProgress[p];
        const complete = answered === total && total > 0;
        return (
          <div
            key={p}
            data-pillar={p}
            className={`lighthouse-quiz__pillar-progress-col${i > 0 ? " lighthouse-quiz__pillar-progress-col--border" : ""}`}
          >
            <div className="lighthouse-quiz__pillar-progress-head">
              <span className="lighthouse-quiz__pillar-progress-label">{p}</span>
              <span className="lighthouse-quiz__pillar-progress-count">
                {answered}/{total}
              </span>
            </div>
            <div className="lighthouse-quiz__pillar-progress-segs">
              {Array.from({ length: total }, (_, seg) => (
                <span
                  key={seg}
                  className={`lighthouse-quiz__pillar-progress-seg${
                    seg < answered ? " lighthouse-quiz__pillar-progress-seg--filled" : ""
                  }`}
                />
              ))}
            </div>
            {complete && (
              <p className="lighthouse-quiz__pillar-progress-done">
                <i className="ti ti-check" aria-hidden="true" />
                Complete
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LikertQuestion({
  index,
  question,
  value,
  onChange,
  innerRef,
}: {
  index: number;
  question: LighthouseQuestion;
  value?: number;
  onChange: (v: number) => void;
  innerRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={innerRef}
      className={`lighthouse-quiz__question card card--elevated${
        value != null ? " lighthouse-quiz__question--answered" : ""
      }`}
    >
      <div className="lighthouse-quiz__question-head">
        <span className="lighthouse-quiz__question-index">Question {index}</span>
        {value != null && (
          <span className="lighthouse-quiz__question-done">
            <i className="ti ti-check" aria-hidden="true" />
            Answered
          </span>
        )}
      </div>
      <p className="lighthouse-quiz__question-text">{question.text}</p>
      <div className="lighthouse-quiz__likert" role="radiogroup" aria-label={question.text}>
        {question.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`lighthouse-quiz__likert-option${selected ? " lighthouse-quiz__likert-option--selected" : ""}`}
              onClick={() => onChange(opt.value)}
            >
              <span className="lighthouse-quiz__likert-score">{opt.value}</span>
              <span className="lighthouse-quiz__likert-label">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LighthouseQuizScreen({
  kpiIndex,
  onKpiIndexChange,
  answers,
  onAnswer,
  sector,
  onSectorChange,
  answeredCount,
  progressPct,
  pillarProgress,
  onBack,
  onSubmit,
  submitting,
  canProceedKpi,
  isLastKpi,
}: {
  kpiIndex: number;
  onKpiIndexChange: (index: number) => void;
  answers: Record<string, number>;
  onAnswer: (questionId: string, value: number) => void;
  sector: string;
  onSectorChange: (sector: string) => void;
  answeredCount: number;
  progressPct: number;
  pillarProgress: Record<PillarId, { answered: number; total: number }>;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canProceedKpi: boolean;
  isLastKpi: boolean;
}) {
  const currentKpi = LIGHTHOUSE_KPIS[kpiIndex];
  const panelRef = useRef<HTMLDivElement>(null);
  const q2Ref = useRef<HTMLDivElement>(null);
  const prevKpiRef = useRef(kpiIndex);

  useEffect(() => {
    if (prevKpiRef.current === kpiIndex) return;
    prevKpiRef.current = kpiIndex;
    scrollQuizToTop();
  }, [kpiIndex]);

  useEffect(() => {
    if (!currentKpi) return;
    const q1 = answers[currentKpi.questions[0].id];
    const q2 = answers[currentKpi.questions[1].id];
    if (q1 != null && q2 == null) {
      requestAnimationFrame(() => {
        q2Ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [answers, currentKpi]);

  if (!currentKpi) return null;

  const q1Id = currentKpi.questions[0].id;
  const q2Id = currentKpi.questions[1].id;

  function goPrev() {
    if (kpiIndex > 0) onKpiIndexChange(kpiIndex - 1);
  }

  function goNext() {
    if (!canProceedKpi || isLastKpi) return;
    onKpiIndexChange(kpiIndex + 1);
  }

  return (
    <div className="lighthouse-quiz">
      <div className="lighthouse-quiz__toolbar">
        <button type="button" className="calc-back-btn" onClick={onBack}>
          ← Back to list
        </button>
        <span className="lighthouse-quiz__save-hint">
          <i className="ti ti-device-floppy" aria-hidden="true" />
          Progress saved automatically
        </span>
      </div>

      <header
        className="lighthouse-quiz__header card card--elevated"
        data-pillar={currentKpi.pillar}
      >
        <div className="lighthouse-quiz__header-row">
          <div className="lighthouse-quiz__header-copy">
            <p className="lighthouse-quiz__header-eyebrow">
              {currentKpi.pillarLabel} · KPI {currentKpi.id}
            </p>
            <p className="lighthouse-quiz__header-title">{currentKpi.label}</p>
          </div>
          <span className="lighthouse-quiz__header-stats">
            {kpiIndex + 1} / {LIGHTHOUSE_KPIS.length} KPIs · {answeredCount}/{TOTAL_QUESTIONS} answered
          </span>
        </div>
        <div
          className="lighthouse-quiz__header-bar"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall assessment progress"
        >
          <div className="lighthouse-quiz__header-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <PillarProgressBar pillarProgress={pillarProgress} />
      </header>

      <div ref={panelRef} className="lighthouse-quiz__panel" key={currentKpi.id}>
        {!sector && kpiIndex === 0 && (
          <div className="lighthouse-quiz__industry card card--elevated">
            <div className="lighthouse-quiz__industry-head">
              <span className="lighthouse-quiz__industry-icon" aria-hidden="true">
                <i className="ti ti-building-factory-2" />
              </span>
              <div>
                <label className="lighthouse-quiz__industry-label" htmlFor="lighthouse-industry">
                  Industry sector
                </label>
                <p className="lighthouse-quiz__industry-hint">
                  Used for E, S, and G pillar weighting. Optional — default weights apply if skipped.
                </p>
              </div>
            </div>
            <select
              id="lighthouse-industry"
              className="dash-input"
              value={sector}
              onChange={(e) => onSectorChange(e.target.value)}
            >
              <option value="">Select industry (optional)</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        )}

        <LikertQuestion
          index={1}
          question={currentKpi.questions[0]}
          value={answers[q1Id]}
          onChange={(v) => onAnswer(q1Id, v)}
        />
        <LikertQuestion
          index={2}
          question={currentKpi.questions[1]}
          value={answers[q2Id]}
          onChange={(v) => onAnswer(q2Id, v)}
          innerRef={q2Ref}
        />
      </div>

      <footer className="lighthouse-quiz__footer">
        <div className="lighthouse-quiz__footer-inner card card--elevated">
          <button
            type="button"
            className="btn-ghost lighthouse-quiz__nav-btn"
            disabled={kpiIndex === 0}
            onClick={goPrev}
          >
            <i className="ti ti-chevron-left" aria-hidden="true" />
            Previous
          </button>

          <p className="lighthouse-quiz__footer-status">
            {answeredCount} of {TOTAL_QUESTIONS} questions answered
          </p>

          {!isLastKpi ? (
            <button
              type="button"
              className={`btn-primary lighthouse-quiz__nav-btn${
                canProceedKpi ? " lighthouse-quiz__nav-btn--ready" : ""
              }`}
              disabled={!canProceedKpi}
              onClick={goNext}
            >
              Next KPI
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className={`btn-primary lighthouse-quiz__nav-btn${
                canProceedKpi && answeredCount >= TOTAL_QUESTIONS ? " lighthouse-quiz__nav-btn--ready" : ""
              }`}
              disabled={answeredCount < TOTAL_QUESTIONS || !canProceedKpi || submitting}
              onClick={onSubmit}
            >
              {submitting ? "Submitting…" : "Submit & view scores"}
              {!submitting && <i className="ti ti-check" aria-hidden="true" />}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
