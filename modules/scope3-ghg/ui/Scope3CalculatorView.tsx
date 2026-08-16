"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcCacheKey, hasCalculatorCache, readCalculatorCache } from "@/modules/calculators/cache/calculatorCache";
import {
  calculateScope3,
  getScope3Factors,
  getScope3History,
  getScope3Summary,
} from "@/modules/scope3-ghg/api/scope3Api";
import {
  useScope3ClientBootstrap,
  type Scope3RecordHandlers,
} from "@/modules/scope3-ghg/hooks/useScope3ClientBootstrap";
import { SCOPE3_CATEGORY_NUMBERS } from "@/modules/scope3-ghg/domain/categoryNumbers";
import type {
  Scope3CalculationResponse,
  Scope3CategoryFactor,
  Scope3HistoryItem,
  Scope3Method,
  Scope3SummaryResponse,
} from "@/modules/scope3-ghg/domain/types";
import {
  CalculatorField,
  CalculatorModuleTabs,
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
  type WorkbenchModuleItem,
} from "@/modules/calculators/ui/CalculatorWorkbenchLayout";
import { Scope3CategoryStepper } from "@/modules/scope3-ghg/ui/Scope3CategoryStepper";
import { FiscalYearFormGate } from "@/modules/calculators/ui/FiscalYearFormGate";
import { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import ReportProcessingModal from "@/modules/reports/ui/ReportProcessingModal";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";
import { getCurrentFiscalYear, isPriorFiscalYear } from "@/modules/platform/utils/fiscalYear";

const CLIENT_ROLES: RoleKey[] = ["ca", "cs", "esg_consultant", "assurer_auditor"];

function fmt4(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

function num(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function Scope3CalculatorView({
  onNavigateToReport,
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const needsClient = CLIENT_ROLES.includes(role);
  const chartTheme = useCalcChartTheme();

  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [factors, setFactors] = useState<Scope3CategoryFactor[]>([]);
  const [factorsLoading, setFactorsLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<number | "summary">(1);
  const [method, setMethod] = useState<Scope3Method>("spend_based");
  const [spendInr, setSpendInr] = useState("");
  const [activityInputs, setActivityInputs] = useState<Record<string, string>>({});
  const [material, setMaterial] = useState(false);
  const [result, setResult] = useState<Scope3CalculationResponse | null>(null);
  const [summary, setSummary] = useState<Scope3SummaryResponse | null>(null);
  const [history, setHistory] = useState<Scope3HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"calculate" | "history">("calculate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"processing" | "success">("processing");
  const [savedReportId, setSavedReportId] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handlersRef = useRef<Scope3RecordHandlers | null>(null);
  handlersRef.current = { setSummary };

  const bootstrap = useScope3ClientBootstrap(needsClient, fiscalYear, handlersRef);

  const currentFactor = useMemo(
    () => factors.find((f) => f.number === activeCat),
    [factors, activeCat],
  );

  useEffect(() => {
    const factorsKey = calcCacheKey("scope3", "factors");
    const cachedFactors = readCalculatorCache<Scope3CategoryFactor[]>(factorsKey);
    if (cachedFactors?.length) {
      setFactors(cachedFactors);
      setFactorsLoading(false);
    }
    void getScope3Factors((fresh) => {
      setFactors(fresh);
      setFactorsLoading(false);
    }).catch(() => {
      setFactors([]);
      setFactorsLoading(false);
    });
  }, []);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const s = await getScope3Summary(
        fiscalYear,
        needsClient ? bootstrap.clientId : undefined,
        setSummary,
      );
      setSummary(s);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [fiscalYear, needsClient, bootstrap.clientId]);

  const refreshHistory = useCallback(async () => {
    const historyKey = calcCacheKey(
      "scope3",
      "history",
      needsClient ? fiscalYear : undefined,
      needsClient ? bootstrap.clientId : undefined,
    );
    if (!hasCalculatorCache(historyKey)) setHistoryLoading(true);
    try {
      const rows = await getScope3History(
        needsClient ? bootstrap.clientId : undefined,
        needsClient ? fiscalYear : undefined,
        setHistory,
      );
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [needsClient, bootstrap.clientId, fiscalYear]);

  useEffect(() => {
    if (!fiscalYear) return;
    if (needsClient && !bootstrap.clientId) return;

    const summaryKey = calcCacheKey(
      "scope3",
      "summary",
      fiscalYear,
      needsClient ? bootstrap.clientId : undefined,
    );
    const cachedSummary = readCalculatorCache<Scope3SummaryResponse>(summaryKey);
    if (cachedSummary) setSummary(cachedSummary);

    const historyKey = calcCacheKey(
      "scope3",
      "history",
      needsClient ? fiscalYear : undefined,
      needsClient ? bootstrap.clientId : undefined,
    );
    const cachedHistory = readCalculatorCache<Scope3HistoryItem[]>(historyKey);
    if (cachedHistory) setHistory(cachedHistory);

    void refreshSummary();
    void refreshHistory();
  }, [fiscalYear, needsClient, bootstrap.clientId, refreshSummary, refreshHistory]);

  useEffect(() => {
    if (activeCat === "summary" || !currentFactor) return;
    if (!currentFactor.methods.includes(method)) {
      setMethod(currentFactor.methods[0] ?? "spend_based");
    }
    const defaults: Record<string, string> = {};
    for (const f of currentFactor.activity_inputs ?? []) {
      if (f.default) defaults[f.field] = f.default;
    }
    setActivityInputs(defaults);
    setResult(null);
    setSpendInr("");
  }, [activeCat, currentFactor, method]);

  async function handleSaveAndNext() {
    if (isPriorFy) return;
    if (activeCat === "summary") return;
    const categoryNumber = activeCat as number;
    const isFinalCategory = categoryNumber === 15;

    setError("");
    setLoading(true);
    if (isFinalCategory) {
      setModalOpen(true);
      setModalPhase("processing");
    }

    try {
      const activity: Record<string, number> | undefined =
        method === "activity_based"
          ? Object.fromEntries(
              Object.entries(activityInputs)
                .map(([k, v]) => [k, num(v)] as const)
                .filter((entry): entry is [string, number] => entry[1] != null),
            )
          : undefined;

      const res = await calculateScope3({
        client_id: needsClient ? bootstrap.clientId : null,
        fiscal_year: fiscalYear,
        category_number: categoryNumber,
        method,
        material,
        spend_inr: method === "spend_based" ? num(spendInr) : undefined,
        activity_inputs: activity,
      });
      setResult(res);
      setSavedReportId(res.id);
      await refreshSummary();
      await refreshHistory();
      await bootstrap.refreshStatus();

      if (isFinalCategory) {
        setModalPhase("success");
      } else {
        setActiveCat(categoryNumber + 1);
      }
    } catch (err) {
      if (isFinalCategory) setModalOpen(false);
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(
    () =>
      (summary?.categories ?? [])
        .filter((c) => c.emissions_tco2e != null && c.emissions_tco2e > 0)
        .map((c) => ({ name: `${c.number}`, tco2e: c.emissions_tco2e, label: c.name })),
    [summary],
  );

  const statusFor = (catNum: number) => {
    const row = summary?.categories.find((c) => c.number === catNum);
    if (!row?.emissions_tco2e) return "pending";
    return row.material ? "material" : "done";
  };

  const completedClients = bootstrap.clientStatus.filter((s) => s.has_calculations).length;

  const historyColumns = useMemo<ColumnDef<Scope3HistoryItem>[]>(
    () => [
      calcHistoryReportColumn<Scope3HistoryItem>({
        showClientPicker: needsClient,
        getClientName: (row) => row.client_company_name,
        getFiscalYear: (row) => row.fiscal_year,
        getSubtitle: () => "Scope 3 calculation",
      }),
      calcHistoryMetricColumn({
        id: "total",
        label: "Total tCO₂e",
        getValue: (row) => row.total_scope3_tco2e,
        format: (n) => fmt4(n),
      }),
      calcHistoryTextColumn<Scope3HistoryItem>({
        id: "cats",
        label: "Categories",
        getValue: (row) => `${row.categories_completed ?? 0}/15`,
        columnClass: "calc-history-col-metric",
      }),
      calcHistoryDateColumn<Scope3HistoryItem>({
        label: "Updated",
        getIso: (row) => row.updated_at,
      }),
      calcHistoryActionColumn<Scope3HistoryItem>({
        onAction: (row) => onNavigateToReport?.("scope3", row.id),
      }),
    ],
    [needsClient, onNavigateToReport],
  );

  const categoriesComplete = summary?.categories.filter((c) => c.emissions_tco2e).length ?? 0;
  const completionPct = Math.round((categoriesComplete / 15) * 100);
  const activeModuleId = activeCat === "summary" ? "summary" : String(activeCat);
  const clientCompanyName = bootstrap.clients.find((c) => c.id === bootstrap.clientId)?.companyName;
  const isPriorFy = isPriorFiscalYear(fiscalYear);
  const formReadOnly = isPriorFy;
  const hasRecordForFy = (summary?.categories ?? []).some((c) => c.emissions_tco2e != null);
  const fyDataLoading = needsClient ? bootstrap.recordLoading : summaryLoading;
  const saveDisabled =
    loading || fyDataLoading || (needsClient && !bootstrap.clientId) || isPriorFy;

  const categoryModules = useMemo<WorkbenchModuleItem[]>(() => {
    const statusFor = (catNum: number) => {
      const row = summary?.categories.find((c) => c.number === catNum);
      if (!row?.emissions_tco2e) return "pending";
      return row.material ? "material" : "done";
    };

    const items: WorkbenchModuleItem[] = SCOPE3_CATEGORY_NUMBERS.map((n) => {
      const st = statusFor(n);
      return {
        id: String(n),
        label: String(n),
        done: st === "done" || st === "material",
        accent: st === "material" ? "#ea580c" : st === "done" ? "#006c49" : undefined,
      };
    });
    return items;
  }, [summary]);

  return (
    <CalculatorPage className="calc-workbench-page">
      <CalculatorWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === "history" ? (
        <CalculatorHistoryPanel
          data={history}
          columns={historyColumns}
          loading={historyLoading}
          searchPlaceholder="Search calculations…"
          summaryLabel={`${history.length} calculation${history.length === 1 ? "" : "s"}${fiscalYear ? ` for FY ${fiscalYear}` : ""}`}
          emptyMessage={calcHistoryEmptyMessage(
            "No Scope 3 calculations yet",
            "Complete categories in the Calculator tab and save your results.",
          )}
          emptyFilteredMessage={calcHistoryEmptyFilteredMessage}
        />
      ) : (
        <>
          <CalculatorWorkbenchHeader
            eyebrow="Scope 3 GHG"
            title={needsClient ? clientCompanyName || "Select client" : "My organisation"}
            badges={
              needsClient && bootstrap.clientStatus.length > 0 ? (
                <span className="isf-client-header__badge">
                  {completedClients}/{bootstrap.clientStatus.length} clients in progress
                </span>
              ) : undefined
            }
            showClientPicker={needsClient}
            clients={bootstrap.clients}
            clientId={bootstrap.clientId}
            clientsLoading={bootstrap.clientsLoading}
            recordLoading={bootstrap.recordLoading}
            fiscalYear={fiscalYear}
            onClientChange={bootstrap.setClientId}
            onFiscalYearChange={setFiscalYear}
          />

          {error && <CalculatorWorkbenchError message={error} />}

          <CalculatorWorkbench className="isf-workbench--scope3">
            <Scope3CategoryStepper
              modules={categoryModules}
              active={activeModuleId}
              onChange={(id) => setActiveCat(Number(id))}
              completionPct={completionPct}
            />

            <FiscalYearFormGate
              layout="workbench"
              fiscalYear={fiscalYear}
              recordLoading={fyDataLoading}
              hasRecord={hasRecordForFy}
            >
              <CalculatorWorkbenchCenter>
              {needsClient && bootstrap.clientStatus.length > 0 && (
                <ClientProgressDetails
                  fiscalYear={fiscalYear}
                  completed={completedClients}
                  total={bootstrap.clientStatus.length}
                >
                  <table className="calc-history-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Categories</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {bootstrap.clientStatus.map((s) => (
                        <tr key={s.client_id}>
                          <td data-label="Client">{s.company_name}</td>
                          <td data-label="Categories">{s.categories_completed}/15</td>
                          <td data-label="Status">
                            {s.has_calculations ? "In progress" : "Not started"}
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

              {activeCat !== "summary" && factorsLoading && !currentFactor && (
                <CalculatorPanel title={`Category ${activeCat}`} subtitle="Loading category details…">
                  <p className="dash-muted" style={{ fontSize: "0.8125rem", margin: 0 }}>
                    Fetching calculation methods and factors…
                  </p>
                </CalculatorPanel>
              )}

              {activeCat !== "summary" && currentFactor && (
                <CalculatorPanel
                  title={`Category ${currentFactor.number}: ${currentFactor.name}`}
                  subtitle={statusFor(currentFactor.number)}
                  actions={
                    <CalculatorModuleTabs
                      tabs={currentFactor.methods.map((m) => ({
                        id: m,
                        label: m === "spend_based" ? "Spend" : "Activity",
                      }))}
                      active={method}
                      onChange={(id) => setMethod(id as typeof method)}
                    />
                  }
                >
                  <CalculatorModuleFormLayout
                    form={
                      <>
                        {method === "spend_based" && (
                          <div className="calc-form-grid">
                            <CalculatorField label="Spend (INR)">
                              <input
                                className="dash-input"
                                value={spendInr}
                                disabled={formReadOnly}
                                onChange={(e) => setSpendInr(e.target.value)}
                                inputMode="decimal"
                              />
                              {currentFactor.spend_factor_kgco2e_per_inr != null && (
                                <p className="calc-field__hint">
                                  Factor: {currentFactor.spend_factor_kgco2e_per_inr} kg CO₂e/INR
                                </p>
                              )}
                            </CalculatorField>
                          </div>
                        )}
                        {method === "activity_based" && (
                          <div className="calc-form-grid">
                            {(currentFactor.activity_inputs ?? []).map((f) => (
                              <CalculatorField
                                key={f.field}
                                label={`${f.field.replace(/_/g, " ")}${f.unit ? ` (${f.unit})` : ""}`}
                              >
                                <input
                                  className="dash-input"
                                  value={activityInputs[f.field] ?? ""}
                                  disabled={formReadOnly}
                                  onChange={(e) =>
                                    setActivityInputs((prev) => ({ ...prev, [f.field]: e.target.value }))
                                  }
                                  inputMode="decimal"
                                />
                              </CalculatorField>
                            ))}
                          </div>
                        )}
                        <label className="calc-checkbox">
                          <input
                            type="checkbox"
                            checked={material}
                            disabled={formReadOnly}
                            onChange={(e) => setMaterial(e.target.checked)}
                          />
                          Mark as material category
                        </label>
                      </>
                    }
                    insight={
                      <CalculatorInsightCard title="Category insight">
                        <div className="isf-metric-grid">
                          <CalculatorMetricTile
                            label="Status"
                            value={statusFor(currentFactor.number)}
                          />
                          {result && (
                            <>
                              <CalculatorMetricTile
                                label="Emissions"
                                value={`${fmt4(result.emissions_tco2e)} tCO₂e`}
                              />
                              <CalculatorMetricTile
                                label="Method"
                                value={method === "spend_based" ? "Spend-based" : "Activity-based"}
                              />
                            </>
                          )}
                        </div>
                        <p className="isf-insight-card__hint">
                          Use spend-based or activity-based inputs for {currentFactor.name}.
                        </p>
                      </CalculatorInsightCard>
                    }
                  />
                </CalculatorPanel>
              )}

              {activeCat === "summary" && (
                <CalculatorPanel title="Summary" subtitle="All categories for selected fiscal year">
                  {chartData.length > 0 && (
                    <div className="calc-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartTheme.muted }} />
                          <YAxis tick={{ fontSize: 10, fill: chartTheme.muted }} />
                          <Tooltip
                            contentStyle={{
                              background: chartTheme.tooltipBg,
                              border: `1px solid ${chartTheme.tooltipBorder}`,
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: chartTheme.text }}
                            itemStyle={{ color: chartTheme.muted }}
                          />
                          <Bar dataKey="tco2e" fill={chartTheme.bar} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="calc-history-table-wrap">
                    <table className="calc-history-table">
                      <thead>
                        <tr>
                          <th>Cat</th>
                          <th>Name</th>
                          <th>Method</th>
                          <th style={{ textAlign: "right" }}>tCO₂e</th>
                          <th>Material</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summary?.categories ?? []).map((c) => (
                          <tr key={c.number}>
                            <td data-label="Cat">{c.number}</td>
                            <td data-label="Name">{c.name}</td>
                            <td data-label="Method">{c.method_used?.replace(/_/g, " ") ?? "-"}</td>
                            <td data-label="tCO₂e" style={{ textAlign: "right" }}>
                              {fmt4(c.emissions_tco2e)}
                            </td>
                            <td data-label="Material">{c.material ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CalculatorPanel>
              )}
            </CalculatorWorkbenchCenter>

            <CalculatorLiveSummary
              title="Live Scope 3 summary"
              metrics={[
                {
                  label: "Total Scope 3",
                  value: summary ? `${fmt4(summary.total_scope3_tco2e)} tCO₂e` : "-",
                },
                { label: "Categories", value: `${categoriesComplete}/15` },
                {
                  label: "Material",
                  value: String(summary?.material_categories.length ?? 0),
                },
                { label: "Fiscal year", value: fiscalYear },
              ]}
            >
              <div className="isf-live-summary__action">
                <button
                  type="button"
                  className={activeCat === "summary" ? "btn-primary" : "btn-ghost"}
                  onClick={() => setActiveCat("summary")}
                >
                  Summary
                </button>
              </div>
            </CalculatorLiveSummary>
            </FiscalYearFormGate>
          </CalculatorWorkbench>

          {activeCat !== "summary" && (
            <CalculatorWorkbenchFooter
              actions={
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saveDisabled}
                  onClick={() => void handleSaveAndNext()}
                >
                  {loading
                    ? "Saving…"
                    : activeCat === 15
                      ? "Save & Complete"
                      : "Save and Next"}
                </button>
              }
            />
          )}
        </>
      )}

      <ReportProcessingModal
        open={modalOpen}
        phase={modalPhase}
        onClose={() => setModalOpen(false)}
        onGoToReports={() => {
          if (onNavigateToReport && savedReportId) {
            onNavigateToReport("scope3", savedReportId);
          }
          setModalOpen(false);
        }}
      />
    </CalculatorPage>
  );
}
