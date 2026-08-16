"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import {
  brsrStatusLabel,
  createBrsrAssessment,
  isBrsrInProgress,
  listBrsrAssessments,
  type BrsrAssessment,
} from "@/modules/brsr/api/brsrApi";
import {
  invalidateAssessmentsCache,
  readAssessmentsCache,
  writeAssessmentsCache,
} from "@/modules/brsr/api/assessmentsCache";
import { DataTable, SortableHeader } from "@/modules/dashboard/components/DataTable";
import type { AssessmentRouteParams } from "@/modules/dashboard/nav/workspaceRoutes";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import { getCurrentFiscalYear } from "@/modules/platform/utils/fiscalYear";
import BrsrWorkspaceView from "@/modules/brsr/ui/BrsrWorkspaceView";

const CLIENT_PAGE_SIZE = 100;

export default function BrsrAssessmentView({
  embedded = false,
  initialAssessmentId,
  onDrilldownChange,
  onNavigateToReport,
  onNavigateToAssessment,
}: {
  embedded?: boolean;
  initialAssessmentId?: string | null;
  onDrilldownChange?: (label: string | null) => void;
  onNavigateToReport?: (category: string, reportId: string, extra?: { clientId?: string | null }) => void;
  onNavigateToAssessment?: (params?: AssessmentRouteParams) => void;
}) {
  const confirm = useConfirm();
  const fiscalYear = useMemo(() => getCurrentFiscalYear(), []);
  const cached = typeof window !== "undefined" ? readAssessmentsCache() : null;

  const [clients, setClients] = useState<Client[]>(cached?.clients ?? []);
  const [assessments, setAssessments] = useState<BrsrAssessment[]>(cached?.assessments ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");

  useToastOnValue(error, "error");
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

  const assessmentByClient = useMemo(() => {
    const map = new Map<string, BrsrAssessment>();
    for (const a of assessments) {
      if (a.fiscalYear === fiscalYear && !map.has(a.clientId)) {
        map.set(a.clientId, a);
      }
    }
    return map;
  }, [assessments, fiscalYear]);

  const activeAssessment = useMemo(
    () => assessments.find((a) => a.id === activeAssessmentId) ?? null,
    [assessments, activeAssessmentId],
  );

  const clientIds = useMemo(() => new Set(clients.map((c) => c.id)), [clients]);

  const persist = useCallback((nextClients: Client[], nextAssessments: BrsrAssessment[]) => {
    setClients(nextClients);
    setAssessments(nextAssessments);
    writeAssessmentsCache({ clients: nextClients, assessments: nextAssessments });
  }, []);

  const load = useCallback(
    async (options?: { skipCache?: boolean }) => {
      if (!options?.skipCache) {
        const hit = readAssessmentsCache();
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
        const [clientRes, assessmentRows] = await Promise.all([
          listClients(0, CLIENT_PAGE_SIZE),
          listBrsrAssessments(),
        ]);
        persist(clientRes.content, assessmentRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assessments");
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openAssessment = useCallback(
    (assessment: BrsrAssessment) => {
      setActiveAssessmentId(assessment.id);
      onDrilldownChange?.(assessment.clientCompanyName);
      onNavigateToAssessment?.({
        tab: "brsr",
        assessmentId: assessment.id,
        clientId: assessment.clientId,
      });
    },
    [onDrilldownChange, onNavigateToAssessment],
  );

  useEffect(() => {
    if (!initialAssessmentId && activeAssessmentId) {
      setActiveAssessmentId(null);
      onDrilldownChange?.(null);
    }
  }, [initialAssessmentId, activeAssessmentId, onDrilldownChange]);

  useEffect(() => {
    if (!initialAssessmentId || loading || activeAssessmentId) return;
    const match = assessments.find((a) => a.id === initialAssessmentId);
    if (match) openAssessment(match);
  }, [initialAssessmentId, loading, assessments, activeAssessmentId, openAssessment]);

  const handleCreate = useCallback(
    async (clientId: string, clientName: string) => {
      const ok = await confirm({
        title: "Create BRSR assessment?",
        description: (
          <>
            Start a new BRSR assessment for <strong>{clientName}</strong> in financial year{" "}
            <strong>{fiscalYear}</strong>. Only one assessment per client per year is allowed.
          </>
        ),
        confirmLabel: "Create assessment",
      });
      if (!ok) return;

      setBusyClientId(clientId);
      setError("");
      try {
        const created = await createBrsrAssessment({ clientId, fiscalYear });
        const next = [...assessments.filter((a) => a.id !== created.id), created];
        persist(clients, next);
        openAssessment(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create assessment");
      } finally {
        setBusyClientId(null);
      }
    },
    [assessments, clients, confirm, fiscalYear, openAssessment, persist],
  );

  const columns = useMemo<ColumnDef<Client>[]>(
    () => [
      {
        id: "client",
        accessorKey: "companyName",
        header: ({ column }) => <SortableHeader column={column} label="Client" />,
        cell: ({ row }) => (
          <span className="dash-data-table__primary">{row.original.companyName}</span>
        ),
        meta: { mobileLabel: "Client", columnClass: "assessment-col-client" },
      },
      {
        id: "status",
        accessorFn: (client) => {
          const row = assessmentByClient.get(client.id);
          const visible = row && clientIds.has(row.clientId);
          return visible ? brsrStatusLabel(row.status) : "Not started";
        },
        header: ({ column }) => <SortableHeader column={column} label="Status" />,
        cell: ({ row }) => {
          const assessment = assessmentByClient.get(row.original.id);
          const visible = assessment && clientIds.has(assessment.clientId);
          return (
            <span
              className={`workspace-status${
                visible && !isBrsrInProgress(assessment) ? " workspace-status--done" : ""
              }`}
            >
              {visible ? brsrStatusLabel(assessment.status) : "Not started"}
            </span>
          );
        },
        meta: { mobileLabel: "Status", columnClass: "assessment-col-status" },
      },
      {
        id: "progress",
        accessorFn: (client) => {
          const row = assessmentByClient.get(client.id);
          const visible = row && clientIds.has(row.clientId);
          return visible ? row.completionPct : -1;
        },
        header: ({ column }) => <SortableHeader column={column} label="Progress" />,
        cell: ({ row }) => {
          const assessment = assessmentByClient.get(row.original.id);
          const visible = assessment && clientIds.has(assessment.clientId);
          return visible ? `${Math.round(assessment.completionPct)}%` : "-";
        },
        meta: { mobileLabel: "Progress", columnClass: "assessment-col-metric" },
      },
      {
        id: "action",
        enableSorting: false,
        header: () => "Action",
        cell: ({ row }) => {
          const client = row.original;
          const assessment = assessmentByClient.get(client.id);
          const visible = assessment && clientIds.has(assessment.clientId);

          if (visible && isBrsrInProgress(assessment)) {
            return (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() => openAssessment(assessment)}
              >
                Continue
              </button>
            );
          }

          if (visible) {
            return (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() => openAssessment(assessment)}
              >
                View
              </button>
            );
          }

          return (
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: 11 }}
              disabled={busyClientId === client.id}
              onClick={() => void handleCreate(client.id, client.companyName)}
            >
              {busyClientId === client.id ? "Creating…" : "Create assessment"}
            </button>
          );
        },
        meta: { mobileLabel: "Action", columnClass: "assessment-col-action" },
      },
    ],
    [assessmentByClient, busyClientId, clientIds, handleCreate, openAssessment],
  );

  const emptyMessage: ReactNode = (
    <>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text)" }}>No clients yet</p>
      <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
        Add clients first, then start BRSR assessments for FY {fiscalYear}.
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

  if (activeAssessment) {
    return (
      <BrsrWorkspaceView
        assessment={activeAssessment}
        onOpenReport={() =>
          onNavigateToReport?.("brsr", activeAssessment.id, { clientId: activeAssessment.clientId })
        }
      />
    );
  }

  return (
    <div className={embedded ? "brsr-assessment" : undefined}>
      <section className="card card--elevated assessment-hub__panel">
        <DataTable
          data={clients}
          columns={columns}
          getRowId={(row) => row.id}
          tableClassName="dash-data-table assessment-table"
          searchPlaceholder="Search clients…"
          showSearch={clients.length > 3}
          loading={loading}
          loadingMessage="Loading…"
          emptyMessage={emptyMessage}
          emptyFilteredMessage={emptyFilteredMessage}
        />
      </section>

      <button
        type="button"
        className="btn-ghost"
        style={{ alignSelf: "flex-start", fontSize: 11, padding: "6px 12px" }}
        onClick={() => {
          invalidateAssessmentsCache();
          load({ skipCache: true });
        }}
      >
        Refresh
      </button>
    </div>
  );
}
