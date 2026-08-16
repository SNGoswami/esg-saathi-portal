"use client";

import { useCallback, useEffect, useState } from "react";
import { listBrsrAssessments, type BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import { getIsfClientStatus, getIsfHistory } from "@/modules/isf-calculator/api/isfApi";
import type { IsfClientStatus, IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import {
  readMsmeAssessmentSummaryCache,
  readProAssessmentSummaryCache,
  writeMsmeAssessmentSummaryCache,
  writeProAssessmentSummaryCache,
  type MsmeAssessmentSummaryCache,
  type ProAssessmentSummaryCache,
} from "@/modules/lighthouse/api/assessmentSummaryCache";
import { scoresFromLighthouseApi } from "@/modules/lighthouse/api/lighthouseApi";
import type { LighthouseAssessmentApi } from "@/modules/lighthouse/api/lighthouseApi";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import { loadLighthouseReport, readLighthouseReportCache } from "@/modules/lighthouse/domain/reportCache";
import { readLighthouseAssessment } from "@/modules/lighthouse/domain/storage";
import { listNzeTargets } from "@/modules/net-zero/api/nzeApi";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import {
  overviewFiscalYear,
  roleHasClients,
} from "@/modules/dashboard/overview/overviewContent";
import type { RoleKey } from "@/modules/platform/rbac/roles";
import { getScope3History } from "@/modules/scope3-ghg/api/scope3Api";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import { getGovernanceClientStatus, getGovernanceHistory } from "@/modules/governance/api/governanceApi";
import { getStakeholderHrClientStatus, getStakeholderHrHistory } from "@/modules/stakeholder-hr/api/stakeholderHrApi";
import { getWorkforceClientStatus, getWorkforceHistory } from "@/modules/workforce/api/workforceApi";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";

function seedMsmeSummaryCache(): MsmeAssessmentSummaryCache | null {
  const cached = readMsmeAssessmentSummaryCache();
  if (cached) return cached;

  const report = readLighthouseReportCache(null);
  if (report) {
    return {
      scores: scoresFromLighthouseApi(report),
      reportCreatedAt: report.createdAt,
      reportUpdatedAt: report.updatedAt ?? null,
    };
  }

  const saved = readLighthouseAssessment(null);
  if (saved?.status === "completed" && saved.scores) {
    return {
      scores: saved.scores,
      reportCreatedAt: saved.completedAt ?? null,
      reportUpdatedAt: null,
    };
  }

  return null;
}

function toMsmeCache(
  report: LighthouseAssessmentApi | null,
  scores: LighthouseScoreResult | null,
): MsmeAssessmentSummaryCache {
  return {
    scores,
    reportCreatedAt: report?.createdAt ?? null,
    reportUpdatedAt: report?.updatedAt ?? null,
  };
}

function roleHasBrsr(role: RoleKey) {
  return role === "ca" || role === "cs" || role === "esg_consultant" || role === "assurer_auditor";
}

function readInitialMsmeSummary() {
  if (typeof window === "undefined") {
    return { seed: null as MsmeAssessmentSummaryCache | null, loading: true };
  }
  const seed = seedMsmeSummaryCache();
  return { seed, loading: seed == null };
}

const INITIAL_MSME_SUMMARY = readInitialMsmeSummary();

export function useMsmeAssessmentSummaryData() {
  const [scores, setScores] = useState<LighthouseScoreResult | null>(
    () => INITIAL_MSME_SUMMARY.seed?.scores ?? null,
  );
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(
    () => INITIAL_MSME_SUMMARY.seed?.reportCreatedAt ?? null,
  );
  const [reportUpdatedAt, setReportUpdatedAt] = useState<string | null>(
    () => INITIAL_MSME_SUMMARY.seed?.reportUpdatedAt ?? null,
  );
  const [loading, setLoading] = useState(() => INITIAL_MSME_SUMMARY.loading);

  const applyReport = useCallback((report: LighthouseAssessmentApi | null) => {
    const nextScores = report ? scoresFromLighthouseApi(report) : null;
    setScores(nextScores);
    setReportCreatedAt(report?.createdAt ?? null);
    setReportUpdatedAt(report?.updatedAt ?? null);
    writeMsmeAssessmentSummaryCache(toMsmeCache(report, nextScores));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hadCache = seedMsmeSummaryCache() != null;

    void loadLighthouseReport({
      forceRefresh: !hadCache,
      onUpdate: (fresh) => {
        if (!cancelled && fresh) applyReport(fresh);
      },
    })
      .then((report) => {
        if (!cancelled) applyReport(report);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyReport]);

  return {
    scores,
    reportCreatedAt,
    reportUpdatedAt,
    loading,
  };
}

function readInitialProSummary(role: RoleKey, fy: string) {
  if (typeof window === "undefined") {
    return { cached: null as ProAssessmentSummaryCache | null, loading: true };
  }
  const cached = readProAssessmentSummaryCache(role, fy);
  return { cached, loading: cached == null };
}

export function useProfessionalAssessmentSummaryData(role: RoleKey) {
  const fy = overviewFiscalYear();
  const showClients = roleHasClients(role);
  const hasBrsr = roleHasBrsr(role);
  const initial = readInitialProSummary(role, fy);

  const [clients, setClients] = useState<Client[]>(initial.cached?.clients ?? []);
  const [brsrList, setBrsrList] = useState<BrsrAssessment[]>(initial.cached?.brsrList ?? []);
  const [isfStatus, setIsfStatus] = useState<IsfClientStatus[]>(initial.cached?.isfStatus ?? []);
  const [isfHistory, setIsfHistory] = useState<IsfHistoryItem[]>(initial.cached?.isfHistory ?? []);
  const [scope3History, setScope3History] = useState<Scope3HistoryItem[]>(
    initial.cached?.scope3History ?? [],
  );
  const [nzeTargets, setNzeTargets] = useState<NzeTargetResponse[]>(initial.cached?.nzeTargets ?? []);
  const [workforceHistory, setWorkforceHistory] = useState<WorkforceHistoryItem[]>(
    initial.cached?.workforceHistory ?? [],
  );
  const [governanceHistory, setGovernanceHistory] = useState<DisclosureHistoryItem[]>(
    initial.cached?.governanceHistory ?? [],
  );
  const [stakeholderHrHistory, setStakeholderHrHistory] = useState<DisclosureHistoryItem[]>(
    initial.cached?.stakeholderHrHistory ?? [],
  );
  const [workforceStatus, setWorkforceStatus] = useState<ProAssessmentSummaryCache["workforceStatus"]>(
    initial.cached?.workforceStatus ?? [],
  );
  const [governanceStatus, setGovernanceStatus] = useState<ProAssessmentSummaryCache["governanceStatus"]>(
    initial.cached?.governanceStatus ?? [],
  );
  const [stakeholderHrStatus, setStakeholderHrStatus] = useState<
    ProAssessmentSummaryCache["stakeholderHrStatus"]
  >(initial.cached?.stakeholderHrStatus ?? []);
  const [loading, setLoading] = useState(initial.loading);

  const persist = useCallback(
    (next: Omit<ProAssessmentSummaryCache, "fy">) => {
      writeProAssessmentSummaryCache(role, { fy, ...next });
    },
    [fy, role],
  );

  const load = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!options?.skipCache) {
        const hit = readProAssessmentSummaryCache(role, fy);
        if (hit) {
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      try {
        const [clientRes, brsrRows, isf, scope3, nze, workforce, governance, stakeholderHr, isfRows] =
          await Promise.all([
            showClients
              ? listClients(0, 100).catch(() => ({ content: [] as Client[] }))
              : Promise.resolve({ content: [] as Client[] }),
            hasBrsr
              ? listBrsrAssessments().catch(() => [] as BrsrAssessment[])
              : Promise.resolve([] as BrsrAssessment[]),
            getIsfClientStatus(fy).catch(() => [] as IsfClientStatus[]),
            getScope3History(undefined, fy).catch(() => [] as Scope3HistoryItem[]),
            listNzeTargets().catch(() => [] as NzeTargetResponse[]),
            getWorkforceHistory({ fiscalYear: fy }).catch(() => [] as WorkforceHistoryItem[]),
            getGovernanceHistory({ fiscalYear: fy }).catch(() => [] as DisclosureHistoryItem[]),
            getStakeholderHrHistory({ fiscalYear: fy }).catch(() => [] as DisclosureHistoryItem[]),
            getIsfHistory({ fiscalYear: fy }).catch(() => [] as IsfHistoryItem[]),
          ]);

        let nextWorkforceStatus: ProAssessmentSummaryCache["workforceStatus"] = [];
        let nextGovernanceStatus: ProAssessmentSummaryCache["governanceStatus"] = [];
        let nextStakeholderHrStatus: ProAssessmentSummaryCache["stakeholderHrStatus"] = [];

        if (showClients) {
          [nextWorkforceStatus, nextGovernanceStatus, nextStakeholderHrStatus] = await Promise.all([
            getWorkforceClientStatus(fy).catch(() => []),
            getGovernanceClientStatus(fy).catch(() => []),
            getStakeholderHrClientStatus(fy).catch(() => []),
          ]);
        }

        const nextClients = clientRes.content;
        setClients(nextClients);
        setBrsrList(brsrRows);
        setIsfStatus(isf);
        setIsfHistory(isfRows);
        setScope3History(scope3);
        setNzeTargets(nze);
        setWorkforceHistory(workforce);
        setGovernanceHistory(governance);
        setStakeholderHrHistory(stakeholderHr);
        setWorkforceStatus(nextWorkforceStatus);
        setGovernanceStatus(nextGovernanceStatus);
        setStakeholderHrStatus(nextStakeholderHrStatus);

        persist({
          clients: nextClients,
          brsrList: brsrRows,
          isfStatus: isf,
          isfHistory: isfRows,
          scope3History: scope3,
          nzeTargets: nze,
          workforceHistory: workforce,
          governanceHistory: governance,
          stakeholderHrHistory: stakeholderHr,
          workforceStatus: nextWorkforceStatus,
          governanceStatus: nextGovernanceStatus,
          stakeholderHrStatus: nextStakeholderHrStatus,
        });
      } finally {
        setLoading(false);
      }
    },
    [fy, hasBrsr, persist, role, showClients],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    fy,
    showClients,
    hasBrsr,
    clients,
    brsrList,
    isfStatus,
    isfHistory,
    scope3History,
    nzeTargets,
    workforceHistory,
    governanceHistory,
    stakeholderHrHistory,
    workforceStatus,
    governanceStatus,
    stakeholderHrStatus,
    loading,
  };
}
