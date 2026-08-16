"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  calculateIsf,
  getIsfById,
  getIsfHistory,
} from "@/modules/isf-calculator/api/isfApi";
import {
  clearIsfDraft,
  readIsfDraft,
  writeIsfDraft,
} from "@/modules/isf-calculator/domain/isfDraftStorage";
import {
  DEFAULT_ISF_FORM,
  EMPTY_SCOPE3,
  modulesForVariant,
  type IsfFormState,
  type IsfModuleId,
} from "@/modules/isf-calculator/domain/isfFormState";
import {
  computeIsfLivePreview,
  formFromSavedInputs,
} from "@/modules/isf-calculator/domain/isfLivePreview";
import {
  useIsfClientBootstrap,
  type IsfRecordHandlers,
} from "@/modules/isf-calculator/hooks/useIsfClientBootstrap";
import type { IsfCalculationResponse, IsfHistoryItem, IsfSavedInputs } from "@/modules/isf-calculator/domain/types";
import { IsfModulePanel, SCOPE3_FIELDS } from "@/modules/isf-calculator/ui/IsfWorkbenchModules";
import {
  IsfBrsrPreview,
  IsfFyComparison,
  IsfLiveSummary,
  IsfSaveSuccessBanner,
  IsfStepper,
  IsfStickyFooter,
} from "@/modules/isf-calculator/ui/IsfWorkbenchChrome";
import IsfUnitConverterModal from "@/modules/isf-calculator/ui/IsfUnitConverterModal";
import {
  CalculatorPage,
  CalculatorWorkspaceTabs,
} from "@/modules/calculators/ui/CalculatorLayout";
import { CalculatorWorkbenchHeader } from "@/modules/calculators/ui/CalculatorWorkbenchLayout";
import { FiscalYearFormGate } from "@/modules/calculators/ui/FiscalYearFormGate";
import {
  calcHistoryActionColumn,
  calcHistoryDateColumn,
  calcHistoryEmptyFilteredMessage,
  calcHistoryEmptyMessage,
  calcHistoryMetricColumn,
  calcHistoryReportColumn,
  CalculatorHistoryPanel,
} from "@/modules/calculators/ui/CalculatorHistoryPanel";
import { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import ReportProcessingModal from "@/modules/reports/ui/ReportProcessingModal";
import { getCurrentFiscalYear, isPriorFiscalYear, priorFiscalYear } from "@/modules/platform/utils/fiscalYear";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole, type RoleKey } from "@/modules/platform/rbac/roles";

const CLIENT_ROLES: RoleKey[] = ["ca", "cs", "esg_consultant", "assurer_auditor"];

function num(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function hasAnyNum(...vals: string[]) {
  return vals.some((v) => num(v) != null);
}

function hasIsfWaterPayload(form: IsfFormState) {
  return form.pinCode.length === 6;
}

function hasEnvWaterPayload(form: IsfFormState) {
  return (
    form.zidImplemented != null ||
    hasAnyNum(
      form.groundwaterKl,
      form.surfaceWaterKl,
      form.municipalWaterKl,
      form.rainwaterKl,
      form.otherWaterKl,
      form.waterDischargedKl,
      form.dischargeSurfaceKl,
      form.dischargeGroundwaterKl,
      form.dischargeSeawaterKl,
      form.dischargeThirdpartyKl,
      form.dischargeTreatedKl,
      form.waterWithdrawalStressedKl,
      form.waterConsumptionStressedKl,
    )
  );
}

function hasIsfWastePayload(form: IsfFormState) {
  return hasAnyNum(
    form.wasteTotal,
    form.wasteRecycled,
    form.wasteReused,
    form.wasteComposted,
    form.wasteCoprocessed,
    form.wasteOtherRecovery,
  );
}

function hasEnvWastePayload(form: IsfFormState) {
  return hasAnyNum(
    form.hazardousWasteMt,
    form.nonHazardousWasteMt,
    form.plasticWasteMt,
    form.ewasteMt,
    form.biomedicalWasteMt,
    form.otherWasteMt,
    form.landfillMt,
    form.incinerationMt,
    form.otherDisposalMt,
  );
}

function hasAirPayload(form: IsfFormState) {
  return hasAnyNum(form.noxKg, form.soxKg, form.pmKg, form.vocKg, form.popKg, form.hapKg, form.otherAirKg);
}

function hasDisclosurePayload(form: IsfFormState) {
  return (
    form.isDesignatedConsumer != null ||
    form.ghgReductionProject != null ||
    form.inEcoSensitiveArea != null ||
    form.eiaExternalAgency != null ||
    form.eiaPublicDomain != null ||
    form.envComplaint != null ||
    !!form.ghgProjectDetails.trim() ||
    !!form.wasteMgmtPractices.trim() ||
    !!form.hazPlasticReduction.trim() ||
    !!form.ecoSensitiveDetails.trim() ||
    !!form.biodiversityImpact.trim() ||
    !!form.eiaProjectName.trim() ||
    !!form.eiaNotification.trim() ||
    !!form.envNoncomplianceDetails.trim() ||
    hasAnyNum(form.patTargetToe, form.patEscerts, form.emissionsAvoidedTco2e)
  );
}

function fmt4(n?: number | null, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export default function IsfCalculatorView({
  onNavigateToReport,
  variant = "isf",
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
  /** Environmental pillar tab uses Env branding; Calculators → ISF keeps ISF branding. */
  variant?: "isf" | "environmental";
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const showClientPicker = CLIENT_ROLES.includes(role);
  const chartTheme = useCalcChartTheme();
  const isEnvPillar = variant === "environmental";
  const workbenchModules = useMemo(() => modulesForVariant(variant), [variant]);

  const [activeModule, setActiveModule] = useState<IsfModuleId>(
    () => modulesForVariant(variant)[0]?.id ?? "emission",
  );
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [form, setForm] = useState<IsfFormState>(DEFAULT_ISF_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<IsfCalculationResponse | null>(null);
  const [history, setHistory] = useState<IsfHistoryItem[]>([]);
  const [priorFyHistory, setPriorFyHistory] = useState<IsfHistoryItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"calculate" | "history">("calculate");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<"processing" | "success">("processing");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [converterOpen, setConverterOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [saveBannerId, setSaveBannerId] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [msmeRecordLoading, setMsmeRecordLoading] = useState(false);

  const recordHandlersRef = useRef<IsfRecordHandlers | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDraftWrite = useRef(false);

  const applyInputs = useCallback((inputs?: IsfSavedInputs) => {
    skipDraftWrite.current = true;
    if (!inputs) {
      setForm({ ...DEFAULT_ISF_FORM, scope3: { ...EMPTY_SCOPE3 } });
      setResult(null);
      return;
    }
    setForm(formFromSavedInputs(inputs));
  }, []);

  recordHandlersRef.current = { applyInputs, setResult };

  const {
    clients,
    clientId,
    setClientId,
    clientStatus,
    clientsLoading,
    recordLoading,
    refreshStatus,
  } = useIsfClientBootstrap(showClientPicker, fiscalYear, recordHandlersRef);

  const preview = useMemo(() => computeIsfLivePreview(form), [form]);

  const clientCompanyName = useMemo(
    () => clients.find((c) => c.id === clientId)?.companyName,
    [clients, clientId],
  );

  const completedCount = clientStatus.filter((s) => s.has_calculation).length;
  const isPriorFy = isPriorFiscalYear(fiscalYear);
  const formReadOnly = isPriorFy;
  const hasRecordForFy = result != null;
  const fyRecordLoading = showClientPicker ? recordLoading : msmeRecordLoading;
  const saveDisabled =
    saving || fyRecordLoading || (showClientPicker && !clientId) || isPriorFy;

  useEffect(() => {
    if (showClientPicker || !fiscalYear) return;

    let cancelled = false;
    setMsmeRecordLoading(true);

    void (async () => {
      try {
        const items = await getIsfHistory({ fiscalYear });
        if (cancelled) return;
        if (items[0]?.id) {
          const record = await getIsfById(items[0].id);
          if (!cancelled) {
            skipDraftWrite.current = true;
            setForm(formFromSavedInputs(record.inputs));
            setResult(record);
          }
        } else if (!cancelled) {
          skipDraftWrite.current = true;
          setForm({ ...DEFAULT_ISF_FORM, scope3: { ...EMPTY_SCOPE3 } });
          setResult(null);
        }
      } catch {
        if (!cancelled) {
          setResult(null);
        }
      } finally {
        if (!cancelled) setMsmeRecordLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showClientPicker, fiscalYear]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await getIsfHistory(
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

  const loadPriorFy = useCallback(async () => {
    const priorFy = priorFiscalYear(fiscalYear);
    if (!priorFy) {
      setPriorFyHistory(null);
      return;
    }
    try {
      const items = await getIsfHistory({
        fiscalYear: priorFy,
        clientId: showClientPicker ? clientId || undefined : clientId || undefined,
      });
      setPriorFyHistory(items[0] ?? null);
    } catch {
      setPriorFyHistory(null);
    }
  }, [fiscalYear, clientId, showClientPicker]);

  useEffect(() => {
    void loadHistory();
    void loadPriorFy();
  }, [loadHistory, loadPriorFy]);

  useEffect(() => {
    if (fyRecordLoading || draftRestored) return;
    if (isPriorFy) {
      setDraftRestored(true);
      return;
    }
    if (result) {
      setDraftRestored(true);
      return;
    }
    const draft = readIsfDraft(clientId || null, fiscalYear, variant);
    if (draft?.form) {
      setForm(draft.form);
      setActiveModule(draft.activeModule);
      setDraftSavedAt(draft.savedAt);
    }
    setDraftRestored(true);
  }, [clientId, fiscalYear, fyRecordLoading, result, draftRestored, isPriorFy, variant]);

  useEffect(() => {
    setDraftRestored(false);
  }, [clientId, fiscalYear, variant]);

  useEffect(() => {
    const first = workbenchModules[0]?.id;
    if (first && !workbenchModules.some((m) => m.id === activeModule)) {
      setActiveModule(first);
    }
  }, [workbenchModules, activeModule]);

  useEffect(() => {
    if (isPriorFy) return;
    if (skipDraftWrite.current) {
      skipDraftWrite.current = false;
      return;
    }
    if (fyRecordLoading) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      writeIsfDraft(clientId || null, fiscalYear, { form, activeModule, fiscalYear }, variant);
      setDraftSavedAt(new Date().toISOString());
    }, 600);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, activeModule, fiscalYear, clientId, fyRecordLoading, isPriorFy, variant]);

  async function handleCalculate() {
    if (isPriorFy) return;
    if (showClientPicker && !clientId) {
      setError("Select a client before calculating.");
      return;
    }
    setSaving(true);
    setError("");
    setModalOpen(true);
    setModalPhase("processing");
    setSavedReportId(null);
    setSaveBannerId(null);
    try {
      const scope3Spend = Object.fromEntries(
        SCOPE3_FIELDS.map(({ key }) => [key, num(form.scope3[key] ?? "")]).filter(([, v]) => v != null),
      );

      const isfPayload = !isEnvPillar
        ? {
            emission_intensity: {
              scope1_tco2e: num(form.scope1),
              scope2_tco2e: num(form.scope2),
              revenue_inr_cr: num(form.revenue),
              ppp_factor: num(form.ppp),
              output_quantity: num(form.outputQty),
              output_unit: form.outputUnit || undefined,
            },
            scope3_spend: Object.keys(scope3Spend).length ? scope3Spend : undefined,
            energy: {
              electricity_kwh: num(form.electricityKwh),
              diesel_hsd_litres: num(form.dieselHsd),
              petrol_ms_litres: num(form.petrolMs),
              lpg_kg: num(form.lpg),
              natural_gas_m3: num(form.gas),
              solar_kwh: num(form.solar),
              wind_kwh: num(form.wind),
              biomass_kwh: num(form.biomass),
              revenue_inr_cr: num(form.revenue),
            },
            water: hasIsfWaterPayload(form)
              ? { pin_code: form.pinCode.length === 6 ? form.pinCode : undefined }
              : undefined,
            waste_recovery: hasIsfWastePayload(form)
              ? {
                  total_generated_mt: num(form.wasteTotal),
                  recycled_mt: num(form.wasteRecycled),
                  reused_mt: num(form.wasteReused),
                  composted_mt: num(form.wasteComposted),
                  coprocessed_mt: num(form.wasteCoprocessed),
                  other_recovery_mt: num(form.wasteOtherRecovery),
                }
              : undefined,
          }
        : {};

      const envPayload = isEnvPillar
        ? {
            energy: hasAnyNum(form.furnaceOil, form.cng)
              ? {
                  furnace_oil_litres: num(form.furnaceOil),
                  cng_kg: num(form.cng),
                  revenue_inr_cr: num(form.revenue),
                }
              : undefined,
            water: hasEnvWaterPayload(form)
              ? {
                  groundwater_kl: num(form.groundwaterKl),
                  surface_water_kl: num(form.surfaceWaterKl),
                  municipal_water_kl: num(form.municipalWaterKl),
                  rainwater_kl: num(form.rainwaterKl),
                  other_water_kl: num(form.otherWaterKl),
                  water_discharged_kl: num(form.waterDischargedKl),
                  discharge_surface_kl: num(form.dischargeSurfaceKl),
                  discharge_groundwater_kl: num(form.dischargeGroundwaterKl),
                  discharge_seawater_kl: num(form.dischargeSeawaterKl),
                  discharge_thirdparty_kl: num(form.dischargeThirdpartyKl),
                  discharge_treated_kl: num(form.dischargeTreatedKl),
                  water_withdrawal_stressed_kl: num(form.waterWithdrawalStressedKl),
                  water_consumption_stressed_kl: num(form.waterConsumptionStressedKl),
                  zid_implemented: form.zidImplemented ?? undefined,
                }
              : undefined,
            waste_recovery: hasEnvWastePayload(form)
              ? {
                  hazardous_waste_mt: num(form.hazardousWasteMt),
                  non_hazardous_waste_mt: num(form.nonHazardousWasteMt),
                  plastic_waste_mt: num(form.plasticWasteMt),
                  ewaste_mt: num(form.ewasteMt),
                  biomedical_waste_mt: num(form.biomedicalWasteMt),
                  other_waste_mt: num(form.otherWasteMt),
                  landfill_mt: num(form.landfillMt),
                  incineration_mt: num(form.incinerationMt),
                  other_disposal_mt: num(form.otherDisposalMt),
                }
              : undefined,
            air_emissions: hasAirPayload(form)
              ? {
                  nox_kg: num(form.noxKg),
                  sox_kg: num(form.soxKg),
                  pm_kg: num(form.pmKg),
                  voc_kg: num(form.vocKg),
                  pop_kg: num(form.popKg),
                  hap_kg: num(form.hapKg),
                  other_air_kg: num(form.otherAirKg),
                }
              : undefined,
            env_disclosure: hasDisclosurePayload(form)
              ? {
                  is_designated_consumer: form.isDesignatedConsumer ?? undefined,
                  pat_target_toe: num(form.patTargetToe),
                  pat_escerts: num(form.patEscerts),
                  ghg_reduction_project: form.ghgReductionProject ?? undefined,
                  ghg_project_details: form.ghgProjectDetails || undefined,
                  emissions_avoided_tco2e: num(form.emissionsAvoidedTco2e),
                  waste_mgmt_practices: form.wasteMgmtPractices || undefined,
                  haz_plastic_reduction: form.hazPlasticReduction || undefined,
                  in_eco_sensitive_area: form.inEcoSensitiveArea ?? undefined,
                  eco_sensitive_details: form.ecoSensitiveDetails || undefined,
                  biodiversity_impact: form.biodiversityImpact || undefined,
                  eia_project_name: form.eiaProjectName || undefined,
                  eia_notification: form.eiaNotification || undefined,
                  eia_external_agency: form.eiaExternalAgency ?? undefined,
                  eia_public_domain: form.eiaPublicDomain ?? undefined,
                  env_complaint: form.envComplaint ?? undefined,
                  env_noncompliance_details: form.envNoncomplianceDetails || undefined,
                }
              : undefined,
          }
        : {};

      const res = await calculateIsf({
        client_id: clientId || null,
        fiscal_year: fiscalYear,
        ...isfPayload,
        ...envPayload,
      });
      await new Promise((r) => setTimeout(r, 900));
      setResult(res);
      setSavedReportId(res.id);
      setSaveBannerId(res.id);
      setModalPhase("success");
      clearIsfDraft(clientId || null, fiscalYear, variant);
      setDraftSavedAt(null);
      void loadHistory();
      void loadPriorFy();
      void refreshStatus();
    } catch (e) {
      setModalOpen(false);
      setError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setSaving(false);
    }
  }

  function openNextPending() {
    const next = clientStatus.find((s) => !s.has_calculation);
    if (next) setClientId(next.client_id);
  }

  const historyColumns = useMemo<ColumnDef<IsfHistoryItem>[]>(
    () => [
      calcHistoryReportColumn<IsfHistoryItem>({
        showClientPicker,
        getClientName: (row) => row.client_company_name,
        getFiscalYear: (row) => row.fiscal_year,
        getSubtitle: () => (isEnvPillar ? "Environment record" : "ISF calculation"),
      }),
      calcHistoryMetricColumn({
        id: "scope3",
        label: "Scope 3",
        getValue: (row) => row.scope3_total_tco2e,
        format: (n) => fmt4(n),
      }),
      calcHistoryMetricColumn({
        id: "energy",
        label: "Energy (GJ)",
        getValue: (row) => row.energy_total_gj,
        format: (n) => fmt4(n),
      }),
      calcHistoryMetricColumn({
        id: "recovery",
        label: "Recovery %",
        getValue: (row) => row.recovery_rate_pct,
        format: (n) => fmt4(n, 1),
      }),
      calcHistoryDateColumn<IsfHistoryItem>({
        getIso: (row) => row.created_at,
      }),
      calcHistoryActionColumn<IsfHistoryItem>({
        onAction: (row) => onNavigateToReport?.("isf", row.id),
      }),
    ],
    [showClientPicker, onNavigateToReport, isEnvPillar],
  );

  const workbenchEyebrow = isEnvPillar ? "Environmental" : "ISF Calculator";
  const historyEmptyTitle = isEnvPillar
    ? "No saved environment records yet"
    : "No saved ISF calculations yet";

  return (
    <CalculatorPage className="isf-workbench-page">
      <CalculatorWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === "history" ? (
        <CalculatorHistoryPanel
          data={history}
          columns={historyColumns}
          loading={historyLoading}
          searchPlaceholder={isEnvPillar ? "Search environment records…" : "Search calculations…"}
          summaryLabel={`${history.length} ${isEnvPillar ? "record" : "calculation"}${history.length === 1 ? "" : "s"}${fiscalYear ? ` for FY ${fiscalYear}` : ""}`}
          fiscalYear={fiscalYear}
          onFiscalYearChange={setFiscalYear}
          emptyMessage={calcHistoryEmptyMessage(
            historyEmptyTitle,
            "Run Calculate & Save on the Calculate tab to create your first record.",
          )}
          emptyFilteredMessage={calcHistoryEmptyFilteredMessage}
          error={error}
        />
      ) : (
        <>
          <CalculatorWorkbenchHeader
            eyebrow={workbenchEyebrow}
            title={showClientPicker ? clientCompanyName || "Select client" : "My organisation"}
            meta={
              result?.created_at
                ? `Last saved ${new Date(result.created_at).toLocaleDateString("en-IN")}`
                : undefined
            }
            badges={
              <>
                {result?.brsr_populated && (
                  <span className="isf-client-header__badge isf-client-header__badge--brsr">
                    BRSR linked
                  </span>
                )}
                {showClientPicker && clientStatus.length > 0 && (
                  <span className="isf-client-header__badge">
                    {completedCount}/{clientStatus.length} clients complete
                  </span>
                )}
              </>
            }
            showClientPicker={showClientPicker}
            clients={clients}
            clientId={clientId}
            clientsLoading={clientsLoading}
            recordLoading={fyRecordLoading}
            fiscalYear={fiscalYear}
            onClientChange={setClientId}
            onFiscalYearChange={setFiscalYear}
            onOpenNextPending={showClientPicker ? openNextPending : undefined}
          />

          {saveBannerId && (
            <IsfSaveSuccessBanner
              reportId={saveBannerId}
              title={isEnvPillar ? "Environment data saved" : "ISF calculation saved"}
              subtitle={`Report ${saveBannerId.slice(0, 8)}… is ready in Reports.`}
              onViewReport={() => {
                onNavigateToReport?.("isf", saveBannerId);
                setSaveBannerId(null);
              }}
              onDismiss={() => setSaveBannerId(null)}
              onNextClient={openNextPending}
              showNextClient={showClientPicker && clientStatus.some((s) => !s.has_calculation)}
            />
          )}

          {error && (
            <p className="isf-workbench-error" role="alert">
              {error}
            </p>
          )}

          <div className="isf-workbench">
            <IsfStepper
              active={activeModule}
              form={form}
              onChange={setActiveModule}
              modules={workbenchModules}
              ariaLabel={isEnvPillar ? "Environmental modules" : "ISF Calculator modules"}
            />

            <FiscalYearFormGate
              layout="workbench"
              fiscalYear={fiscalYear}
              recordLoading={fyRecordLoading}
              hasRecord={hasRecordForFy}
            >
              <div className="isf-workbench__center">
                <IsfModulePanel
                  moduleId={activeModule}
                  form={form}
                  preview={preview}
                  result={result}
                  chartTheme={chartTheme}
                  readOnly={formReadOnly}
                  onChange={setForm}
                  onOpenConverter={() => setConverterOpen(true)}
                  fieldScope={variant}
                />
                {!isEnvPillar && <IsfBrsrPreview preview={preview} result={result} form={form} />}
                <IsfFyComparison fiscalYear={fiscalYear} preview={preview} priorFyRecord={priorFyHistory} />
              </div>

              <IsfLiveSummary
                preview={preview}
                result={result}
                chartTheme={chartTheme}
                variant={variant}
                title={isEnvPillar ? "Live environment summary" : "Live ISF summary"}
              />
            </FiscalYearFormGate>
          </div>

          <IsfStickyFooter
            draftSavedAt={draftSavedAt}
            saving={saving}
            disabled={saveDisabled}
            onOpenConverter={() => setConverterOpen(true)}
            onCalculate={() => void handleCalculate()}
            lastSuccessId={savedReportId}
            onViewReport={
              savedReportId ? () => onNavigateToReport?.("isf", savedReportId) : undefined
            }
          />
        </>
      )}

      <IsfUnitConverterModal open={converterOpen} onClose={() => setConverterOpen(false)} />

      <ReportProcessingModal
        open={modalOpen}
        phase={modalPhase}
        onGoToReports={() => {
          if (savedReportId) onNavigateToReport?.("isf", savedReportId);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />
    </CalculatorPage>
  );
}
