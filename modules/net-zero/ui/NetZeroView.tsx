"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalculatorField,
  CalculatorPage,
  CalculatorPanel,
  CalculatorWorkspaceTabs,
  ClientProgressDetails,
  CalculatorFormActions,
} from "@/modules/calculators/ui/CalculatorLayout";
import {
  calcHistoryActionColumn,
  calcHistoryDateColumn,
  calcHistoryEmptyFilteredMessage,
  calcHistoryEmptyMessage,
  calcHistoryMetricColumn,
  calcHistoryReportColumn,
  calcHistoryTextColumn,
  CalculatorHistoryPanel,
} from "@/modules/calculators/ui/CalculatorHistoryPanel";
import {
  CalculatorInsightCard,
  CalculatorLiveSummary,
  CalculatorMetricTile,
  CalculatorModuleFormLayout,
  CalculatorWorkbench,
  CalculatorWorkbenchCenter,
  CalculatorWorkbenchError,
  CalculatorWorkbenchFooter,
  CalculatorWorkbenchHeader,
} from "@/modules/calculators/ui/CalculatorWorkbenchLayout";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import {
  autoNzeBaseline,
  createNzeTarget,
  getNzeTarget,
  listNzeSourceFiscalYears,
  listNzeTargets,
  recordNzeProgress,
} from "@/modules/net-zero/api/nzeApi";
import { useNzeClientBootstrap } from "@/modules/net-zero/hooks/useNzeClientBootstrap";
import NetZeroReportDetailView from "@/modules/net-zero/ui/NetZeroReportDetailView";
import type { NzeSourceFiscalYear, NzeTargetResponse } from "@/modules/net-zero/domain/types";
import ReportProcessingModal from "@/modules/reports/ui/ReportProcessingModal";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";

const CLIENT_ROLES: RoleKey[] = ["ca", "cs", "esg_consultant", "assurer_auditor"];
const MAX_EMISSIONS_TCO2E = 9_999_999_999.9999;

function fmt4(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

function num(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function fiscalYearStart(fy: string): number | undefined {
  const match = fy.trim().match(/^(\d{4})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}

function sourceFyLabel(fy: NzeSourceFiscalYear): string {
  const parts: string[] = [];
  if (fy.has_isf) parts.push("ISF");
  if (fy.has_scope3) parts.push("Scope 3");
  const suffix = parts.length > 0 ? ` · ${parts.join(" + ")}` : "";
  return `FY ${fy.fiscal_year}${suffix}`;
}

export default function NetZeroView({
  onNavigateToReport,
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const needsClient = CLIENT_ROLES.includes(role);
  const canWrite = role !== "assurer_auditor";

  const bootstrap = useNzeClientBootstrap(needsClient);

  const [targets, setTargets] = useState<NzeTargetResponse[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"calculate" | "history">("history");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<NzeTargetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoBaselineLoading, setAutoBaselineLoading] = useState(false);
  const [autoBaselineHint, setAutoBaselineHint] = useState("");
  const [sourceFiscalYears, setSourceFiscalYears] = useState<NzeSourceFiscalYear[]>([]);
  const [sourceFyLoading, setSourceFyLoading] = useState(false);
  const [sourceFiscalYear, setSourceFiscalYear] = useState("");
  const [error, setError] = useState("");

  useToastOnValue(error, "error");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"processing" | "success">("processing");
  const [savedReportId, setSavedReportId] = useState("");

  const [form, setForm] = useState<{
    name: string;
    target_type: "net_zero";
    baseline_year: string;
    baseline_emissions: string;
    target_year: string;
    target_reduction_pct: string;
    pathway_type: "linear" | "front_loaded" | "back_loaded";
  }>({
    name: "NZE 2050 Commitment",
    target_type: "net_zero",
    baseline_year: "2022",
    baseline_emissions: "",
    target_year: "2050",
    target_reduction_pct: "90",
    pathway_type: "linear",
  });

  const [progressForm, setProgressForm] = useState({
    fiscal_year: "FY2024-25",
    actual: "",
    offsets: "0",
    notes: "",
  });

  const refreshTargets = useCallback(async () => {
    setTargetsLoading(true);
    try {
      const rows = await listNzeTargets(needsClient ? bootstrap.clientId : undefined, setTargets);
      setTargets(rows);
    } catch {
      setTargets([]);
    } finally {
      setTargetsLoading(false);
    }
  }, [needsClient, bootstrap.clientId]);

  useEffect(() => {
    if (needsClient && !bootstrap.clientId) return;
    void refreshTargets();
  }, [needsClient, bootstrap.clientId, refreshTargets]);

  useEffect(() => {
    if (needsClient && !bootstrap.clientId) {
      setSourceFiscalYears([]);
      setSourceFiscalYear("");
      return;
    }

    let cancelled = false;
    setSourceFyLoading(true);
    void listNzeSourceFiscalYears(needsClient ? bootstrap.clientId : undefined)
      .then((rows) => {
        if (cancelled) return;
        setSourceFiscalYears(rows);
        setSourceFiscalYear((prev) => {
          if (prev && rows.some((r) => r.fiscal_year === prev)) return prev;
          return rows[0]?.fiscal_year ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSourceFiscalYears([]);
          setSourceFiscalYear("");
        }
      })
      .finally(() => {
        if (!cancelled) setSourceFyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsClient, bootstrap.clientId]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    void getNzeTarget(selectedId)
      .then(setSelectedDetail)
      .catch(() => setSelectedDetail(null));
  }, [selectedId]);

  async function handleAutoBaseline() {
    const year = num(form.baseline_year);
    const fy = sourceFiscalYear.trim();
    if (!year) {
      setError("Enter a valid baseline year before auto-fill.");
      return;
    }
    if (!fy) {
      setError(
        sourceFiscalYears.length === 0
          ? "No saved ISF or Scope 3 calculations yet. Save data in those modules first."
          : "Select a fiscal year with saved calculator data.",
      );
      return;
    }
    if (needsClient && !bootstrap.clientId) {
      setError("Select a client before auto-fill.");
      return;
    }

    setError("");
    setAutoBaselineHint("");
    setAutoBaselineLoading(true);
    try {
      const res = await autoNzeBaseline({
        baselineYear: year,
        fiscalYear: fy,
        clientId: needsClient ? bootstrap.clientId : undefined,
      });
      const total = res.baseline_emissions_tco2e;
      const s1 = res.sources.scope1 ?? 0;
      const s2 = res.sources.scope2 ?? 0;
      const s3 = res.sources.scope3 ?? 0;

      if (!total || total <= 0) {
        setError(`No emissions data found for FY ${fy}. Try another fiscal year from the list.`);
        return;
      }

      const fyStart = fiscalYearStart(fy);
      setForm((f) => ({
        ...f,
        baseline_emissions: String(total),
        ...(fyStart ? { baseline_year: String(fyStart) } : {}),
      }));
      setAutoBaselineHint(
        `Loaded FY ${fy}: Scope 1 ${fmt4(s1)} + Scope 2 ${fmt4(s2)} + Scope 3 ${fmt4(s3)} = ${fmt4(total)} tCO₂e`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-baseline failed");
    } finally {
      setAutoBaselineLoading(false);
    }
  }

  async function handleCreate() {
    setError("");

    const baselineEmissions = num(form.baseline_emissions);
    if (baselineEmissions == null || baselineEmissions < 0.0001) {
      setError(
        "Baseline emissions (tCO₂e) must be at least 0.0001, the smallest allowed value. " +
          "Use Auto-fill from ISF + Scope 3 or enter your total baseline emissions manually.",
      );
      return;
    }
    if (baselineEmissions > MAX_EMISSIONS_TCO2E) {
      setError(
        `Baseline emissions (tCO₂e) must be at most ${MAX_EMISSIONS_TCO2E.toLocaleString("en-IN")} tCO₂e.`,
      );
      return;
    }

    const reductionPct = num(form.target_reduction_pct);
    if (reductionPct == null || reductionPct < 0.01 || reductionPct > 100) {
      setError("Target reduction must be between 0.01% and 100%.");
      return;
    }

    setLoading(true);
    setModalOpen(true);
    setModalPhase("processing");
    try {
      const res = await createNzeTarget({
        client_id: needsClient ? bootstrap.clientId : null,
        name: form.name,
        target_type: form.target_type,
        scope: ["scope1", "scope2", "scope3"],
        baseline_year: num(form.baseline_year) ?? 2022,
        baseline_emissions_tco2e: baselineEmissions,
        target_year: num(form.target_year) ?? 2050,
        target_reduction_pct: reductionPct,
        pathway_type: form.pathway_type,
      });
      setWorkspaceTab("history");
      setSavedReportId(res.id);
      setModalPhase("success");
      await refreshTargets();
      await bootstrap.refreshStatus();
    } catch (err) {
      setModalOpen(false);
      setError(err instanceof Error ? err.message : "Failed to create target");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordProgress() {
    if (!selectedId) return;
    setError("");

    const fiscalYear = progressForm.fiscal_year.trim();
    if (!fiscalYear) {
      setError("Fiscal year is required (e.g. 2024-25 or FY2024-25).");
      return;
    }

    const actual = num(progressForm.actual);
    if (actual == null || actual < 0) {
      setError("Actual emissions (tCO₂e) must be a non-negative number.");
      return;
    }
    if (actual > MAX_EMISSIONS_TCO2E) {
      setError(
        `Actual emissions (tCO₂e) must be at most ${MAX_EMISSIONS_TCO2E.toLocaleString("en-IN")} tCO₂e.`,
      );
      return;
    }

    const offsets = num(progressForm.offsets) ?? 0;
    if (offsets < 0) {
      setError("Offset credits (tCO₂e) cannot be negative.");
      return;
    }
    if (offsets > MAX_EMISSIONS_TCO2E) {
      setError(
        `Offset credits (tCO₂e) must be at most ${MAX_EMISSIONS_TCO2E.toLocaleString("en-IN")} tCO₂e.`,
      );
      return;
    }
    if (offsets > actual) {
      setError("Offset credits cannot exceed actual emissions for the same period.");
      return;
    }

    setLoading(true);
    try {
      await recordNzeProgress(selectedId, {
        fiscal_year: fiscalYear,
        actual_emissions_tco2e: actual,
        offset_credits_tco2e: offsets,
        notes: progressForm.notes || undefined,
      });
      const detail = await getNzeTarget(selectedId);
      setSelectedDetail(detail);
      setProgressForm((f) => ({ ...f, actual: "", offsets: "0", notes: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record progress");
    } finally {
      setLoading(false);
    }
  }

  const targetsWithClient = bootstrap.clientStatus.filter((s) => s.has_target).length;

  const historyColumns = useMemo<ColumnDef<NzeTargetResponse>[]>(
    () => [
      calcHistoryReportColumn<NzeTargetResponse>({
        showClientPicker: needsClient,
        clientHeader: "Client",
        calculationHeader: "Target",
        getClientName: (row) => row.client_company_name,
        getFiscalYear: () => null,
        getSubtitle: (row) => `${row.baseline_year} → ${row.target_year}`,
        getTitle: needsClient ? undefined : (row) => row.name,
        getMeta: needsClient
          ? (row) => `${row.name} · ${row.baseline_year} → ${row.target_year}`
          : undefined,
      }),
      calcHistoryMetricColumn({
        id: "reduction",
        label: "Reduction",
        getValue: (row) => row.target_reduction_pct,
        format: (n) => `${fmt4(n)}%`,
      }),
      calcHistoryMetricColumn({
        id: "baseline",
        label: "Baseline tCO₂e",
        getValue: (row) => row.baseline_emissions_tco2e,
        format: (n) => fmt4(n),
      }),
      calcHistoryTextColumn<NzeTargetResponse>({
        id: "sbti",
        label: "SBTi",
        getValue: (row) => (row.sbti_aligned ? "Aligned" : "Review"),
      }),
      calcHistoryTextColumn<NzeTargetResponse>({
        id: "status",
        label: "Status",
        getValue: (row) => row.status ?? "—",
      }),
      calcHistoryDateColumn<NzeTargetResponse>({
        label: "Updated",
        getIso: (row) => row.updated_at,
      }),
      calcHistoryActionColumn<NzeTargetResponse>({
        buttonLabel: "Open target",
        onAction: (row) => setSelectedId(row.id),
      }),
    ],
    [needsClient],
  );

  const clientCompanyName = bootstrap.clients.find((c) => c.id === bootstrap.clientId)?.companyName;

  if (selectedDetail) {
    return (
      <CalculatorPage>
        <button
          type="button"
          className="calc-back-btn"
          onClick={() => setSelectedId(null)}
        >
          ← Back to targets
        </button>
        <NetZeroReportDetailView target={selectedDetail} />
        {canWrite && (
          <CalculatorPanel title="Record progress">
            <div className="calc-form-grid">
              <CalculatorField label="Fiscal year">
                <input
                  className="dash-input"
                  value={progressForm.fiscal_year}
                  onChange={(e) => setProgressForm((f) => ({ ...f, fiscal_year: e.target.value }))}
                  placeholder="2024-25"
                />
              </CalculatorField>
              <CalculatorField label="Actual emissions (tCO₂e)">
                <input
                  className="dash-input"
                  value={progressForm.actual}
                  onChange={(e) => setProgressForm((f) => ({ ...f, actual: e.target.value }))}
                  min={0}
                  max={MAX_EMISSIONS_TCO2E}
                  step="any"
                  placeholder="e.g. 1250.5"
                />
                <p className="calc-field__hint">
                  Maximum {MAX_EMISSIONS_TCO2E.toLocaleString("en-IN")} tCO₂e per record.
                </p>
              </CalculatorField>
              <CalculatorField label="Offset credits (tCO₂e)">
                <input
                  className="dash-input"
                  value={progressForm.offsets}
                  onChange={(e) => setProgressForm((f) => ({ ...f, offsets: e.target.value }))}
                  min={0}
                  max={MAX_EMISSIONS_TCO2E}
                  step="any"
                />
              </CalculatorField>
              <CalculatorField label="Notes">
                <input
                  className="dash-input"
                  value={progressForm.notes}
                  onChange={(e) => setProgressForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </CalculatorField>
            </div>
            <CalculatorFormActions>
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={() => void handleRecordProgress()}
              >
                Save progress
              </button>
            </CalculatorFormActions>
          </CalculatorPanel>
        )}
      </CalculatorPage>
    );
  }

  return (
    <CalculatorPage className="calc-workbench-page">
      <CalculatorWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === "history" ? (
        <CalculatorHistoryPanel
          data={targets}
          columns={historyColumns}
          loading={targetsLoading}
          searchPlaceholder="Search targets…"
          summaryLabel={`${targets.length} target${targets.length === 1 ? "" : "s"}`}
          emptyMessage={calcHistoryEmptyMessage(
            "No net zero targets yet",
            "Switch to Calculator to create your first target.",
          )}
          emptyFilteredMessage={calcHistoryEmptyFilteredMessage}
          toolbarExtra={
            canWrite ? (
              <button type="button" className="btn-primary btn-sm" onClick={() => setWorkspaceTab("calculate")}>
                New target
              </button>
            ) : undefined
          }
        />
      ) : (
        canWrite && (
          <>
            <CalculatorWorkbenchHeader
              eyebrow="Net Zero"
              title={needsClient ? clientCompanyName || "Select client" : "My organisation"}
              meta={sourceFiscalYear ? `Baseline source FY ${sourceFiscalYear}` : "Select source data fiscal year"}
              showClientPicker={needsClient}
              clients={bootstrap.clients}
              clientId={bootstrap.clientId}
              clientsLoading={bootstrap.clientsLoading}
              fiscalYear={sourceFiscalYear}
              onClientChange={bootstrap.setClientId}
              onFiscalYearChange={setSourceFiscalYear}
              showFiscalYear={false}
              extraControls={
                <label className="calc-field">
                  <span className="calc-field__label">Source data FY</span>
                  <select
                    className="dash-input"
                    value={sourceFiscalYear}
                    disabled={
                      sourceFyLoading ||
                      (needsClient && !bootstrap.clientId) ||
                      sourceFiscalYears.length === 0
                    }
                    onChange={(e) => setSourceFiscalYear(e.target.value)}
                    title="Fiscal years with saved ISF or Scope 3 calculator data"
                  >
                    {sourceFiscalYears.length === 0 ? (
                      <option value="">
                        {sourceFyLoading
                          ? "Loading fiscal years…"
                          : needsClient && !bootstrap.clientId
                            ? "Select client first"
                            : "No saved calculator data"}
                      </option>
                    ) : (
                      sourceFiscalYears.map((fy) => (
                        <option key={fy.fiscal_year} value={fy.fiscal_year}>
                          {sourceFyLabel(fy)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              }
            />

            {error && <CalculatorWorkbenchError message={error} />}

            <CalculatorWorkbench noStepper>
              <CalculatorWorkbenchCenter>
                {needsClient && bootstrap.clientStatus.length > 0 && (
                  <ClientProgressDetails
                    completed={targetsWithClient}
                    total={bootstrap.clientStatus.length}
                  >
                    <table className="calc-history-table">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Active targets</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {bootstrap.clientStatus.map((s) => (
                          <tr key={s.client_id}>
                            <td data-label="Client">{s.company_name}</td>
                            <td data-label="Active targets">{s.active_targets}</td>
                            <td data-label="Status">{s.has_target ? "Has target" : "Not started"}</td>
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

                <CalculatorPanel title="New net zero target" subtitle="Define baseline, target year, and reduction pathway">
                  <CalculatorModuleFormLayout
                    form={
                      <>
                        <div className="calc-form-grid">
                          <CalculatorField label="Name">
                            <input
                              className="dash-input"
                              value={form.name}
                              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                          </CalculatorField>
                          <CalculatorField label="Baseline year">
                            <input
                              className="dash-input"
                              value={form.baseline_year}
                              onChange={(e) => setForm((f) => ({ ...f, baseline_year: e.target.value }))}
                            />
                          </CalculatorField>
                          <CalculatorField label="Baseline emissions (tCO₂e)">
                            <input
                              className="dash-input"
                              value={form.baseline_emissions}
                              onChange={(e) => setForm((f) => ({ ...f, baseline_emissions: e.target.value }))}
                              min={0.0001}
                              step="any"
                              placeholder="e.g. 1250.5"
                            />
                            <p className="calc-field__hint">
                              Minimum 0.0001 tCO₂e (total Scope 1 + 2 + 3). Use Auto-fill or enter manually.
                            </p>
                          </CalculatorField>
                          <CalculatorField label="Target year">
                            <input
                              className="dash-input"
                              value={form.target_year}
                              onChange={(e) => setForm((f) => ({ ...f, target_year: e.target.value }))}
                            />
                          </CalculatorField>
                          <CalculatorField label="Reduction %">
                            <input
                              className="dash-input"
                              value={form.target_reduction_pct}
                              onChange={(e) => setForm((f) => ({ ...f, target_reduction_pct: e.target.value }))}
                              min={0.01}
                              max={100}
                              step="any"
                            />
                            <p className="calc-field__hint">Must be between 0.01% and 100%.</p>
                          </CalculatorField>
                          <CalculatorField label="Pathway type">
                            <select
                              className="dash-input"
                              value={form.pathway_type}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  pathway_type: e.target.value as "linear" | "front_loaded" | "back_loaded",
                                }))
                              }
                            >
                              <option value="linear">Linear</option>
                              <option value="front_loaded">Front-loaded</option>
                              <option value="back_loaded">Back-loaded</option>
                            </select>
                          </CalculatorField>
                        </div>
                        <button
                          type="button"
                          className="calc-link-btn"
                          disabled={
                            autoBaselineLoading ||
                            (needsClient && !bootstrap.clientId) ||
                            !sourceFiscalYear
                          }
                          onClick={() => void handleAutoBaseline()}
                        >
                          {autoBaselineLoading
                            ? "Loading ISF + Scope 3 data…"
                            : sourceFiscalYear
                              ? `Auto-fill baseline from ISF + Scope 3 (FY ${sourceFiscalYear})`
                              : "Auto-fill baseline from ISF + Scope 3"}
                        </button>
                        {autoBaselineHint && (
                          <p className="calc-field__hint" style={{ marginTop: "0.5rem" }}>
                            {autoBaselineHint}
                          </p>
                        )}
                      </>
                    }
                    insight={
                      <CalculatorInsightCard title="Target preview">
                        <div className="isf-metric-grid">
                          <CalculatorMetricTile
                            label="Baseline"
                            value={form.baseline_emissions ? `${fmt4(parseFloat(form.baseline_emissions))} tCO₂e` : "-"}
                          />
                          <CalculatorMetricTile
                            label="Reduction"
                            value={form.target_reduction_pct ? `${form.target_reduction_pct}%` : "-"}
                          />
                          <CalculatorMetricTile
                            label="Target year"
                            value={form.target_year || "-"}
                          />
                          <CalculatorMetricTile
                            label="Pathway"
                            value={form.pathway_type.replace(/_/g, " ")}
                          />
                        </div>
                        <p className="isf-insight-card__hint">
                          Targets combine ISF and Scope 3 baseline data for SBTi-aligned planning.
                        </p>
                      </CalculatorInsightCard>
                    }
                  />
                </CalculatorPanel>
              </CalculatorWorkbenchCenter>

              <CalculatorLiveSummary
                title="Live summary"
                metrics={[
                  { label: "Baseline", value: form.baseline_emissions ? `${fmt4(parseFloat(form.baseline_emissions))} tCO₂e` : "-" },
                  { label: "Reduction", value: form.target_reduction_pct ? `${form.target_reduction_pct}%` : "-" },
                  { label: "Period", value: form.baseline_year && form.target_year ? `${form.baseline_year} → ${form.target_year}` : "-" },
                  { label: "Source FY", value: sourceFiscalYear || "-" },
                ]}
              />
            </CalculatorWorkbench>

            <CalculatorWorkbenchFooter
              actions={
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={loading}
                    onClick={() => void handleCreate()}
                  >
                    {loading ? "Creating…" : "Create target"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setWorkspaceTab("history");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                </>
              }
            />
          </>
        )
      )}

      <ReportProcessingModal
        open={modalOpen}
        phase={modalPhase}
        onClose={() => setModalOpen(false)}
        onGoToReports={() => {
          if (onNavigateToReport && savedReportId) {
            onNavigateToReport("net-zero", savedReportId);
          }
          setModalOpen(false);
        }}
      />
    </CalculatorPage>
  );
}
