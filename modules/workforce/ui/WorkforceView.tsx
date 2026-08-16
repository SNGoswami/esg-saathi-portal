"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getWorkforceHistory,
  saveWorkforceReport,
} from "@/modules/workforce/api/workforceApi";
import {
  emptyWorkforceForm,
  fieldLabel,
  formFromInputs,
  inputsFromForm,
  WORKFORCE_SECTIONS,
  type WorkforceFieldDef,
} from "@/modules/workforce/domain/fieldSchema";
import type {
  WorkforceHistoryItem,
  WorkforceInputs,
  WorkforceReportResponse,
  WorkforceSectionId,
} from "@/modules/workforce/domain/types";
import {
  useWorkforceClientBootstrap,
  type WorkforceRecordHandlers,
} from "@/modules/workforce/hooks/useWorkforceClientBootstrap";
import {
  genericSectionCompletion,
} from "@/modules/calculators/domain/workbenchCompletion";
import {
  CalculatorField,
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
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";
import { getCurrentFiscalYear, isPriorFiscalYear } from "@/modules/platform/utils/fiscalYear";
import { FiscalYearFormGate } from "@/modules/calculators/ui/FiscalYearFormGate";

const CLIENT_ROLES: RoleKey[] = ["ca", "cs", "esg_consultant", "assurer_auditor"];

function fieldStep(field: WorkforceFieldDef): string {
  if (field.step) return field.step;
  if (field.input_type === "percent") return "0.01";
  if (field.input_type === "number_decimal") return "0.0001";
  if (field.integer) return "1";
  return "any";
}

export default function WorkforceView({
  onNavigateToReport,
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const showClientPicker = CLIENT_ROLES.includes(role);

  const [sectionTab, setSectionTab] = useState<WorkforceSectionId>("employee-headcount");
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [form, setForm] = useState(emptyWorkforceForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadedRecord, setLoadedRecord] = useState<WorkforceReportResponse | null>(null);
  const [history, setHistory] = useState<WorkforceHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"calculate" | "history">("calculate");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"processing" | "success">("processing");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const recordHandlersRef = useRef<WorkforceRecordHandlers | null>(null);

  const applyForm = useCallback((inputs?: WorkforceInputs) => {
    setForm(formFromInputs(inputs));
    if (!inputs) setLoadedRecord(null);
  }, []);

  recordHandlersRef.current = { applyForm, setResult: setLoadedRecord };

  const {
    clients,
    clientId,
    setClientId,
    clientStatus,
    clientsLoading,
    recordLoading,
    refreshStatus,
  } = useWorkforceClientBootstrap(showClientPicker, fiscalYear, recordHandlersRef);

  const activeSection = WORKFORCE_SECTIONS.find((s) => s.id === sectionTab) ?? WORKFORCE_SECTIONS[0];
  const activeSectionIndex = Math.max(
    0,
    WORKFORCE_SECTIONS.findIndex((s) => s.id === sectionTab),
  );
  const completedCount = clientStatus.filter((s) => s.has_report).length;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await getWorkforceHistory(
        {
          fiscalYear: fiscalYear || undefined,
          clientId: showClientPicker ? undefined : clientId || undefined,
        },
        setHistory,
      );
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [fiscalYear, clientId, showClientPicker]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function updateField(key: keyof WorkforceInputs, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "posh_filed" || key === "posh_resolved") {
        const filed = parseInt(next.posh_filed || "0", 10);
        const resolved = parseInt(next.posh_resolved || "0", 10);
        if (Number.isFinite(filed) && Number.isFinite(resolved)) {
          next.posh_pending = String(Math.max(0, filed - resolved));
        }
      }
      return next;
    });
  }

  function goToSection(index: number) {
    const section = WORKFORCE_SECTIONS[index];
    if (section) setSectionTab(section.id);
  }

  async function handleSave(advance = false) {
    if (showClientPicker && !clientId) {
      setError("Select a client before saving.");
      return;
    }
    const isLastSection = activeSectionIndex >= WORKFORCE_SECTIONS.length - 1;
    const showSuccessModal = isLastSection || !advance;

    setSaving(true);
    setError("");
    if (showSuccessModal) {
      setModalOpen(true);
      setModalPhase("processing");
      setSavedReportId(null);
    }
    try {
      const inputs = inputsFromForm(form);
      const res = await saveWorkforceReport({
        ...inputs,
        client_id: clientId || null,
        fiscal_year: fiscalYear,
      });
      if (showSuccessModal) {
        await new Promise((r) => setTimeout(r, 600));
        setSavedReportId(res.id);
        setLoadedRecord(res);
        setModalPhase("success");
      } else {
        goToSection(activeSectionIndex + 1);
      }
      void loadHistory();
      void refreshStatus();
    } catch (e) {
      if (showSuccessModal) setModalOpen(false);
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled =
    saving || recordLoading || (showClientPicker && !clientId) || isPriorFiscalYear(fiscalYear);
  const formReadOnly = isPriorFiscalYear(fiscalYear);
  const hasRecordForFy = loadedRecord?.inputs != null;
  const isLastSection = activeSectionIndex >= WORKFORCE_SECTIONS.length - 1;

  const historyColumns = useMemo<ColumnDef<WorkforceHistoryItem>[]>(
    () => [
      calcHistoryReportColumn<WorkforceHistoryItem>({
        showClientPicker,
        getClientName: (row) => row.client_company_name,
        getFiscalYear: (row) => row.fiscal_year,
        getSubtitle: () => "Workforce report",
      }),
      calcHistoryDateColumn<WorkforceHistoryItem>({
        getIso: (row) => row.updated_at,
      }),
      calcHistoryActionColumn<WorkforceHistoryItem>({
        onAction: (row) => onNavigateToReport?.("workforce", row.id),
      }),
    ],
    [showClientPicker, onNavigateToReport],
  );

  const overallCompletion = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const section of WORKFORCE_SECTIONS) {
      const row = genericSectionCompletion(section.fields, form);
      filled += row.filled;
      total += row.total;
    }
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, pct };
  }, [form]);

  const sectionModules = useMemo<WorkbenchModuleItem[]>(
    () =>
      WORKFORCE_SECTIONS.map((section) => {
        const completion = genericSectionCompletion(section.fields, form);
        return {
          id: section.id,
          label: section.title,
          icon: "users",
          sublabel: `${completion.filled}/${completion.total} fields`,
          done: completion.pct >= 75,
        };
      }),
    [form],
  );

  const activeSectionCompletion = genericSectionCompletion(activeSection.fields, form);
  const sectionsComplete = WORKFORCE_SECTIONS.filter(
    (s) => genericSectionCompletion(s.fields, form).pct >= 75,
  ).length;
  const clientCompanyName = clients.find((c) => c.id === clientId)?.companyName;

  function openNextPending() {
    const next = clientStatus.find((s) => !s.has_report);
    if (next) setClientId(next.client_id);
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

      {workspaceTab === "calculate" && (
        <>
          <CalculatorWorkbenchHeader
            eyebrow="Workforce"
            title={showClientPicker ? clientCompanyName || "Select client" : "My organisation"}
            badges={
              showClientPicker && clientStatus.length > 0 ? (
                <span className="isf-client-header__badge">
                  {completedCount}/{clientStatus.length} clients complete
                </span>
              ) : undefined
            }
            showClientPicker={showClientPicker}
            clients={clients}
            clientId={clientId}
            clientsLoading={clientsLoading}
            recordLoading={recordLoading}
            fiscalYear={fiscalYear}
            onClientChange={setClientId}
            onFiscalYearChange={setFiscalYear}
            onOpenNextPending={showClientPicker ? openNextPending : undefined}
          />

          {error && <CalculatorWorkbenchError message={error} />}

          <CalculatorWorkbench>
            <CalculatorModuleStepper
              modules={sectionModules}
              active={sectionTab}
              onChange={(id) => setSectionTab(id as WorkforceSectionId)}
              completionPct={overallCompletion.pct}
              label="Sections"
            />

            <FiscalYearFormGate
              layout="workbench"
              fiscalYear={fiscalYear}
              recordLoading={recordLoading}
              hasRecord={hasRecordForFy}
            >
              <CalculatorWorkbenchCenter>
              {showClientPicker && clientStatus.length > 0 && (
                <ClientProgressDetails
                  fiscalYear={fiscalYear}
                  completed={completedCount}
                  total={clientStatus.length}
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
                      {clientStatus.map((s) => (
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
                              onClick={() => setClientId(s.client_id)}
                            >
                              {clientId === s.client_id ? "Selected" : "Open"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ClientProgressDetails>
              )}

              <CalculatorPanel title={activeSection.title} subtitle={activeSection.subtitle}>
                <CalculatorModuleFormLayout
                  form={
                    <div className="calc-form-grid">
                      {activeSection.fields.map((field) => (
                        <CalculatorField key={field.field_id} label={fieldLabel(field)}>
                          <input
                            className="dash-input"
                            type="number"
                            step={fieldStep(field)}
                            min={0}
                            max={field.input_type === "percent" ? 100 : undefined}
                            value={form[field.api_field]}
                            readOnly={field.readOnly || formReadOnly}
                            disabled={formReadOnly && !field.readOnly}
                            onChange={(e) => updateField(field.api_field, e.target.value)}
                          />
                          {field.hint && <span className="calc-field__hint">{field.hint}</span>}
                        </CalculatorField>
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
                      </div>
                      {activeSection.subtitle && (
                        <p className="isf-insight-card__hint">{activeSection.subtitle}</p>
                      )}
                    </CalculatorInsightCard>
                  }
                />
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
                  value: `${sectionsComplete}/${WORKFORCE_SECTIONS.length}`,
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
          searchPlaceholder="Search workforce reports…"
          summaryLabel={`${history.length} report${history.length === 1 ? "" : "s"}${fiscalYear ? ` for FY ${fiscalYear}` : ""}`}
          emptyMessage={calcHistoryEmptyMessage(
            "No workforce reports yet",
            "Fill in the form and click Save & Complete to create your first report.",
          )}
          emptyFilteredMessage={calcHistoryEmptyFilteredMessage}
        />
      )}

      <ReportProcessingModal
        open={modalOpen}
        phase={modalPhase}
        processingTitle="Saving…"
        processingDesc="Computing your workforce metrics and preparing the report."
        successTitle="Report saved"
        successDesc="Your workforce report is ready to view in Reports."
        onGoToReports={() => {
          setModalOpen(false);
          if (savedReportId) onNavigateToReport?.("workforce", savedReportId);
        }}
        onClose={() => setModalOpen(false)}
      />
    </CalculatorPage>
  );
}
