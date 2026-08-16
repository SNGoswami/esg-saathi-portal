"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { listBrsrAssessments, brsrStatusLabel, type BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import { getIsfById, getIsfHistory } from "@/modules/isf-calculator/api/isfApi";
import IsfReportDetailView from "@/modules/isf-calculator/ui/IsfReportDetailView";
import type { IsfCalculationResponse } from "@/modules/isf-calculator/domain/types";
import { getScope3History, getScope3ReportByCalculationId } from "@/modules/scope3-ghg/api/scope3Api";
import { calcCacheKey, readCalculatorCache } from "@/modules/calculators/cache/calculatorCache";
import Scope3ReportDetailView from "@/modules/scope3-ghg/ui/Scope3ReportDetailView";
import type { Scope3SummaryResponse } from "@/modules/scope3-ghg/domain/types";
import { getNzeTarget, listNzeTargets } from "@/modules/net-zero/api/nzeApi";
import NetZeroReportDetailView from "@/modules/net-zero/ui/NetZeroReportDetailView";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import { getWorkforceHistory, getWorkforceReportById } from "@/modules/workforce/api/workforceApi";
import WorkforceReportDetailView from "@/modules/workforce/ui/WorkforceReportDetailView";
import type { WorkforceReportResponse } from "@/modules/workforce/domain/types";
import { getStakeholderHrHistory, getStakeholderHrReportById } from "@/modules/stakeholder-hr/api/stakeholderHrApi";
import StakeholderHrReportDetailView from "@/modules/stakeholder-hr/ui/StakeholderHrReportDetailView";
import type { StakeholderHrInputs } from "@/modules/stakeholder-hr/domain/types";
import { getGovernanceHistory, getGovernanceReportById } from "@/modules/governance/api/governanceApi";
import GovernanceReportDetailView from "@/modules/governance/ui/GovernanceReportDetailView";
import type { GovernanceInputs, GovernanceKpis } from "@/modules/governance/domain/types";
import DownloadReportDialog, { type DownloadFormat } from "@/modules/lighthouse/ui/DownloadReportDialog";
import LighthouseReportDetail from "@/modules/lighthouse/ui/LighthouseReportDetail";
import type { LighthouseAssessmentApi, LighthouseAssessmentSummary } from "@/modules/lighthouse/api/lighthouseApi";
import { listLighthouseAssessments, scoresFromLighthouseApi } from "@/modules/lighthouse/api/lighthouseApi";
import { loadLighthouseReport, readLighthouseReportCache } from "@/modules/lighthouse/domain/reportCache";
import { formatReportTakenAt } from "@/modules/reports/domain/formatReportDate";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import { CalculatorField } from "@/modules/calculators/ui/CalculatorLayout";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { DataTable, SortableHeader } from "@/modules/dashboard/components/DataTable";
import {
  buildReportsDashboardUrl,
  type AssessmentRouteParams,
} from "@/modules/dashboard/nav/workspaceRoutes";

export type ReportCategory = "all" | "lighthouse" | "brsr" | "isf" | "scope3" | "net-zero" | "workforce" | "stakeholder-hr" | "governance";

function fmtNum(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

const CATEGORIES: { id: ReportCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lighthouse", label: "Lighthouse" },
  { id: "brsr", label: "BRSR" },
  { id: "isf", label: "ISF Calculator" },
  { id: "scope3", label: "Scope 3 GHG" },
  { id: "net-zero", label: "Net Zero Emissions" },
  { id: "workforce", label: "Workforce" },
  { id: "stakeholder-hr", label: "Stakeholder & HR" },
  { id: "governance", label: "Governance" },
];

const QUICK_CATEGORIES: ReportCategory[] = ["all", "lighthouse", "brsr"];

const CATEGORY_GROUPS: { label: string; ids: Exclude<ReportCategory, "all">[] }[] = [
  { label: "Assessments", ids: ["lighthouse", "brsr"] },
  { label: "Calculators", ids: ["isf", "scope3", "net-zero"] },
  { label: "Disclosures", ids: ["workforce", "stakeholder-hr", "governance"] },
];

type ReportListItem = {
  id: string;
  category: Exclude<ReportCategory, "all">;
  typeLabel: string;
  date: string;
  time: string;
  meta: string;
  clientId?: string | null;
};

function parseCategory(value: string | null): ReportCategory {
  if (
    value === "lighthouse" ||
    value === "brsr" ||
    value === "isf" ||
    value === "scope3" ||
    value === "net-zero" ||
    value === "workforce" ||
    value === "stakeholder-hr" ||
    value === "governance"
  ) {
    return value;
  }
  return "all";
}

export default function ReportsHubView({
  onNavigateToAssessment,
}: {
  onNavigateToAssessment?: (params?: AssessmentRouteParams) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<ReportCategory>(() =>
    parseCategory(searchParams.get("category")),
  );
  const [reportId, setReportId] = useState<string | null>(() => searchParams.get("reportId"));

  const [lighthouseList, setLighthouseList] = useState<LighthouseAssessmentSummary[]>([]);
  const [lighthouseDetail, setLighthouseDetail] = useState<LighthouseAssessmentApi | null>(null);
  const [brsrList, setBrsrList] = useState<BrsrAssessment[]>([]);
  const [isfList, setIsfList] = useState<ReportListItem[]>([]);
  const [scope3List, setScope3List] = useState<ReportListItem[]>([]);
  const [nzeList, setNzeList] = useState<ReportListItem[]>([]);
  const [workforceList, setWorkforceList] = useState<ReportListItem[]>([]);
  const [stakeholderHrList, setStakeholderHrList] = useState<ReportListItem[]>([]);
  const [governanceList, setGovernanceList] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isfDetail, setIsfDetail] = useState<IsfCalculationResponse | null>(null);
  const [scope3Detail, setScope3Detail] = useState<Scope3SummaryResponse | null>(null);
  const [nzeDetail, setNzeDetail] = useState<NzeTargetResponse | null>(null);
  const [workforceDetail, setWorkforceDetail] = useState<WorkforceReportResponse | null>(null);
  const [stakeholderHrDetail, setStakeholderHrDetail] = useState<{
    fiscal_year?: string;
    updated_at?: string;
    inputs?: StakeholderHrInputs;
  } | null>(null);
  const [governanceDetail, setGovernanceDetail] = useState<{
    fiscal_year?: string;
    updated_at?: string;
    inputs?: GovernanceInputs;
    kpis?: GovernanceKpis & Record<string, unknown>;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useToastOnValue(error, "error");
  useToastOnValue(downloadError, "error");

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(() => searchParams.get("clientId") ?? "");
  const [clientsLoading, setClientsLoading] = useState(false);

  const showBrsr = role !== "msme";
  const needsClient = role !== "msme";
  const clientFilter = needsClient && clientId ? clientId : null;
  const clientApiParams = useMemo(
    () => (clientFilter ? { clientId: clientFilter } : undefined),
    [clientFilter],
  );

  const syncUrl = useCallback(
    (nextCategory: ReportCategory, nextReportId: string | null, nextClientId = clientId) => {
      router.replace(
        buildReportsDashboardUrl({
          category: nextCategory,
          reportId: nextReportId,
          clientId: nextClientId || null,
        }),
        { scroll: false },
      );
    },
    [router, clientId],
  );

  useEffect(() => {
    setCategory(parseCategory(searchParams.get("category")));
    setReportId(searchParams.get("reportId"));
    setClientId(searchParams.get("clientId") ?? "");
  }, [searchParams]);

  function handleClientChange(nextClientId: string) {
    setClientId(nextClientId);
    router.replace(
      buildReportsDashboardUrl({
        category,
        reportId,
        clientId: nextClientId || null,
      }),
      { scroll: false },
    );
  }

  useEffect(() => {
    if (!needsClient) return;

    setClientsLoading(true);
    void listClients(0, 100)
      .then((res) => {
        setClients(res.content);
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, [needsClient]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const tasks: Promise<void>[] = [];

    tasks.push(
      listLighthouseAssessments()
        .then((rows) => {
          if (!cancelled) setLighthouseList(rows);
        })
        .catch(() => {
          if (!cancelled) setLighthouseList([]);
        }),
    );

    if (showBrsr) {
      tasks.push(
        listBrsrAssessments()
          .then((rows) => {
            if (!cancelled) setBrsrList(rows);
          })
          .catch(() => {}),
      );
    }

    const applyIsfList = (rows: Awaited<ReturnType<typeof getIsfHistory>>) => {
      if (cancelled) return;
      setIsfList(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.created_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "isf" as const,
            typeLabel: "ISF calculation",
            date,
            time,
            meta: `${client}FY ${r.fiscal_year ?? "-"} · Scope 3 ${fmtNum(r.scope3_total_tco2e)} tCO₂e · Energy ${fmtNum(r.energy_total_gj)} GJ`,
          };
        }),
      );
    };

    const isfParams = needsClient ? clientApiParams : undefined;
    tasks.push(
      getIsfHistory(isfParams, applyIsfList)
        .then(applyIsfList)
        .catch(() => {
          if (!cancelled) setIsfList([]);
        }),
    );

    const applyScope3List = (rows: Awaited<ReturnType<typeof getScope3History>>) => {
      if (cancelled) return;
      setScope3List(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.updated_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "scope3" as const,
            typeLabel: "Scope 3 GHG calculation",
            date,
            time,
            meta: `${client}FY ${r.fiscal_year ?? "-"} · ${fmtNum(r.total_scope3_tco2e)} tCO₂e · ${r.categories_completed ?? 0}/15 categories`,
          };
        }),
      );
    };

    const scope3Client = needsClient ? clientFilter ?? undefined : undefined;
    tasks.push(
      getScope3History(scope3Client, undefined, applyScope3List)
        .then(applyScope3List)
        .catch(() => {
          if (!cancelled) setScope3List([]);
        }),
    );

    const applyNzeList = (rows: Awaited<ReturnType<typeof listNzeTargets>>) => {
      if (cancelled) return;
      setNzeList(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.updated_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "net-zero" as const,
            typeLabel: "Net zero target",
            date,
            time,
            meta: `${client}${r.name} · ${r.baseline_year}→${r.target_year} · ${r.target_reduction_pct}% · SBTi ${r.sbti_aligned ? "aligned" : "review"}`,
          };
        }),
      );
    };

    const nzeClient = needsClient ? clientFilter ?? undefined : undefined;
    tasks.push(
      listNzeTargets(nzeClient, applyNzeList)
        .then(applyNzeList)
        .catch(() => {
          if (!cancelled) setNzeList([]);
        }),
    );

    const applyWorkforceList = (rows: Awaited<ReturnType<typeof getWorkforceHistory>>) => {
      if (cancelled) return;
      setWorkforceList(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.updated_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "workforce" as const,
            typeLabel: "Workforce report",
            date,
            time,
            meta: `${client}FY ${r.fiscal_year ?? "-"}`,
          };
        }),
      );
    };

    const applyStakeholderHrList = (rows: Awaited<ReturnType<typeof getStakeholderHrHistory>>) => {
      if (cancelled) return;
      setStakeholderHrList(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.updated_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "stakeholder-hr" as const,
            typeLabel: "Stakeholder & HR report",
            date,
            time,
            meta: `${client}FY ${r.fiscal_year ?? "-"}`,
          };
        }),
      );
    };

    const applyGovernanceList = (rows: Awaited<ReturnType<typeof getGovernanceHistory>>) => {
      if (cancelled) return;
      setGovernanceList(
        rows.map((r) => {
          const { date, time } = formatReportTakenAt(r.updated_at);
          const client = r.client_company_name ? `${r.client_company_name} · ` : "";
          return {
            id: r.id,
            category: "governance" as const,
            typeLabel: "Governance report",
            date,
            time,
            meta: `${client}FY ${r.fiscal_year ?? "-"}`,
          };
        }),
      );
    };

    const workforceParams = needsClient ? clientApiParams : undefined;
    tasks.push(
      getWorkforceHistory(workforceParams, applyWorkforceList)
        .then(applyWorkforceList)
        .catch(() => {
          if (!cancelled) setWorkforceList([]);
        }),
    );
    tasks.push(
      getStakeholderHrHistory(needsClient ? clientApiParams : undefined, applyStakeholderHrList)
        .then(applyStakeholderHrList)
        .catch(() => {
          if (!cancelled) setStakeholderHrList([]);
        }),
    );
    tasks.push(
      getGovernanceHistory(needsClient ? clientApiParams : undefined, applyGovernanceList)
        .then(applyGovernanceList)
        .catch(() => {
          if (!cancelled) setGovernanceList([]);
        }),
    );

    void Promise.all(tasks)
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBrsr, needsClient, clientFilter, clientApiParams]);

  const lighthouseItems: ReportListItem[] = useMemo(() => {
    let rows = lighthouseList;
    if (clientFilter) {
      rows = rows.filter((r) => r.clientId === clientFilter);
    }
    return rows.map((r) => {
      const { date, time } = formatReportTakenAt(r.createdAt);
      const client = r.clientCompanyName ? `${r.clientCompanyName} · ` : "";
      const score =
        r.totalScore != null ? r.totalScore.toFixed(1) : "-";
      const readiness = r.readiness ?? "Developing";
      return {
        id: r.id,
        category: "lighthouse" as const,
        typeLabel: "Lighthouse assessment",
        date,
        time,
        meta: `${client}Score ${score} · ${readiness}`,
        clientId: r.clientId,
      };
    });
  }, [lighthouseList, clientFilter]);

  const brsrItems: ReportListItem[] = useMemo(() => {
    let rows = brsrList;
    if (clientFilter) {
      rows = rows.filter((b) => b.clientId === clientFilter);
    }
    return rows.map((b) => {
      const { date, time } = formatReportTakenAt(b.updatedAt ?? b.createdAt);
      return {
        id: b.id,
        category: "brsr" as const,
        typeLabel: "BRSR assessment",
        date,
        time,
        meta: `${b.clientCompanyName} · FY ${b.fiscalYear} · ${brsrStatusLabel(b.status)} · ${b.completionPct}% complete`,
        clientId: b.clientId,
      };
    });
  }, [brsrList, clientFilter]);

  const allItems = useMemo(
    () => [
      ...lighthouseItems,
      ...brsrItems,
      ...isfList,
      ...scope3List,
      ...nzeList,
      ...workforceList,
      ...stakeholderHrList,
      ...governanceList,
    ],
    [lighthouseItems, brsrItems, isfList, scope3List, nzeList, workforceList, stakeholderHrList, governanceList],
  );

  const filtered = useMemo(() => {
    if (category === "all") return allItems;
    return allItems.filter((i) => i.category === category);
  }, [allItems, category]);

  const selected = reportId ? allItems.find((i) => i.id === reportId) : null;

  useEffect(() => {
    if (!reportId || !needsClient) return;
    if (category === "lighthouse" || lighthouseList.some((r) => r.id === reportId)) return;
    if (!allItems.some((i) => i.id === reportId)) {
      setReportId(null);
      syncUrl(category, null);
    }
  }, [allItems, reportId, needsClient, category, syncUrl, lighthouseList]);
  const lighthouseScores = lighthouseDetail ? scoresFromLighthouseApi(lighthouseDetail) : null;

  useEffect(() => {
    if (!reportId) {
      setLighthouseDetail(null);
      return;
    }

    const isLighthouse =
      category === "lighthouse" ||
      selected?.category === "lighthouse" ||
      lighthouseList.some((r) => r.id === reportId);

    if (!isLighthouse) {
      setLighthouseDetail(null);
      return;
    }

    let cancelled = false;
    const resolvedClientId =
      clientFilter ||
      selected?.clientId ||
      lighthouseList.find((r) => r.id === reportId)?.clientId ||
      null;

    const applyReport = (report: LighthouseAssessmentApi | null) => {
      if (cancelled || !report || report.id !== reportId) return false;
      setLighthouseDetail(report);
      return true;
    };

    setDetailLoading(true);

    const cached = readLighthouseReportCache(resolvedClientId);
    if (cached?.id === reportId) {
      setLighthouseDetail(cached);
    }

    void loadLighthouseReport({
      clientId: resolvedClientId,
      forceRefresh: !cached || cached.id !== reportId,
      onUpdate: (fresh) => {
        if (fresh?.id === reportId) setLighthouseDetail(fresh);
      },
    })
      .then((report) => {
        if (cancelled) return;
        if (applyReport(report)) return;
        const fallback =
          readLighthouseReportCache(resolvedClientId) ??
          (resolvedClientId ? readLighthouseReportCache(null) : null);
        if (!applyReport(fallback) && (!cached || cached.id !== reportId)) {
          setLighthouseDetail(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const fallback =
          readLighthouseReportCache(resolvedClientId) ??
          (resolvedClientId ? readLighthouseReportCache(null) : null);
        if (!applyReport(fallback) && (!cached || cached.id !== reportId)) {
          setLighthouseDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportId, category, selected?.category, selected?.clientId, lighthouseList, clientFilter]);

  useEffect(() => {
    if (!reportId || selected?.category !== "isf") {
      setIsfDetail(null);
      return;
    }
    setDetailLoading(true);
    void getIsfById(reportId)
      .then(setIsfDetail)
      .catch(() => setIsfDetail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  useEffect(() => {
    if (!reportId || selected?.category !== "scope3") {
      setScope3Detail(null);
      return;
    }

    const calcKey = calcCacheKey("scope3", "calc", reportId);
    const cachedCalc = readCalculatorCache<{ fiscal_year?: string; client_id?: string }>(calcKey);
    if (cachedCalc) {
      const summaryKey = calcCacheKey("scope3", "summary", cachedCalc.fiscal_year ?? "", cachedCalc.client_id);
      const cachedSummary = readCalculatorCache<Scope3SummaryResponse>(summaryKey);
      if (cachedSummary) {
        setScope3Detail(cachedSummary);
        setDetailLoading(false);
      } else {
        setDetailLoading(true);
      }
    } else {
      setDetailLoading(true);
    }

    void getScope3ReportByCalculationId(reportId, setScope3Detail)
      .then(setScope3Detail)
      .catch(() => setScope3Detail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  useEffect(() => {
    if (!reportId || selected?.category !== "net-zero") {
      setNzeDetail(null);
      return;
    }
    setDetailLoading(true);
    void getNzeTarget(reportId)
      .then(setNzeDetail)
      .catch(() => setNzeDetail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  useEffect(() => {
    if (!reportId || selected?.category !== "workforce") {
      setWorkforceDetail(null);
      return;
    }
    setDetailLoading(true);
    void getWorkforceReportById(reportId)
      .then(setWorkforceDetail)
      .catch(() => setWorkforceDetail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  useEffect(() => {
    if (!reportId || selected?.category !== "stakeholder-hr") {
      setStakeholderHrDetail(null);
      return;
    }
    setDetailLoading(true);
    void getStakeholderHrReportById(reportId)
      .then(setStakeholderHrDetail)
      .catch(() => setStakeholderHrDetail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  useEffect(() => {
    if (!reportId || selected?.category !== "governance") {
      setGovernanceDetail(null);
      return;
    }
    setDetailLoading(true);
    void getGovernanceReportById(reportId)
      .then(setGovernanceDetail)
      .catch(() => setGovernanceDetail(null))
      .finally(() => setDetailLoading(false));
  }, [reportId, selected?.category]);

  function selectCategory(next: ReportCategory) {
    setCategory(next);
    setReportId(null);
    syncUrl(next, null);
  }

  function openReport(item: ReportListItem) {
    setReportId(item.id);
    setCategory(item.category);
    syncUrl(item.category, item.id);
  }

  function closeDetail() {
    setReportId(null);
    syncUrl(category, null);
  }

  const categoryLabel = (id: ReportCategory) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

  function detailShellProps(item: ReportListItem, title: string) {
    return {
      title,
      onBack: closeDetail,
      secondaryAction:
        item.category === "brsr"
          ? {
              label: "Open assessment",
              onClick: () =>
                onNavigateToAssessment?.({
                  tab: "brsr",
                  assessmentId: item.id,
                  clientId: item.clientId ?? null,
                }),
            }
          : undefined,
    };
  }

  async function handleLighthouseDownload(format: DownloadFormat) {
    if (!lighthouseDetail) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const apiScores = scoresFromLighthouseApi(lighthouseDetail);
      if (!apiScores) {
        throw new Error("Report data is incomplete. Refresh and try again.");
      }
      const { downloadLighthouseReportPdf, downloadLighthouseReportXbrl } = await import(
        "@/modules/lighthouse/domain/exportReport"
      );
      if (format === "pdf") await downloadLighthouseReportPdf(lighthouseDetail, apiScores);
      else await downloadLighthouseReportXbrl(lighthouseDetail, apiScores);
      setDownloadOpen(false);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const reportColumns: ColumnDef<ReportListItem>[] = [
    {
      id: "report",
      accessorFn: (row) => `${row.typeLabel} ${row.category} ${row.meta}`,
      header: ({ column }) => <SortableHeader column={column} label="Report" />,
      cell: ({ row }) => (
        <p className="reports-hub__report-title">{row.original.typeLabel}</p>
      ),
      meta: { mobileLabel: "Report" },
    },
    {
      id: "date",
      accessorFn: (row) => `${row.date} ${row.time}`,
      header: ({ column }) => <SortableHeader column={column} label="Date" />,
      cell: ({ row }) => (
        <div className="reports-hub__date-cell">
          <time dateTime={row.original.date} className="reports-hub__date">
            {row.original.date}
          </time>
          <time className="reports-hub__time">{row.original.time}</time>
        </div>
      ),
      meta: { mobileLabel: "Date" },
    },
    {
      id: "action",
      enableSorting: false,
      header: () => "Action",
      cell: ({ row }) => (
        <button
          type="button"
          className="btn-primary reports-hub__view-btn"
          onClick={() => openReport(row.original)}
        >
          View report
        </button>
      ),
      meta: { mobileLabel: "Action" },
    },
  ];

  const reportsEmptyMessage: ReactNode = (
    <>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-heading)" }}>
        No reports in this section
      </p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>
        {category === "lighthouse"
          ? "Complete your Lighthouse assessment to generate a report."
          : category === "isf"
            ? "Run Calculate & Save in the ISF Calculator."
            : category === "scope3"
              ? "Calculate categories in the Scope 3 GHG calculator."
              : category === "net-zero"
                ? "Create a net zero target in the Net Zero module."
                : category === "workforce"
                  ? "Save workforce disclosures in the Workforce tab."
                  : category === "stakeholder-hr"
                    ? "Save disclosures in Stakeholder & HR under ESG Pillars."
                    : category === "governance"
                      ? "Save disclosures in Governance or Selective under ESG Pillars."
                      : category === "brsr"
                        ? "Create a BRSR assessment for a client."
                        : "Reports from your calculators and assessments will appear here."}
      </p>
    </>
  );

  if (selected?.category === "lighthouse") {
    return (
      <>
        <ReportDetailShell
          {...detailShellProps(selected, "Lighthouse Report")}
          onDownload={lighthouseDetail ? () => setDownloadOpen(true) : undefined}
          downloading={downloading}
        >
          {detailLoading && (
            <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
              Loading report…
            </p>
          )}
          {!detailLoading && lighthouseDetail && (
            <LighthouseReportDetail report={lighthouseDetail} scores={lighthouseScores ?? undefined} />
          )}
          {!detailLoading && !lighthouseDetail && (
            <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
              <p className="dash-muted">Could not load this Lighthouse report.</p>
            </div>
          )}
        </ReportDetailShell>
        <DownloadReportDialog
          open={downloadOpen}
          busy={downloading}
          onClose={() => setDownloadOpen(false)}
          onSelect={handleLighthouseDownload}
        />
      </>
    );
  }

  if (selected?.category === "isf") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "ISF Calculator Report")}>
        {detailLoading && (
          <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
            Loading report analytics…
          </p>
        )}
        {!detailLoading && isfDetail && <IsfReportDetailView report={isfDetail} />}
        {!detailLoading && !isfDetail && (
          <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
            <p className="dash-muted">Could not load this ISF report.</p>
          </div>
        )}
      </ReportDetailShell>
    );
  }

  if (selected?.category === "scope3") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "Scope 3 GHG Report")}>
        {detailLoading && (
          <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
            Loading report analytics…
          </p>
        )}
        {!detailLoading && scope3Detail && <Scope3ReportDetailView report={scope3Detail} />}
        {!detailLoading && !scope3Detail && (
          <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
            <p className="dash-muted">Could not load this Scope 3 report.</p>
          </div>
        )}
      </ReportDetailShell>
    );
  }

  if (selected?.category === "net-zero") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "Net Zero Report")}>
          {detailLoading && (
            <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
              Loading report analytics…
            </p>
          )}
          {!detailLoading && nzeDetail && <NetZeroReportDetailView target={nzeDetail} />}
          {!detailLoading && !nzeDetail && (
            <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
              <p className="dash-muted">Could not load this Net Zero report.</p>
            </div>
          )}
        </ReportDetailShell>
    );
  }

  if (selected?.category === "workforce") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "Workforce Report")}>
          {detailLoading && (
            <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
              Loading report…
            </p>
          )}
          {!detailLoading && workforceDetail && <WorkforceReportDetailView report={workforceDetail} />}
          {!detailLoading && !workforceDetail && (
            <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
              <p className="dash-muted">Could not load this Workforce report.</p>
            </div>
          )}
        </ReportDetailShell>
    );
  }

  if (selected?.category === "stakeholder-hr") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "Stakeholder & HR Report")}>
          {detailLoading && (
            <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
              Loading report…
            </p>
          )}
          {!detailLoading && stakeholderHrDetail && (
            <StakeholderHrReportDetailView report={stakeholderHrDetail} />
          )}
          {!detailLoading && !stakeholderHrDetail && (
            <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
              <p className="dash-muted">Could not load this report.</p>
            </div>
          )}
        </ReportDetailShell>
    );
  }

  if (selected?.category === "governance") {
    return (
      <ReportDetailShell {...detailShellProps(selected, "Governance Report")}>
          {detailLoading && (
            <p className="dash-muted" style={{ textAlign: "center", padding: 24 }}>
              Loading report…
            </p>
          )}
        {!detailLoading && governanceDetail && <GovernanceReportDetailView report={governanceDetail} />}
        {!detailLoading && !governanceDetail && (
          <div className="card card--elevated" style={{ padding: 20, textAlign: "center" }}>
            <p className="dash-muted">Could not load this report.</p>
          </div>
        )}
        </ReportDetailShell>
    );
  }

  if (selected?.category === "brsr") {
    const b = brsrList.find((x) => x.id === selected.id);
    return (
      <ReportDetailShell {...detailShellProps(selected, "BRSR Assessment")}>
          {b ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card card--elevated" style={{ padding: "1rem" }}>
                <p className="dash-section-title">{b.clientCompanyName}</p>
                <p className="dash-muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                  Fiscal year {b.fiscalYear} · {brsrStatusLabel(b.status)}
                </p>
              </div>
              <div className="report-metrics-grid">
                <Metric label="Environmental" value={b.eScore} />
                <Metric label="Social" value={b.sScore} />
                <Metric label="Governance" value={b.gScore} />
                <Metric label="Total score" value={b.totalScore} />
              </div>
              <div className="card card--elevated" style={{ padding: "1rem" }}>
                <p className="dash-label">Completion</p>
                <p className="dash-section-title" style={{ fontSize: "1.5rem" }}>
                  {b.completionPct}%
                </p>
              </div>
            </div>
          ) : (
            <p className="dash-muted">Assessment not found.</p>
          )}
        </ReportDetailShell>
    );
  }

  return (
    <div className="reports-hub">
      <div className="reports-hub__toolbar">
        <div className="reports-hub__quick-filters" role="tablist" aria-label="Common report types">
          {QUICK_CATEGORIES.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              className={`dash-tab ${category === id ? "dash-tab--active" : ""}`}
              onClick={() => selectCategory(id)}
            >
              {categoryLabel(id)}
            </button>
          ))}
        </div>

        {needsClient && (
          <div className="reports-hub__toolbar-row">
            <CalculatorField label="Client">
              <select
                className="dash-input"
                value={clientId}
                disabled={clientsLoading}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </CalculatorField>
          </div>
        )}

        {!loading && (
          <p className="reports-hub__summary">
            {filtered.length} report{filtered.length === 1 ? "" : "s"}
            {category !== "all" ? ` in ${categoryLabel(category)}` : ""}
            {clientFilter ? ` for selected client` : ""}
          </p>
        )}
      </div>

      <section className="reports-hub__panel card card--elevated">
        <DataTable
          data={filtered}
          columns={reportColumns}
          getRowId={(row) => `${row.category}-${row.id}`}
          tableClassName="reports-hub__table"
          wrapClassName="reports-hub__table-wrap"
          searchPlaceholder="Search reports…"
          emptyMessage={reportsEmptyMessage}
          loading={loading}
          loadingMessage="Loading reports…"
          pageSize={12}
          toolbarExtra={
            <div className="dash-table-toolbar__filter">
              <select
                id="reports-hub-type-filter"
                className="dash-input"
                value={category}
                aria-label="Report type"
                onChange={(e) => selectCategory(parseCategory(e.target.value))}
              >
                <option value="all">All reports</option>
                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.ids.map((id) => {
                      const item = CATEGORIES.find((c) => c.id === id);
                      if (!item) return null;
                      return (
                        <option key={id} value={id}>
                          {item.label}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
          }
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="card" style={{ padding: "1rem" }}>
      <p className="dash-muted" style={{ fontSize: "0.7rem" }}>
        {label}
      </p>
      <p className="dash-section-title" style={{ fontSize: "1.125rem" }}>
        {value != null && Number.isFinite(value) ? value.toFixed(1) : "-"}
      </p>
    </div>
  );
}

function ReportDetailShell({
  title,
  onBack,
  onDownload,
  downloading,
  secondaryAction,
  children,
}: {
  title: string;
  onBack: () => void;
  onDownload?: () => void;
  downloading?: boolean;
  secondaryAction?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="reports-hub report-detail-root">
      <div className="reports-hub-detail__toolbar">
        <button type="button" className="calc-back-btn" onClick={onBack}>
          ← Back to list
        </button>
        <div className="reports-hub-detail__actions">
          {secondaryAction && (
            <button type="button" className="btn-ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
          {onDownload && (
            <button type="button" className="btn-primary" disabled={downloading} onClick={onDownload}>
              Download report
            </button>
          )}
        </div>
      </div>
      <h1 className="reports-hub-detail__title">{title}</h1>
      {children}
    </div>
  );
}
