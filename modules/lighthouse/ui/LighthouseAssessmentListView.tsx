"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import {
  listLighthouseAssessments,
  type LighthouseAssessmentSummary,
} from "@/modules/lighthouse/api/lighthouseApi";
import {
  invalidateLighthouseAssessmentsCache,
  readLighthouseAssessmentsCache,
  writeLighthouseAssessmentsCache,
} from "@/modules/lighthouse/api/lighthouseAssessmentsCache";
import { readLighthouseReportCache } from "@/modules/lighthouse/domain/reportCache";
import { readMsmeCompanyFromProfileCache, readMsmeSectorFromProfileCache, readLighthouseAssessment } from "@/modules/lighthouse/domain/storage";
import { countAnswered } from "@/modules/lighthouse/domain/questionnaire";
import { formatReportTakenAt } from "@/modules/reports/domain/formatReportDate";
import LighthouseAssessmentView from "@/modules/lighthouse/ui/LighthouseAssessmentView";
import { DataTable, SortableHeader } from "@/modules/dashboard/components/DataTable";
import type { AssessmentRouteParams } from "@/modules/dashboard/nav/workspaceRoutes";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";

const CLIENT_PAGE_SIZE = 100;

type LighthouseClientRow = {
  key: string;
  clientId: string | null;
  companyName: string;
  sector?: string | null;
};

export default function LighthouseAssessmentListView({
  embedded,
  initialClientId,
  backToListSignal = 0,
  onDrilldownChange,
  onNavigateToReport,
  onNavigateToAssessment,
}: {
  embedded?: boolean;
  initialClientId?: string | null;
  backToListSignal?: number;
  onDrilldownChange?: (label: string | null) => void;
  onNavigateToReport?: (category: string, reportId: string, extra?: { clientId?: string | null }) => void;
  onNavigateToAssessment?: (params?: AssessmentRouteParams) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isMsme = role === "msme";
  const cached = typeof window !== "undefined" ? readLighthouseAssessmentsCache() : null;

  const [clients, setClients] = useState<Client[]>(cached?.clients ?? []);
  const [assessments, setAssessments] = useState<LighthouseAssessmentSummary[]>(cached?.assessments ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");
  const [activeClient, setActiveClient] = useState<LighthouseClientRow | null>(null);
  const [listEntry, setListEntry] = useState<"scores" | "quiz" | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const prevInitialClientIdRef = useRef(initialClientId);

  useToastOnValue(error, "error");

  const assessmentByClient = useMemo(() => {
    const map = new Map<string, LighthouseAssessmentSummary>();
    for (const row of assessments) {
      if (row.clientId) {
        map.set(row.clientId, row);
      }
    }
    return map;
  }, [assessments]);

  const msmeAssessment = useMemo(
    () => assessments.find((row) => !row.clientId) ?? null,
    [assessments],
  );

  const rows = useMemo<LighthouseClientRow[]>(() => {
    if (isMsme) {
      return [
        {
          key: "msme-self",
          clientId: null,
          companyName: readMsmeCompanyFromProfileCache() || "My organisation",
          sector: readMsmeSectorFromProfileCache() ?? null,
        },
      ];
    }
    return clients.map((client) => ({
      key: client.id,
      clientId: client.id,
      companyName: client.companyName,
      sector: client.sector,
    }));
  }, [clients, isMsme]);

  const clientLabel = isMsme ? "Organisation" : "Client";

  const persist = useCallback((nextClients: Client[], nextAssessments: LighthouseAssessmentSummary[]) => {
    setClients(nextClients);
    setAssessments(nextAssessments);
    writeLighthouseAssessmentsCache({ clients: nextClients, assessments: nextAssessments });
  }, []);

  const load = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!options?.skipCache) {
        const hit = readLighthouseAssessmentsCache();
        if (hit) {
          persist(hit.clients, hit.assessments);
          setLoading(false);
          setError("");
          return;
        }
      }

      setLoading(true);
      setError("");
      try {
        const assessmentRows = await listLighthouseAssessments();
        if (isMsme) {
          persist([], assessmentRows);
        } else {
          const clientRes = await listClients(0, CLIENT_PAGE_SIZE);
          persist(clientRes.content, assessmentRows);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Lighthouse assessments");
      } finally {
        setLoading(false);
      }
    },
    [isMsme, persist],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const assessmentForRow = useCallback(
    (row: LighthouseClientRow): LighthouseAssessmentSummary | null => {
      if (row.clientId) {
        return assessmentByClient.get(row.clientId) ?? null;
      }
      return msmeAssessment;
    },
    [assessmentByClient, msmeAssessment],
  );

  const backToList = useCallback(() => {
    setActiveClient(null);
    setListEntry(null);
    setDraftRevision((n) => n + 1);
    invalidateLighthouseAssessmentsCache();
    void load({ skipCache: true });
    if (!isMsme) {
      onDrilldownChange?.(null);
    }
  }, [isMsme, load, onDrilldownChange]);

  const completedForRow = useCallback(
    (row: LighthouseClientRow): boolean => {
      if (assessmentForRow(row) != null) return true;
      const saved = readLighthouseAssessment(row.clientId);
      if (saved?.status === "completed" && saved.scores) return true;
      return readLighthouseReportCache(row.clientId) != null;
    },
    [assessmentForRow],
  );

  const takenAtForRow = useCallback(
    (row: LighthouseClientRow): string | null => {
      const assessment = assessmentForRow(row);
      if (assessment) return assessment.updatedAt ?? assessment.createdAt;
      const saved = readLighthouseAssessment(row.clientId);
      if (saved?.completedAt) return saved.completedAt;
      const report = readLighthouseReportCache(row.clientId);
      return report?.createdAt ?? null;
    },
    [assessmentForRow],
  );

  const draftInProgressForRow = useCallback(
    (row: LighthouseClientRow): boolean => {
      if (completedForRow(row)) return false;
      const saved = readLighthouseAssessment(row.clientId);
      return saved?.status === "draft" && countAnswered(saved.answers) > 0;
    },
    [completedForRow],
  );

  const openClient = useCallback(
    (row: LighthouseClientRow, mode?: "scores" | "quiz") => {
      const resolvedMode = mode ?? (completedForRow(row) ? "scores" : "quiz");
      setActiveClient(row);
      setListEntry(resolvedMode);
      if (!isMsme) {
        onDrilldownChange?.(row.companyName);
      }
      if (row.clientId) {
        onNavigateToAssessment?.({ tab: "lighthouse", clientId: row.clientId });
      }
    },
    [completedForRow, isMsme, onDrilldownChange, onNavigateToAssessment],
  );

  const refreshAssessments = useCallback(() => {
    invalidateLighthouseAssessmentsCache();
    void load({ skipCache: true });
    setDraftRevision((n) => n + 1);
  }, [load]);

  useEffect(() => {
    const prev = prevInitialClientIdRef.current;
    prevInitialClientIdRef.current = initialClientId;
    if (prev && !initialClientId && activeClient) {
      backToList();
    }
  }, [initialClientId, activeClient, backToList]);

  useEffect(() => {
    if (!backToListSignal) return;
    backToList();
  }, [backToListSignal, backToList]);

  useEffect(() => {
    if (!initialClientId || loading || activeClient) return;
    const match = rows.find((row) => row.clientId === initialClientId);
    if (match) openClient(match);
  }, [initialClientId, loading, rows, activeClient, openClient]);

  const columns = useMemo<ColumnDef<LighthouseClientRow>[]>(
    () => [
      {
        id: "client",
        accessorKey: "companyName",
        header: ({ column }) => <SortableHeader column={column} label={clientLabel} />,
        cell: ({ row }) => (
          <p className="reports-hub__report-title">{row.original.companyName}</p>
        ),
        meta: { mobileLabel: clientLabel },
      },
      {
        id: "date",
        accessorFn: (row) => {
          const takenAt = takenAtForRow(row);
          if (!takenAt) return "";
          const { date, time } = formatReportTakenAt(takenAt);
          return `${date} ${time}`;
        },
        header: ({ column }) => <SortableHeader column={column} label="Date" />,
        cell: ({ row }) => {
          const takenAt = takenAtForRow(row.original);
          if (!takenAt) {
            return <span className="reports-hub__date">—</span>;
          }
          const { date, time } = formatReportTakenAt(takenAt);
          return (
            <div className="reports-hub__date-cell">
              <time dateTime={takenAt} className="reports-hub__date">
                {date}
              </time>
              <time className="reports-hub__time">{time}</time>
            </div>
          );
        },
        meta: { mobileLabel: "Date" },
      },
      {
        id: "action",
        enableSorting: false,
        header: () => "Action",
        cell: ({ row }) => {
          const completed = completedForRow(row.original);
          const continuing = !completed && draftInProgressForRow(row.original);
          return (
            <button
              type="button"
              className="btn-primary reports-hub__view-btn"
              onClick={() => openClient(row.original, completed ? "scores" : "quiz")}
            >
              {completed ? "View score" : continuing ? "Continue" : "Start assessment"}
            </button>
          );
        },
        meta: { mobileLabel: "Action", columnClass: "reports-hub__col-action" },
      },
    ],
    [clientLabel, completedForRow, draftInProgressForRow, openClient, takenAtForRow],
  );

  const emptyMessage: ReactNode = (
    <>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text)" }}>No clients yet</p>
      <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
        Add clients first, then start Lighthouse assessments for each organisation.
      </p>
    </>
  );

  const emptyFilteredMessage: ReactNode = (
    <>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text)" }}>No matching clients</p>
      <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
        Try a different search term.
      </p>
    </>
  );

  if (activeClient && listEntry) {
    const assessment = assessmentForRow(activeClient);
    const reportId = assessment?.id ?? readLighthouseReportCache(activeClient.clientId)?.id;
    return (
      <LighthouseAssessmentView
        embedded={embedded}
        listEntry={listEntry}
        clientId={activeClient.clientId}
        clientSector={activeClient.sector ?? undefined}
        onBackToList={backToList}
        onAssessmentCompleted={refreshAssessments}
        onOpenReport={
          reportId
            ? () =>
                onNavigateToReport?.("lighthouse", reportId, {
                  clientId: activeClient.clientId,
                })
            : undefined
        }
      />
    );
  }

  return (
    <div className="reports-hub">
      {!loading && (
        <p className="reports-hub__summary">
          {rows.length} {isMsme ? "organisation" : "client"}
          {rows.length === 1 ? "" : "s"}
        </p>
      )}

      <section className="reports-hub__panel card card--elevated">
        <DataTable
          key={draftRevision}
          data={rows}
          columns={columns}
          getRowId={(row) => row.key}
          tableClassName="reports-hub__table"
          wrapClassName="reports-hub__table-wrap"
          searchPlaceholder="Search clients…"
          showSearch={!isMsme && rows.length > 3}
          loading={loading}
          loadingMessage="Loading assessments…"
          emptyMessage={emptyMessage}
          emptyFilteredMessage={emptyFilteredMessage}
        />
      </section>
    </div>
  );
}
