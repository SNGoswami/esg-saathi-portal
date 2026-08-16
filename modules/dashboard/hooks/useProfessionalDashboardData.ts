"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listBrsrAssessments, type BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import { getIsfClientStatus, getIsfHistory } from "@/modules/isf-calculator/api/isfApi";
import type { IsfClientStatus } from "@/modules/isf-calculator/domain/types";
import type { IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import { listLighthouseAssessments, type LighthouseAssessmentSummary } from "@/modules/lighthouse/api/lighthouseApi";
import {
  latestActivityTimestamp,
  buildRecentActivity,
} from "@/modules/dashboard/professional/professionalPortfolioExtras";
import { listNzeTargets } from "@/modules/net-zero/api/nzeApi";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import { getScope3History } from "@/modules/scope3-ghg/api/scope3Api";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import { getGovernanceClientStatus, getGovernanceHistory } from "@/modules/governance/api/governanceApi";
import { getStakeholderHrClientStatus, getStakeholderHrHistory } from "@/modules/stakeholder-hr/api/stakeholderHrApi";
import { getWorkforceClientStatus, getWorkforceHistory } from "@/modules/workforce/api/workforceApi";
import {
  overviewFiscalYear,
  roleHasClients,
} from "@/modules/dashboard/overview/overviewContent";
import type { ProWidgetId } from "@/modules/dashboard/professional/professionalDashboardLayout";
import {
  latestIsoTimestamp,
  type WidgetSourceState,
} from "@/modules/dashboard/data/widgetFreshness";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";
import type { RoleKey } from "@/modules/platform/rbac/roles";

type SourceKey = "clients" | "brsr" | "calculators" | "regulatory" | "activity";

const PRO_WIDGET_SOURCES: Record<ProWidgetId, Array<SourceKey> | "static"> = {
  kpis: ["clients", "brsr", "calculators"],
  "chart-brsr": ["brsr"],
  "chart-pillars": ["brsr"],
  "chart-sector": ["clients"],
  "chart-coverage": ["calculators"],
  insights: ["clients", "brsr", "calculators"],
  priorities: ["clients", "brsr", "calculators"],
  "recent-clients": ["clients"],
  "recent-activity": ["activity"],
  "regulatory-deadlines": ["regulatory"],
  "quick-actions": "static",
};

function emptySource(): WidgetSourceState {
  return { fetchedAt: null, latestDataAt: null, refreshing: false };
}

function roleHasBrsr(role: RoleKey) {
  return role === "ca" || role === "cs" || role === "esg_consultant" || role === "assurer_auditor";
}

export function useProfessionalDashboardData(role: RoleKey) {
  const fy = overviewFiscalYear();
  const showClients = roleHasClients(role);
  const hasBrsr = roleHasBrsr(role);

  const [clients, setClients] = useState<Client[]>([]);
  const [brsrList, setBrsrList] = useState<BrsrAssessment[]>([]);
  const [lighthouseList, setLighthouseList] = useState<LighthouseAssessmentSummary[]>([]);
  const [isfStatus, setIsfStatus] = useState<IsfClientStatus[]>([]);
  const [isfHistory, setIsfHistory] = useState<IsfHistoryItem[]>([]);
  const [scope3History, setScope3History] = useState<Scope3HistoryItem[]>([]);
  const [nzeTargets, setNzeTargets] = useState<NzeTargetResponse[]>([]);
  const [workforceHistory, setWorkforceHistory] = useState<WorkforceHistoryItem[]>([]);
  const [governanceHistory, setGovernanceHistory] = useState<DisclosureHistoryItem[]>([]);
  const [stakeholderHrHistory, setStakeholderHrHistory] = useState<DisclosureHistoryItem[]>([]);
  const [workforceStatus, setWorkforceStatus] = useState<Awaited<ReturnType<typeof getWorkforceClientStatus>>>([]);
  const [governanceStatus, setGovernanceStatus] = useState<Awaited<ReturnType<typeof getGovernanceClientStatus>>>([]);
  const [stakeholderHrStatus, setStakeholderHrStatus] = useState<Awaited<ReturnType<typeof getStakeholderHrClientStatus>>>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sourceState, setSourceState] = useState<Record<SourceKey, WidgetSourceState>>({
    clients: emptySource(),
    brsr: emptySource(),
    calculators: emptySource(),
    regulatory: emptySource(),
    activity: emptySource(),
  });

  const patchSource = useCallback((key: SourceKey, patch: Partial<WidgetSourceState>) => {
    setSourceState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const refreshClients = useCallback(async (background = false) => {
    if (!showClients) {
      patchSource("clients", { fetchedAt: Date.now(), latestDataAt: Date.now(), refreshing: false });
      return;
    }
    if (!background) patchSource("clients", { refreshing: true });
    try {
      const res = await listClients(0, 100);
      setClients(res.content);
      patchSource("clients", {
        fetchedAt: Date.now(),
        latestDataAt: latestIsoTimestamp(...res.content.map((c) => c.createdAt)),
        refreshing: false,
      });
    } catch {
      patchSource("clients", { refreshing: false });
    }
  }, [patchSource, showClients]);

  const refreshBrsr = useCallback(async (background = false) => {
    if (!hasBrsr) {
      patchSource("brsr", { fetchedAt: Date.now(), latestDataAt: Date.now(), refreshing: false });
      return;
    }
    if (!background) patchSource("brsr", { refreshing: true });
    try {
      const rows = await listBrsrAssessments();
      setBrsrList(rows);
      patchSource("brsr", {
        fetchedAt: Date.now(),
        latestDataAt: latestIsoTimestamp(...rows.map((r) => r.updatedAt ?? r.createdAt)),
        refreshing: false,
      });
    } catch {
      patchSource("brsr", { refreshing: false });
    }
  }, [hasBrsr, patchSource]);

  const refreshCalculators = useCallback(async (background = false) => {
    if (!background) patchSource("calculators", { refreshing: true });
    try {
      const [isf, scope3, nze, workforce, governance, stakeholderHr, lighthouse, isfRows] =
        await Promise.all([
        getIsfClientStatus(fy).catch(() => []),
        getScope3History(undefined, fy).catch(() => []),
        listNzeTargets().catch(() => []),
        getWorkforceHistory({ fiscalYear: fy }).catch(() => []),
        getGovernanceHistory({ fiscalYear: fy }).catch(() => []),
        getStakeholderHrHistory({ fiscalYear: fy }).catch(() => []),
        listLighthouseAssessments().catch(() => []),
        getIsfHistory({ fiscalYear: fy }).catch(() => []),
      ]);
      setIsfStatus(isf);
      setScope3History(scope3);
      setNzeTargets(nze);
      setWorkforceHistory(workforce);
      setGovernanceHistory(governance);
      setStakeholderHrHistory(stakeholderHr);
      setLighthouseList(lighthouse);
      setIsfHistory(isfRows);

      if (showClients) {
        const [wfStatus, govStatus, shStatus] = await Promise.all([
          getWorkforceClientStatus(fy).catch(() => []),
          getGovernanceClientStatus(fy).catch(() => []),
          getStakeholderHrClientStatus(fy).catch(() => []),
        ]);
        setWorkforceStatus(wfStatus);
        setGovernanceStatus(govStatus);
        setStakeholderHrStatus(shStatus);
      }

      patchSource("calculators", {
        fetchedAt: Date.now(),
        latestDataAt: latestIsoTimestamp(
          ...scope3.map((r) => r.updated_at),
          ...nze.map((r) => r.updated_at),
          ...workforce.map((r) => r.updated_at),
          ...governance.map((r) => r.updated_at),
          ...stakeholderHr.map((r) => r.updated_at),
        ),
        refreshing: false,
      });
    } catch {
      patchSource("calculators", { refreshing: false });
    }
  }, [fy, patchSource, showClients]);

  const refreshActivity = useCallback(async (background = false) => {
    if (!background) patchSource("activity", { refreshing: true });
    try {
      await Promise.all([
        showClients ? refreshClients(background) : Promise.resolve(),
        hasBrsr ? refreshBrsr(background) : Promise.resolve(),
        refreshCalculators(background),
      ]);
      patchSource("activity", { fetchedAt: Date.now(), refreshing: false });
    } catch {
      patchSource("activity", { refreshing: false });
    }
  }, [showClients, hasBrsr, refreshClients, refreshBrsr, refreshCalculators, patchSource]);

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
        refreshClients(true),
        refreshBrsr(true),
        refreshCalculators(true),
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
  }, [refreshClients, refreshBrsr, refreshCalculators, refreshRegulatory, patchSource]);

  const activityItems = useMemo(
    () =>
      initialLoading
        ? []
        : buildRecentActivity({
            clients,
            brsrList,
            lighthouseList,
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
      clients,
      brsrList,
      lighthouseList,
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
    (id: ProWidgetId): WidgetSourceState[] => {
      const keys = PRO_WIDGET_SOURCES[id];
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
    async (id: ProWidgetId) => {
      const keys = PRO_WIDGET_SOURCES[id];
      if (keys === "static") return;
      await Promise.all(
        keys.map((key) => {
          if (key === "clients") return refreshClients();
          if (key === "brsr") return refreshBrsr();
          if (key === "calculators") return refreshCalculators();
          if (key === "activity") return refreshActivity();
          return refreshRegulatory();
        }),
      );
    },
    [refreshClients, refreshBrsr, refreshCalculators, refreshActivity, refreshRegulatory],
  );

  const loading = useMemo(
    () =>
      initialLoading
      || (showClients && sourceState.clients.fetchedAt == null)
      || (hasBrsr && sourceState.brsr.fetchedAt == null)
      || sourceState.calculators.fetchedAt == null,
    [initialLoading, showClients, hasBrsr, sourceState],
  );

  const activityLoading = sourceState.activity.fetchedAt == null;

  return {
    fy,
    showClients,
    hasBrsr,
    clients,
    brsrList,
    lighthouseList,
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
    activityLoading,
    getWidgetSources,
    refreshWidget,
    isStaticWidget: (id: ProWidgetId) => PRO_WIDGET_SOURCES[id] === "static",
  };
}
