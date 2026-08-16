"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDashMainPortalRoot } from "@/modules/dashboard/hooks/useDashMainPortalRoot";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  IsfFormState,
  IsfModuleId,
  WorkbenchModuleDef,
} from "@/modules/isf-calculator/domain/isfFormState";
import { countModuleFieldProgress, ISF_MODULES } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import { BRSR_MAPPINGS, fmtNum } from "@/modules/isf-calculator/domain/reportHelpers";
import type { IsfCalculationResponse, IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import type { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";

const PIE_COLORS = ["#2563EB", "#006C49", "#8B5CF6"];

function fmt4(n?: number | null, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function IsfStepper({
  active,
  form,
  onChange,
  modules = ISF_MODULES,
  ariaLabel = "ISF Calculator modules",
}: {
  active: IsfModuleId;
  form: IsfFormState;
  onChange: (id: IsfModuleId) => void;
  modules?: WorkbenchModuleDef[];
  ariaLabel?: string;
}) {
  const overallPct =
    modules.length === 0
      ? 0
      : Math.round(
          modules.reduce((sum, mod) => sum + countModuleFieldProgress(form, mod.fieldKeys).pct, 0) /
            modules.length,
        );

  return (
    <nav className="isf-stepper card card--elevated" aria-label={ariaLabel}>
      <p className="isf-stepper__heading">
        Modules
        <span className="isf-stepper__pct">{overallPct}%</span>
      </p>
      <ul className="isf-stepper__list">
        {modules.map((mod) => {
          const completion = countModuleFieldProgress(form, mod.fieldKeys);
          const done = completion.pct >= 75;
          return (
            <li key={`${mod.id}-${mod.shortLabel}`}>
              <button
                type="button"
                className={`isf-stepper__item${active === mod.id ? " isf-stepper__item--active" : ""}${done ? " isf-stepper__item--done" : ""}`}
                onClick={() => onChange(mod.id)}
                style={{ ["--mod-accent" as string]: mod.accent }}
              >
                <span className="isf-stepper__icon">
                  <i className={`ti ti-${mod.icon}`} aria-hidden="true" />
                </span>
                <span className="isf-stepper__copy">
                  <span className="isf-stepper__label">{mod.label}</span>
                  <span className="isf-stepper__sub">
                    {completion.filled}/{completion.total} fields
                  </span>
                </span>
                {done && <i className="ti ti-circle-check isf-stepper__check" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function IsfLiveSummary({
  preview,
  result,
  chartTheme,
  title = "Live ISF summary",
  variant = "isf",
}: {
  preview: IsfLivePreview;
  result: IsfCalculationResponse | null;
  chartTheme: ReturnType<typeof useCalcChartTheme>;
  title?: string;
  variant?: "isf" | "environmental";
}) {
  const waterLabel =
    result?.water?.stress_level?.replace(/_/g, " ") ?? (preview.moduleCompletion.water.filled ? "Pending save" : "-");

  return (
    <aside className="isf-live-summary card card--elevated">
      <p className="isf-live-summary__title">{title}</p>
      <div className="isf-live-summary__metrics">
        {variant === "isf" ? (
          <>
            <div className="isf-live-summary__metric">
              <span>Total footprint</span>
              <strong>{fmt4(preview.totalFootprint)} tCO₂e</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Scope 1+2</span>
              <strong>{fmt4(preview.totalGhg)} tCO₂e</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Scope 3</span>
              <strong>{fmt4(preview.scope3Total)} tCO₂e</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Energy</span>
              <strong>{fmt4(preview.energyTotalGj)} GJ</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Renewable</span>
              <strong>{fmt4(preview.renewablePct, 1)}%</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Recovery</span>
              <strong>{fmt4(preview.recoveryRatePct, 1)}%</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Water stress</span>
              <strong>{waterLabel}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="isf-live-summary__metric">
              <span>Water withdrawal</span>
              <strong>{fmt4(preview.totalWaterKl)} KL</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Water consumption</span>
              <strong>{fmt4(preview.waterConsumptionKl)} KL</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Waste generated</span>
              <strong>{fmt4(preview.wasteGenerated)} MT</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Recovery</span>
              <strong>{fmt4(preview.recoveryRatePct, 1)}%</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Energy (merged)</span>
              <strong>{fmt4(preview.energyTotalGj)} GJ</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Water stress</span>
              <strong>{waterLabel}</strong>
            </div>
            <div className="isf-live-summary__metric">
              <span>Total footprint</span>
              <strong>{fmt4(preview.totalFootprint)} tCO₂e</strong>
            </div>
          </>
        )}
      </div>
      {variant === "isf" && preview.footprintPie.length > 0 && (
        <div className="isf-live-summary__chart isf-pie-chart-wrap">
          <ResponsiveContainer width="100%" height={148}>
            <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
              <Pie
                data={preview.footprintPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="46%"
                outerRadius="70%"
                paddingAngle={2}
              >
                {preview.footprintPie.map((_, i) => (
                  <Cell key={i} fill={chartTheme.resolveFill(PIE_COLORS[i % PIE_COLORS.length])} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: chartTheme.tooltipBg,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </aside>
  );
}

export function IsfBrsrPreview({
  preview,
  result,
  form,
}: {
  preview: IsfLivePreview;
  result: IsfCalculationResponse | null;
  form: IsfFormState;
}) {
  const inputs = {
    scope1_tco2e: parseFloat(form.scope1) || 0,
    scope2_tco2e: parseFloat(form.scope2) || 0,
  };

  const values: Record<string, string> = {
    scope3_total: `${fmt4(preview.scope3Total)} tCO₂e`,
    total_ghg: `${fmt4(preview.totalGhg)} tCO₂e`,
    intensity_revenue: `${fmt4(preview.intensityRevenue)} tCO₂e / INR Cr PPP`,
    energy_gj: `${fmt4(preview.energyTotalGj)} GJ`,
    renewable_pct: `${fmt4(preview.renewablePct, 1)}%`,
    water_stress: result?.water?.stress_level?.replace(/_/g, " ") ?? "-",
    recovery_rate: `${fmt4(preview.recoveryRatePct, 1)}%`,
  };

  return (
    <details className="isf-brsr-preview card card--elevated">
      <summary className="isf-brsr-preview__summary">
        BRSR disclosure preview
        {result?.brsr_populated && <span className="isf-brsr-preview__tag">Linked</span>}
      </summary>
      <ul className="isf-brsr-preview__list">
        {BRSR_MAPPINGS.map((m) => {
          let value = "-";
          if ("field" in m && m.field) {
            const v = inputs[m.field as keyof typeof inputs];
            value = m.field.includes("tco2e") ? `${fmtNum(v)} tCO₂e` : fmtNum(v);
          } else if ("derived" in m && m.derived) {
            value = values[m.derived] ?? "-";
          }
          return (
            <li key={m.code}>
              <span className="isf-brsr-preview__code">{m.code}</span>
              <span className="isf-brsr-preview__label">{m.label}</span>
              <strong>{value}</strong>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function IsfFyComparison({
  fiscalYear,
  preview,
  priorFyRecord,
}: {
  fiscalYear: string;
  preview: IsfLivePreview;
  priorFyRecord: IsfHistoryItem | null;
}) {
  if (!priorFyRecord) return null;

  const rows = [
    {
      label: "Scope 3 (tCO₂e)",
      current: preview.scope3Total,
      prior: priorFyRecord.scope3_total_tco2e ?? 0,
    },
    {
      label: "Energy (GJ)",
      current: preview.energyTotalGj,
      prior: priorFyRecord.energy_total_gj ?? 0,
    },
    {
      label: "Recovery (%)",
      current: preview.recoveryRatePct,
      prior: priorFyRecord.recovery_rate_pct ?? 0,
    },
  ];

  return (
    <section className="isf-fy-compare card card--elevated">
      <p className="isf-fy-compare__title">FY comparison</p>
      <p className="isf-fy-compare__sub">Current inputs vs prior saved record ({priorFyRecord.fiscal_year ?? "prior FY"})</p>
      <div className="isf-fy-compare__grid">
        {rows.map((row) => {
          const delta = row.current - row.prior;
          const up = delta > 0;
          return (
            <div key={row.label} className="isf-fy-compare__row">
              <span>{row.label}</span>
              <div className="isf-fy-compare__vals">
                <strong>{fmt4(row.current)}</strong>
                <span className={`isf-fy-compare__delta${up ? " isf-fy-compare__delta--up" : " isf-fy-compare__delta--down"}`}>
                  {delta >= 0 ? "+" : ""}
                  {fmt4(delta, 2)}
                </span>
              </div>
              <span className="isf-fy-compare__prior">Prior: {fmt4(row.prior)}</span>
            </div>
          );
        })}
      </div>
      <p className="isf-fy-compare__note">Comparing live preview for FY {fiscalYear} against last saved calculation.</p>
    </section>
  );
}

export function IsfStickyFooter({
  draftSavedAt,
  saving,
  disabled,
  onOpenConverter,
  onCalculate,
  lastSuccessId,
  onViewReport,
}: {
  draftSavedAt: string | null;
  saving: boolean;
  disabled: boolean;
  onOpenConverter: () => void;
  onCalculate: () => void;
  lastSuccessId: string | null;
  onViewReport?: () => void;
}) {
  const footerRef = useRef<HTMLElement>(null);
  const portalRoot = useDashMainPortalRoot();

  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const page = document.querySelector(".isf-workbench-page");
    if (!page) return;

    const sync = () => {
      const rect = page.getBoundingClientRect();
      footer.style.left = `${rect.left}px`;
      footer.style.width = `${rect.width}px`;
    };

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(page);
    const main = document.querySelector(".dash-main");
    if (main) {
      ro.observe(main);
      main.addEventListener("scroll", sync, { passive: true });
    }
    const sidebar = document.querySelector(".dash-sidebar-area");
    if (sidebar) ro.observe(sidebar);

    window.addEventListener("resize", sync);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      main?.removeEventListener("scroll", sync);
    };
  }, [portalRoot]);

  const footer = (
    <footer ref={footerRef} className="isf-workbench-footer">
      <div className="isf-workbench-footer__inner card card--elevated">
        <div className="isf-workbench-footer__left">
          {draftSavedAt && (
            <span className="isf-workbench-footer__draft">
              <i className="ti ti-device-floppy" aria-hidden="true" /> Draft saved{" "}
              {new Date(draftSavedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {lastSuccessId && onViewReport && (
            <button type="button" className="btn-ghost isf-workbench-footer__report" onClick={onViewReport}>
              <i className="ti ti-file-text" aria-hidden="true" /> View last report
            </button>
          )}
        </div>
        <div className="isf-workbench-footer__actions">
          <button type="button" className="btn-ghost" onClick={onOpenConverter}>
            <i className="ti ti-arrows-exchange" aria-hidden="true" /> Unit tools
          </button>
          <button type="button" className="btn-primary" disabled={disabled || saving} onClick={onCalculate}>
            {saving ? "Calculating…" : "Calculate & Save"}
          </button>
        </div>
      </div>
    </footer>
  );

  if (portalRoot) return createPortal(footer, portalRoot);
  return footer;
}

export function IsfSaveSuccessBanner({
  reportId,
  onViewReport,
  onDismiss,
  onNextClient,
  showNextClient,
  title = "ISF calculation saved",
  subtitle,
}: {
  reportId: string;
  onViewReport: () => void;
  onDismiss: () => void;
  onNextClient?: () => void;
  showNextClient?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="isf-save-banner card card--elevated">
      <div>
        <p className="isf-save-banner__title">{title}</p>
        <p className="isf-save-banner__sub">
          {subtitle ?? `Report ${reportId.slice(0, 8)}… is ready in Reports.`}
        </p>
      </div>
      <div className="isf-save-banner__actions">
        {showNextClient && onNextClient && (
          <button type="button" className="btn-ghost" onClick={onNextClient}>
            Next client
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onDismiss}>
          Dismiss
        </button>
        <button type="button" className="btn-primary" onClick={onViewReport}>
          View report
        </button>
      </div>
    </div>
  );
}
