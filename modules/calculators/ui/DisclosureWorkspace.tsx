"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  DisclosureHistoryItem,
  DisclosureReportResponse,
  DisclosureSectionDef,
  PolicyMatrixRow,
} from "@/modules/calculators/domain/disclosureTypes";
import { isFieldVisible } from "@/modules/calculators/domain/disclosureFormHelpers";
import { useDisclosureBootstrap } from "@/modules/calculators/hooks/useDisclosureBootstrap";
import { DisclosureFieldInput } from "@/modules/calculators/ui/DisclosureFieldInput";
import {
  brsrFieldCount,
  overallFormCompletion,
  sectionFieldCompletion,
} from "@/modules/calculators/domain/workbenchCompletion";
import {
  CalculatorPage,
  CalculatorPanel,
  CalculatorWorkspaceTabs,
  ClientProgressDetails,
} from "@/modules/calculators/ui/CalculatorLayout";
import {
  calcHistoryActionColumn,
  calcHistoryDateColumn,
  calcHistoryEmptyFilteredMessage,
  calcHistoryEmptyMessage,
  calcHistoryReportColumn,
  CalculatorHistoryPanel,
} from "@/modules/calculators/ui/CalculatorHistoryPanel";
import {
  CalculatorInsightCard,
  CalculatorLiveSummary,
  CalculatorMetricTile,
  CalculatorModuleFormLayout,
  CalculatorModuleStepper,
  CalculatorWorkbench,
  CalculatorWorkbenchCenter,
  CalculatorWorkbenchError,
  CalculatorWorkbenchFooter,
  CalculatorWorkbenchHeader,
  type WorkbenchModuleItem,
} from "@/modules/calculators/ui/CalculatorWorkbenchLayout";
import ReportProcessingModal from "@/modules/reports/ui/ReportProcessingModal";
import { FiscalYearFormGate } from "@/modules/calculators/ui/FiscalYearFormGate";
import { getCurrentFiscalYear, isPriorFiscalYear } from "@/modules/platform/utils/fiscalYear";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";

const CLIENT_ROLES: RoleKey[] = ["ca", "cs", "esg_consultant", "assurer_auditor"];

type DisclosureApi<TInputs> = {
  save: (req: TInputs & { client_id?: string | null; fiscal_year?: string }) => Promise<{ id: string }>;
  history: (params?: { clientId?: string; fiscalYear?: string }) => Promise<DisclosureHistoryItem[]>;
  getClientStatus: (fiscalYear: string) => Promise<
    { client_id: string; company_name: string; has_report: boolean; report_id?: string }[]
  >;
  getRecord: (
    clientId: string,
    fiscalYear: string,
  ) => Promise<DisclosureReportResponse<TInputs> | null>;
  getMsmeRecord?: (fiscalYear: string) => Promise<DisclosureReportResponse<TInputs> | null>;
};

export type DisclosureWorkspaceProps<TInputs> = {
  title: string;
  reportCategory: string;
  sections: DisclosureSectionDef[];
  emptyForm: () => Record<string, string>;
  formFromInputs: (inputs?: TInputs) => Record<string, string>;
  inputsFromForm: (form: Record<string, string>, policyMatrix?: PolicyMatrixRow[]) => TInputs;
  policyMatrixFromInputs?: (inputs?: TInputs) => PolicyMatrixRow[];
  renderPolicyMatrix?: (props: {
    rows: PolicyMatrixRow[];
    onChange: (rows: PolicyMatrixRow[]) => void;
    readOnly?: boolean;
  }) => ReactNode;
  api: DisclosureApi<TInputs>;
  onNavigateToReport?: (category: string, reportId: string) => void;
  processingDesc?: string;
  successDesc?: string;
};

export function DisclosureWorkspace<TInputs>({
  title,
  reportCategory,
  sections,
  emptyForm,
  formFromInputs,
  inputsFromForm,
  policyMatrixFromInputs,
  renderPolicyMatrix,
  api,
  onNavigateToReport,
  processingDesc = "Saving your disclosures and preparing the report.",
  successDesc = "Your report is ready to view in Reports.",
}: DisclosureWorkspaceProps<TInputs>) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const showClientPicker = CLIENT_ROLES.includes(role);
  const isMsme = role === "msme";

  const [sectionTab, setSectionTab] = useState(sections[0]?.id ?? "");
  const activeSectionIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === sectionTab),
  );
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [form, setForm] = useState(emptyForm);
  const [policyMatrix, setPolicyMatrix] = useState<PolicyMatrixRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DisclosureHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"calculate" | "history">("calculate");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"processing" | "success">("processing");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [loadedRecord, setLoadedRecord] = useState<DisclosureReportResponse<TInputs> | null>(null);

  const handlersRef = useRef<{
    applyInputs: (inputs?: TInputs) => void;
    setResult: (record: DisclosureReportResponse<TInputs> | null) => void;
  } | null>(null);

  const apiRef = useRef(api);
  apiRef.current = api;

  const applyInputs = useCallback(
    (inputs?: TInputs) => {
      setForm(formFromInputs(inputs));
      if (policyMatrixFromInputs) {
        setPolicyMatrix(policyMatrixFromInputs(inputs));
      }
    },
    [formFromInputs, policyMatrixFromInputs],
  );

  handlersRef.current = {
    applyInputs,
    setResult: setLoadedRecord,
  };

  const bootstrap = useDisclosureBootstrap(
    reportCategory,
    {
      getClientStatus: (fy) => api.getClientStatus(fy),
      getRecord: (cid, fy) => api.getRecord(cid, fy),
      getMsmeRecord: api.getMsmeRecord,
    },
    showClientPicker,
    isMsme,
    fiscalYear,
    handlersRef,
  );

  const activeSection = sections.find((s) => s.id === sectionTab) ?? sections[0];
  const completedCount = bootstrap.clientStatus.filter((s) => s.has_report).length;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await apiRef.current.history({
        fiscalYear: fiscalYear || undefined,
        clientId: showClientPicker ? undefined : bootstrap.clientId || undefined,
      });
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [fiscalYear, bootstrap.clientId, showClientPicker]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (policyMatrixFromInputs && policyMatrix.length === 0) {
      setPolicyMatrix(policyMatrixFromInputs(undefined));
    }
  }, [policyMatrixFromInputs, policyMatrix.length]);

  function updateField(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "grievances_filed" || key === "grievances_resolved") {
        const filed = parseInt(next.grievances_filed || "0", 10);
        const resolved = parseInt(next.grievances_resolved || "0", 10);
        if (Number.isFinite(filed) && Number.isFinite(resolved)) {
          next.grievances_pending = String(Math.max(0, filed - resolved));
        }
      }
      if (key === "csr_obligation_inr_lakhs" || key === "csr_spent_inr_lakhs") {
        const obligation = parseFloat(next.csr_obligation_inr_lakhs || "0");
        const spent = parseFloat(next.csr_spent_inr_lakhs || "0");
        if (Number.isFinite(obligation) && Number.isFinite(spent)) {
          next.csr_unspent_inr_lakhs = String(obligation - spent);
        }
      }
      return next;
    });
  }

  async function handleSave(advance = false) {
    if (showClientPicker && !bootstrap.clientId) {
      setError("Select a client before saving.");
      return;
    }
    const isLastSection = activeSectionIndex >= sections.length - 1;
    const showSuccessModal = isLastSection || !advance;

    setSaving(true);
    setError("");
    if (showSuccessModal) {
      setModalOpen(true);
      setModalPhase("processing");
      setSavedReportId(null);
    }
    try {
      const inputs = inputsFromForm(form, policyMatrix.length ? policyMatrix : undefined);
      const res = await api.save({
        ...inputs,
        client_id: bootstrap.clientId || null,
        fiscal_year: fiscalYear,
      });
      if (showSuccessModal) {
        await new Promise((r) => setTimeout(r, 600));
        setSavedReportId(res.id);
        setModalPhase("success");
      } else {
        goToSection(activeSectionIndex + 1);
      }
      void loadHistory();
      void bootstrap.refreshStatus();
    } catch (e) {
      if (showSuccessModal) setModalOpen(false);
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled =
    saving ||
    bootstrap.recordLoading ||
    (showClientPicker && !bootstrap.clientId) ||
    isPriorFiscalYear(fiscalYear);

  const formReadOnly = isPriorFiscalYear(fiscalYear);
  const hasRecordForFy = loadedRecord?.inputs != null;

  const isLastSection = activeSectionIndex >= sections.length - 1;

  function goToSection(index: number) {
    const section = sections[index];
    if (section) setSectionTab(section.id);
  }

  const historyColumns = useMemo<ColumnDef<DisclosureHistoryItem>[]>(
    () => [
      calcHistoryReportColumn<DisclosureHistoryItem>({
        showClientPicker,
        getClientName: (row) => row.client_company_name,
        getFiscalYear: (row) => row.fiscal_year,
        getSubtitle: () => title,
      }),
      calcHistoryDateColumn<DisclosureHistoryItem>({
        getIso: (row) => row.updated_at,
      }),
      calcHistoryActionColumn<DisclosureHistoryItem>({
        onAction: (row) => onNavigateToReport?.(reportCategory, row.id),
      }),
    ],
    [showClientPicker, title, onNavigateToReport, reportCategory],
  );

  const overallCompletion = useMemo(
    () => overallFormCompletion(sections, form),
    [sections, form],
  );

  const sectionModules = useMemo<WorkbenchModuleItem[]>(
    () =>
      sections.map((section) => {
        const completion = sectionFieldCompletion(section, form);
        return {
          id: section.id,
          label: section.shortTitle ?? section.title,
          icon: "file-text",
          sublabel:
            section.variant === "policy_matrix"
              ? "Policy matrix"
              : `${completion.filled}/${completion.total} fields`,
          done: completion.pct >= 75,
        };
      }),
    [sections, form],
  );

  const activeSectionCompletion = activeSection
    ? sectionFieldCompletion(activeSection, form)
    : { filled: 0, total: 0, pct: 0 };

  const sectionsComplete = sections.filter(
    (s) => sectionFieldCompletion(s, form).pct >= 75,
  ).length;

  const clientCompanyName = bootstrap.clients.find((c) => c.id === bootstrap.clientId)?.companyName;

  function openNextPending() {
    const next = bootstrap.clientStatus.find((s) => !s.has_report);
    if (next) bootstrap.setClientId(next.client_id);
  }

  return (
    <CalculatorPage className="calc-workbench-page">
      <CalculatorWorkspaceTabs
        active={workspaceTab}
        onChange={(tab) => {
          setWorkspaceTab(tab);
          if (tab === "history") void loadHistory();
        }}
      />

      {workspaceTab === "calculate" && activeSection && (
        <>
          <CalculatorWorkbenchHeader
            eyebrow={title}
            title={showClientPicker ? clientCompanyName || "Select client" : "My organisation"}
            badges={
              showClientPicker && bootstrap.clientStatus.length > 0 ? (
                <span className="isf-client-header__badge">
                  {completedCount}/{bootstrap.clientStatus.length} clients complete
                </span>
              ) : undefined
            }
            showClientPicker={showClientPicker}
            clients={bootstrap.clients}
            clientId={bootstrap.clientId}
            clientsLoading={bootstrap.clientsLoading}
            recordLoading={bootstrap.recordLoading}
            fiscalYear={fiscalYear}
            onClientChange={bootstrap.setClientId}
            onFiscalYearChange={setFiscalYear}
            onOpenNextPending={showClientPicker ? openNextPending : undefined}
          />

          {error && <CalculatorWorkbenchError message={error} />}

          <CalculatorWorkbench>
            <CalculatorModuleStepper
              modules={sectionModules}
              active={sectionTab}
              onChange={setSectionTab}
              completionPct={overallCompletion.pct}
              label="Sections"
            />

            <FiscalYearFormGate
              layout="workbench"
              fiscalYear={fiscalYear}
              recordLoading={bootstrap.recordLoading}
              hasRecord={hasRecordForFy}
            >
              <CalculatorWorkbenchCenter>
              {showClientPicker && bootstrap.clientStatus.length > 0 && (
                <ClientProgressDetails
                  fiscalYear={fiscalYear}
                  completed={completedCount}
                  total={bootstrap.clientStatus.length}
                >
                  <table className="calc-history-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {bootstrap.clientStatus.map((s) => (
                        <tr key={s.client_id}>
                          <td data-label="Client">{s.company_name}</td>
                          <td data-label="Status">
                            <span
                              className={`calc-status-pill ${s.has_report ? "calc-status-pill--done" : "calc-status-pill--pending"}`}
                            >
                              {s.has_report ? "Done" : "Pending"}
                            </span>
                          </td>
                          <td className="dash-table__action" data-label="">
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ fontSize: "0.7rem", width: "100%" }}
                              onClick={() => bootstrap.setClientId(s.client_id)}
                            >
                              {bootstrap.clientId === s.client_id ? "Selected" : "Open"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ClientProgressDetails>
              )}

              <CalculatorPanel title={activeSection.title} subtitle={activeSection.subtitle}>
                {activeSection.variant === "policy_matrix" && renderPolicyMatrix ? (
                  renderPolicyMatrix({
                    rows: policyMatrix,
                    onChange: setPolicyMatrix,
                    readOnly: formReadOnly,
                  })
                ) : (
                  <CalculatorModuleFormLayout
                    form={
                      <div className="calc-form-grid">
                        {(activeSection.fields ?? [])
                          .filter((f) => isFieldVisible(f, form))
                          .map((field) => (
                            <DisclosureFieldInput
                              key={field.field_id}
                              field={field}
                              value={form[field.api_field] ?? ""}
                              disabled={formReadOnly}
                              onChange={(v) => updateField(field.api_field, v)}
                            />
                          ))}
                      </div>
                    }
                    insight={
                      <CalculatorInsightCard title="Section insight">
                        <div className="isf-metric-grid">
                          <CalculatorMetricTile
                            label="Fields complete"
                            value={`${activeSectionCompletion.filled}/${activeSectionCompletion.total}`}
                          />
                          <CalculatorMetricTile
                            label="Completion"
                            value={`${activeSectionCompletion.pct}%`}
                          />
                          {(activeSection.fields ?? []).length > 0 && (
                            <CalculatorMetricTile
                              label="BRSR fields"
                              value={String(brsrFieldCount(activeSection.fields ?? []))}
                            />
                          )}
                        </div>
                        {activeSection.subtitle && (
                          <p className="isf-insight-card__hint">{activeSection.subtitle}</p>
                        )}
                      </CalculatorInsightCard>
                    }
                  />
                )}
              </CalculatorPanel>
            </CalculatorWorkbenchCenter>

            <CalculatorLiveSummary
              title="Live summary"
              metrics={[
                { label: "Overall completion", value: `${overallCompletion.pct}%` },
                {
                  label: "Fields filled",
                  value: `${overallCompletion.filled}/${overallCompletion.total}`,
                },
                {
                  label: "Sections complete",
                  value: `${sectionsComplete}/${sections.length}`,
                },
                { label: "Fiscal year", value: fiscalYear },
              ]}
            />
            </FiscalYearFormGate>
          </CalculatorWorkbench>

          <CalculatorWorkbenchFooter
            actions={
              <>
                {activeSectionIndex > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={saving}
                    onClick={() => goToSection(activeSectionIndex - 1)}
                  >
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saveDisabled}
                  onClick={() => void handleSave(!isLastSection)}
                >
                  {saving
                    ? "Saving…"
                    : isLastSection
                      ? "Save & Complete"
                      : "Save and Next"}
                </button>
              </>
            }
          />
        </>
      )}

      {workspaceTab === "history" && (
        <CalculatorHistoryPanel
          data={history}
          columns={historyColumns}
          loading={historyLoading}
          searchPlaceholder={`Search ${title.toLowerCase()} reports…`}
          summaryLabel={`${history.length} report${history.length === 1 ? "" : "s"}${fiscalYear ? ` for FY ${fiscalYear}` : ""}`}
          emptyMessage={calcHistoryEmptyMessage(
            `No ${title.toLowerCase()} reports yet`,
            "Fill in the form and click Save & Complete to create your first report.",
          )}
          emptyFilteredMessage={calcHistoryEmptyFilteredMessage}
        />
      )}

      <ReportProcessingModal
        open={modalOpen}
        phase={modalPhase}
        processingTitle="Saving…"
        processingDesc={processingDesc}
        successTitle="Report saved"
        successDesc={successDesc}
        onGoToReports={() => {
          setModalOpen(false);
          if (savedReportId) onNavigateToReport?.(reportCategory, savedReportId);
        }}
        onClose={() => setModalOpen(false)}
      />
    </CalculatorPage>
  );
}
