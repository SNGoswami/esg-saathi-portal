"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getIsfHistory } from "@/modules/isf-calculator/api/isfApi";
import type { IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import { getGovernanceHistory } from "@/modules/governance/api/governanceApi";
import { getStakeholderHrHistory } from "@/modules/stakeholder-hr/api/stakeholderHrApi";
import { getWorkforceHistory } from "@/modules/workforce/api/workforceApi";
import { scoresFromLighthouseApi } from "@/modules/lighthouse/api/lighthouseApi";
import type { LighthouseAssessmentApi } from "@/modules/lighthouse/api/lighthouseApi";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import { loadLighthouseReport } from "@/modules/lighthouse/domain/reportCache";
import { listNzeTargets } from "@/modules/net-zero/api/nzeApi";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import { getScope3History } from "@/modules/scope3-ghg/api/scope3Api";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import { overviewFiscalYear } from "@/modules/dashboard/overview/overviewContent";
import type { MsmeWidgetId } from "@/modules/dashboard/msme/msmeDashboardLayout";
import { buildMsmeActivity } from "@/modules/dashboard/msme/msmeExtras";
import { latestActivityTimestamp } from "@/modules/dashboard/professional/professionalPortfolioExtras";
import {
  latestIsoTimestamp,
  type WidgetSourceState,
} from "@/modules/dashboard/data/widgetFreshness";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";

const MSME_WIDGET_SOURCES: Record<MsmeWidgetId, Array<"lighthouse" | "reports" | "regulatory" | "activity"> | "static"> = {
  kpis: ["lighthouse", "reports"],
  "chart-pillars": ["lighthouse", "reports"],
  "chart-kpi-progress": ["lighthouse", "reports"],
  insights: ["lighthouse", "reports"],
  priorities: ["lighthouse", "reports"],
  "pillar-breakdown": ["lighthouse", "reports"],
  "pending-actions": ["lighthouse", "reports"],
  "ai-coach": ["lighthouse", "reports"],
  "recent-activity": ["activity"],
  "regulatory-deadlines": ["regulatory"],
  "quick-actions": "static",
};

type SourceKey = "lighthouse" | "reports" | "regulatory" | "activity";

function emptySource(): WidgetSourceState {
  return { fetchedAt: null, latestDataAt: null, refreshing: false };
}

export function useMsmeDashboardData() {
  const fy = overviewFiscalYear();
  const [scores, setScores] = useState<LighthouseScoreResult | null>(null);
  const [report, setReport] = useState<LighthouseAssessmentApi | null>(null);
  const [savedReports, setSavedReports] = useState(0);
  const [isfHistory, setIsfHistory] = useState<IsfHistoryItem[]>([]);
  const [scope3History, setScope3History] = useState<Scope3HistoryItem[]>([]);
  const [nzeTargets, setNzeTargets] = useState<NzeTargetResponse[]>([]);
  const [workforceHistory, setWorkforceHistory] = useState<WorkforceHistoryItem[]>([]);
  const [governanceHistory, setGovernanceHistory] = useState<DisclosureHistoryItem[]>([]);
  const [stakeholderHrHistory, setStakeholderHrHistory] = useState<DisclosureHistoryItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sourceState, setSourceState] = useState<Record<SourceKey, WidgetSourceState>>({
    lighthouse: emptySource(),
    reports: emptySource(),
    regulatory: emptySource(),
    activity: emptySource(),
  });

  const patchSource = useCallback((key: SourceKey, patch: Partial<WidgetSourceState>) => {
    setSourceState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const refreshLighthouse = useCallback(async (background = false) => {
    if (!background) patchSource("lighthouse", { refreshing: true });
    try {
      const data = await loadLighthouseReport({
        forceRefresh: true,
        onUpdate: (fresh) => {
          if (fresh) {
            setReport(fresh);
            setScores(scoresFromLighthouseApi(fresh));
          }
        },
      });
      setReport(data);
      setScores(data ? scoresFromLighthouseApi(data) : null);
      const latestDataAt = latestIsoTimestamp(data?.updatedAt, data?.createdAt);
      patchSource("lighthouse", {
        fetchedAt: Date.now(),
        latestDataAt,
        refreshing: false,
      });
    } catch {
      patchSource("lighthouse", { refreshing: false });
    }
  }, [patchSource]);

  const refreshReports = useCallback(async (background = false) => {
    if (!background) patchSource("reports", { refreshing: true });
    try {
      const [isf, scope3, nze, workforce, governance, stakeholderHr] = await Promise.all([
        getIsfHistory({ fiscalYear: fy }).catch(() => []),
        getScope3History(undefined, fy).catch(() => []),
        listNzeTargets().catch(() => []),
        getWorkforceHistory({ fiscalYear: fy }).catch(() => []),
        getGovernanceHistory({ fiscalYear: fy }).catch(() => []),
        getStakeholderHrHistory({ fiscalYear: fy }).catch(() => []),
      ]);
      setIsfHistory(isf);
      setScope3History(scope3);
      setNzeTargets(nze);
      setWorkforceHistory(workforce);
      setGovernanceHistory(governance);
      setStakeholderHrHistory(stakeholderHr);
      setSavedReports(
        isf.length + scope3.length + nze.length + workforce.length + governance.length + stakeholderHr.length,
      );
      const latestDataAt = latestIsoTimestamp(
        ...isf.map((r) => r.created_at),
        ...scope3.map((r) => r.updated_at),
        ...nze.map((r) => r.updated_at),
        ...workforce.map((r) => r.updated_at),
        ...governance.map((r) => r.updated_at),
        ...stakeholderHr.map((r) => r.updated_at),
      );
      patchSource("reports", {
        fetchedAt: Date.now(),
        latestDataAt,
        refreshing: false,
      });
    } catch {
      patchSource("reports", { refreshing: false });
    }
  }, [fy, patchSource]);

  const refreshActivity = useCallback(async (background = false) => {
    if (!background) patchSource("activity", { refreshing: true });
    try {
      await Promise.all([refreshLighthouse(background), refreshReports(background)]);
      patchSource("activity", { fetchedAt: Date.now(), refreshing: false });
    } catch {
      patchSource("activity", { refreshing: false });
    }
  }, [patchSource, refreshLighthouse, refreshReports]);

  const refreshRegulatory = useCallback(async () => {
    patchSource("regulatory", { refreshing: true });
    patchSource("regulatory", {
      fetchedAt: Date.now(),
      latestDataAt: Date.now(),
      refreshing: false,
    });
  }, [patchSource]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        refreshLighthouse(true),
        refreshReports(true),
        refreshRegulatory(),
      ]);
      if (!cancelled) {
        setInitialLoading(false);
        patchSource("activity", { fetchedAt: Date.now(), refreshing: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLighthouse, refreshReports, refreshRegulatory, patchSource]);

  const activityItems = useMemo(
    () =>
      initialLoading
        ? []
        : buildMsmeActivity({
            scores,
            assessmentUpdatedAt: report?.updatedAt ?? report?.createdAt,
            isfHistory,
            scope3History,
            nzeTargets,
            workforceHistory,
            governanceHistory,
            stakeholderHrHistory,
            fy,
          }),
    [
      initialLoading,
      scores,
      report,
      isfHistory,
      scope3History,
      nzeTargets,
      workforceHistory,
      governanceHistory,
      stakeholderHrHistory,
      fy,
    ],
  );

  const getWidgetSources = useCallback(
    (id: MsmeWidgetId): WidgetSourceState[] => {
      const keys = MSME_WIDGET_SOURCES[id];
      if (keys === "static") return [];
      return keys.map((k) => {
        if (k !== "activity") return sourceState[k];
        return {
          ...sourceState.activity,
          latestDataAt: initialLoading ? null : latestActivityTimestamp(activityItems),
        };
      });
    },
    [sourceState, initialLoading, activityItems],
  );

  const refreshWidget = useCallback(
    async (id: MsmeWidgetId) => {
      const keys = MSME_WIDGET_SOURCES[id];
      if (keys === "static") return;
      await Promise.all(
        keys.map((key) => {
          if (key === "lighthouse") return refreshLighthouse();
          if (key === "reports") return refreshReports();
          if (key === "activity") return refreshActivity();
          return refreshRegulatory();
        }),
      );
    },
    [refreshLighthouse, refreshReports, refreshActivity, refreshRegulatory],
  );

  const loading = useMemo(
    () => initialLoading || sourceState.lighthouse.fetchedAt == null || sourceState.reports.fetchedAt == null,
    [initialLoading, sourceState],
  );

  const activityLoading = sourceState.activity.fetchedAt == null;

  return {
    fy,
    scores,
    report,
    savedReports,
    isfHistory,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    loading,
    activityLoading,
    getWidgetSources,
    refreshWidget,
    isStaticWidget: (id: MsmeWidgetId) => MSME_WIDGET_SOURCES[id] === "static",
  };
}
