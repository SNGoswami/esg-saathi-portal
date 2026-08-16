"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LIGHTHOUSE_KPIS,
  TOTAL_QUESTIONS,
  countAnswered,
  countAnsweredByPillar,
} from "@/modules/lighthouse/domain/questionnaire";
import { computeLighthouseScores, type LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import {
  readLighthouseAssessment,
  readMsmeSectorFromProfileCache,
  writeLighthouseAssessment,
  type LighthouseAssessmentRecord,
} from "@/modules/lighthouse/domain/storage";
import { writeMsmeAssessmentSummaryCache } from "@/modules/lighthouse/api/assessmentSummaryCache";
import { scoresFromLighthouseApi, submitLighthouseAssessment } from "@/modules/lighthouse/api/lighthouseApi";
import { loadLighthouseReport, readLighthouseReportCache } from "@/modules/lighthouse/domain/reportCache";
import LighthouseQuizScreen, { firstIncompleteKpiIndex } from "@/modules/lighthouse/ui/LighthouseQuizScreen";
import LighthouseResultsScreen from "@/modules/lighthouse/ui/LighthouseResultsScreen";

type Screen = "quiz" | "results";

function scrollDashboardMainToTop(behavior: ScrollBehavior = "smooth") {
  document.querySelector<HTMLElement>(".dash-main")?.scrollTo({ top: 0, behavior });
}

function AssessmentShell({
  embedded,
  children,
}: {
  embedded?: boolean;
  children: ReactNode;
}) {
  if (embedded) {
    return <div className="lighthouse-assessment">{children}</div>;
  }
  return <div className="dash-content">{children}</div>;
}

export default function LighthouseAssessmentView({
  embedded,
  listEntry,
  clientId = null,
  clientSector,
  onBackToList,
  onOpenReport,
  onAssessmentCompleted,
}: {
  embedded?: boolean;
  listEntry: "scores" | "quiz";
  clientId?: string | null;
  clientSector?: string;
  onBackToList: () => void;
  onOpenReport?: () => void;
  onAssessmentCompleted?: () => void;
}) {
  const confirm = useConfirm();
  const [screen, setScreen] = useState<Screen>("quiz");
  const [sector, setSector] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [kpiIndex, setKpiIndex] = useState(0);
  const quizResumeAppliedRef = useRef(false);
  const [scores, setScores] = useState<LighthouseScoreResult | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useToastOnValue(submitError, "error");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fromProfile = clientSector ?? readMsmeSectorFromProfileCache();

    const saved = readLighthouseAssessment(clientId);

    if (saved) {
      setAnswers(saved.answers);
      if (saved.sector) setSector(saved.sector);
      else if (fromProfile) setSector(fromProfile);
      if (saved.status === "completed" && saved.scores) {
        setScores(saved.scores);
        setIsLocked(true);
      }
    } else if (fromProfile) {
      setSector(fromProfile);
    }

    const cachedReport = readLighthouseReportCache(clientId);
    if (cachedReport) {
      setIsLocked(true);
      const fromApi = scoresFromLighthouseApi(cachedReport);
      if (fromApi) {
        setScores(fromApi);
        if (!saved?.scores) {
          const completed: LighthouseAssessmentRecord = {
            status: "completed",
            answers: saved?.answers ?? {},
            sector: saved?.sector ?? fromProfile,
            completedAt: cachedReport.createdAt,
            scores: fromApi,
          };
          writeLighthouseAssessment(completed, clientId);
        }
      }
    }

    setSyncing(true);
    void loadLighthouseReport({
      clientId,
      onUpdate: (apiReport) => {
        if (cancelled || !apiReport) return;
        setIsLocked(true);
        const fromApi = scoresFromLighthouseApi(apiReport);
        if (fromApi) {
          setScores(fromApi);
          writeLighthouseAssessment(
            {
              status: "completed",
              answers: saved?.answers ?? {},
              sector: saved?.sector ?? fromProfile,
              completedAt: apiReport.createdAt,
              scores: fromApi,
            },
            clientId,
          );
        }
      },
    })
      .then((apiReport) => {
        if (cancelled) return;
        if (!apiReport) {
          if (!cachedReport) setIsLocked(saved?.status === "completed");
          return;
        }
        setIsLocked(true);
        const fromApi = scoresFromLighthouseApi(apiReport);
        if (fromApi) {
          setScores(fromApi);
          writeLighthouseAssessment(
            {
              status: "completed",
              answers: saved?.answers ?? {},
              sector: saved?.sector ?? fromProfile,
              completedAt: apiReport.createdAt,
              scores: fromApi,
            },
            clientId,
          );
        }
      })
      .catch(() => {
        if (!cancelled && !cachedReport) setIsLocked(saved?.status === "completed");
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, clientSector]);

  useEffect(() => {
    quizResumeAppliedRef.current = false;
  }, [clientId]);

  useEffect(() => {
    if (listEntry === "scores" && scores) {
      setScreen("results");
    }
  }, [listEntry, scores]);

  useEffect(() => {
    if (listEntry !== "quiz" || syncing) return;
    if (isLocked && scores) {
      setScreen("results");
      return;
    }
    if (!isLocked) {
      if (!quizResumeAppliedRef.current) {
        setKpiIndex(firstIncompleteKpiIndex(answers));
        quizResumeAppliedRef.current = true;
      }
      setScreen("quiz");
    }
  }, [listEntry, isLocked, syncing, scores, answers]);

  const answeredCount = useMemo(() => countAnswered(answers), [answers]);
  const pillarProgress = useMemo(() => countAnsweredByPillar(answers), [answers]);
  const progressPct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const currentKpi = LIGHTHOUSE_KPIS[kpiIndex];

  const persistDraft = useCallback(
    (nextAnswers: Record<string, number>, nextSector: string) => {
      const draft: LighthouseAssessmentRecord = {
        status: "draft",
        answers: nextAnswers,
        sector: nextSector || undefined,
      };
      writeLighthouseAssessment(draft, clientId);
    },
    [clientId],
  );

  function setAnswer(questionId: string, value: number) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    persistDraft(next, sector);
  }

  async function submitAssessment() {
    const q1 = answers[currentKpi.questions[0].id];
    const q2 = answers[currentKpi.questions[1].id];
    if (q1 == null || q2 == null) return;
    if (answeredCount < TOTAL_QUESTIONS) return;
    if (submitting || isLocked) return;

    const ok = await confirm({
      title: "Submit assessment?",
      description:
        "Your answers will be scored and saved. You will not be able to edit this assessment afterward.",
      confirmLabel: "Submit & view scores",
    });
    if (!ok) return;

    setSubmitError("");
    setSubmitting(true);

    try {
      const result = computeLighthouseScores(answers, sector || undefined);
      const apiReport = await submitLighthouseAssessment({
        clientId: clientId ?? undefined,
        answers,
        sector: sector || undefined,
      });
      const mergedScores = scoresFromLighthouseApi(apiReport) ?? result;
      const completed: LighthouseAssessmentRecord = {
        status: "completed",
        answers,
        sector: sector || undefined,
        completedAt: new Date().toISOString(),
        scores: mergedScores,
      };
      writeLighthouseAssessment(completed, clientId);
      if (clientId == null) {
        writeMsmeAssessmentSummaryCache({
          scores: mergedScores,
          reportCreatedAt: apiReport.createdAt,
          reportUpdatedAt: apiReport.updatedAt ?? null,
        });
      }
      setIsLocked(true);
      setScores(mergedScores);
      setScreen("results");
      onAssessmentCompleted?.();
      requestAnimationFrame(() => scrollDashboardMainToTop());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit assessment");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceedKpi = currentKpi
    ? answers[currentKpi.questions[0].id] != null && answers[currentKpi.questions[1].id] != null
    : false;

  if (screen === "results" && scores) {
    return (
      <LighthouseResultsScreen
        embedded={embedded}
        clientId={clientId}
        scores={scores}
        sector={sector}
        onBack={onBackToList}
        onOpenReport={onOpenReport}
      />
    );
  }

  if (listEntry === "scores" && syncing) {
    return (
      <AssessmentShell embedded={embedded}>
        <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
          Loading scores…
        </p>
      </AssessmentShell>
    );
  }

  if (listEntry === "quiz" && syncing && screen !== "quiz") {
    return (
      <AssessmentShell embedded={embedded}>
        <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
          Loading assessment…
        </p>
      </AssessmentShell>
    );
  }

  if (screen === "quiz" && currentKpi && !isLocked) {
    return (
      <div className={embedded ? "lighthouse-assessment" : "dash-content"}>
        <LighthouseQuizScreen
          kpiIndex={kpiIndex}
          onKpiIndexChange={setKpiIndex}
          answers={answers}
          onAnswer={setAnswer}
          sector={sector}
          onSectorChange={(value) => {
            setSector(value);
            persistDraft(answers, value);
          }}
          answeredCount={answeredCount}
          progressPct={progressPct}
          pillarProgress={pillarProgress}
          onBack={() => {
            onBackToList();
            requestAnimationFrame(() => scrollDashboardMainToTop());
          }}
          onSubmit={() => void submitAssessment()}
          submitting={submitting}
          canProceedKpi={canProceedKpi}
          isLastKpi={kpiIndex === LIGHTHOUSE_KPIS.length - 1}
        />
      </div>
    );
  }

  if (listEntry === "quiz" && !isLocked && screen !== "quiz") {
    return (
      <AssessmentShell embedded={embedded}>
        <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
          Loading assessment…
        </p>
      </AssessmentShell>
    );
  }

  return (
    <AssessmentShell embedded={embedded}>
      <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
        {listEntry === "scores" ? "Could not load scores." : "Could not open assessment."}
      </p>
      <button type="button" className="calc-back-btn" onClick={onBackToList}>
        ← Back to list
      </button>
    </AssessmentShell>
  );
}
