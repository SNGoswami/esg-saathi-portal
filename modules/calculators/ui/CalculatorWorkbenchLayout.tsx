"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDashMainPortalRoot } from "@/modules/dashboard/hooks/useDashMainPortalRoot";
import { FiscalYearSelect } from "@/modules/calculators/ui/FiscalYearSelect";

export type WorkbenchModuleItem = {
  id: string;
  label: string;
  icon?: string;
  accent?: string;
  sublabel?: string;
  done?: boolean;
};

export function CalculatorWorkbench({
  children,
  noStepper,
  className,
}: {
  children: ReactNode;
  noStepper?: boolean;
  className?: string;
}) {
  const classes = ["isf-workbench", noStepper && "isf-workbench--no-stepper", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

export function CalculatorWorkbenchCenter({ children }: { children: ReactNode }) {
  return <div className="isf-workbench__center">{children}</div>;
}

export function CalculatorModuleStepper({
  modules,
  active,
  onChange,
  completionPct,
  label = "Modules",
}: {
  modules: WorkbenchModuleItem[];
  active: string;
  onChange: (id: string) => void;
  completionPct?: number;
  label?: string;
}) {
  return (
    <nav className="isf-stepper card card--elevated" aria-label={label}>
      <p className="isf-stepper__heading">
        {label}
        {completionPct != null && <span className="isf-stepper__pct">{completionPct}%</span>}
      </p>
      <ul className="isf-stepper__list">
        {modules.map((mod) => (
          <li key={mod.id}>
            <button
              type="button"
              className={`isf-stepper__item${active === mod.id ? " isf-stepper__item--active" : ""}${mod.done ? " isf-stepper__item--done" : ""}`}
              onClick={() => onChange(mod.id)}
              style={mod.accent ? { ["--mod-accent" as string]: mod.accent } : undefined}
            >
              {mod.icon && (
                <span className="isf-stepper__icon">
                  <i className={`ti ti-${mod.icon}`} aria-hidden="true" />
                </span>
              )}
              <span className="isf-stepper__copy">
                <span className="isf-stepper__label">{mod.label}</span>
                {mod.sublabel && <span className="isf-stepper__sub">{mod.sublabel}</span>}
              </span>
              {mod.done && <i className="ti ti-circle-check isf-stepper__check" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CalculatorLiveSummary({
  title,
  metrics,
  chart,
  children,
}: {
  title: string;
  metrics?: { label: string; value: string }[];
  chart?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <aside className="isf-live-summary card card--elevated">
      <p className="isf-live-summary__title">{title}</p>
      {metrics && metrics.length > 0 && (
        <div className="isf-live-summary__metrics">
          {metrics.map((m) => (
            <div key={m.label} className="isf-live-summary__metric">
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </div>
          ))}
        </div>
      )}
      {chart && <div className="isf-live-summary__chart calc-chart">{chart}</div>}
      {children}
    </aside>
  );
}

export function CalculatorWorkbenchHeader({
  eyebrow,
  title,
  meta,
  badges,
  showClientPicker,
  clients,
  clientId,
  clientsLoading,
  recordLoading,
  fiscalYear,
  onClientChange,
  onFiscalYearChange,
  onOpenNextPending,
  extraControls,
  showFiscalYear = true,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  badges?: ReactNode;
  showClientPicker?: boolean;
  clients?: { id: string; companyName: string }[];
  clientId?: string;
  clientsLoading?: boolean;
  recordLoading?: boolean;
  fiscalYear: string;
  onClientChange?: (id: string) => void;
  onFiscalYearChange: (fy: string) => void;
  onOpenNextPending?: () => void;
  extraControls?: ReactNode;
  showFiscalYear?: boolean;
}) {
  const showFy = showFiscalYear;
  const hasControls =
    (showClientPicker && onClientChange) ||
    showFy ||
    (showClientPicker && onOpenNextPending) ||
    extraControls;

  return (
    <header className="isf-client-header card card--elevated">
      <div className="isf-client-header__top">
        <p className="isf-client-header__eyebrow">{eyebrow}</p>
        {badges && <div className="isf-client-header__badges">{badges}</div>}
      </div>
      <div className="isf-client-header__body">
        <div className="isf-client-header__identity">
          <h2 className="isf-client-header__title">{title}</h2>
          {meta && <p className="isf-client-header__meta">{meta}</p>}
        </div>
        {hasControls && (
          <div className="isf-client-header__toolbar">
            {showClientPicker && onClientChange && (
              <label className="isf-client-header__toolbar-field">
                <span className="isf-client-header__toolbar-label">Client</span>
                <select
                  className="dash-input isf-client-header__toolbar-control"
                  value={clientId ?? ""}
                  onChange={(e) => onClientChange(e.target.value)}
                  disabled={clientsLoading || recordLoading}
                >
                  <option value="">Select client</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {showFy && (
              <label className="isf-client-header__toolbar-field">
                <span className="isf-client-header__toolbar-label">Fiscal year</span>
                <FiscalYearSelect
                  className="dash-input isf-client-header__toolbar-control"
                  value={fiscalYear}
                  onChange={onFiscalYearChange}
                />
              </label>
            )}
            {showClientPicker && onOpenNextPending && (
              <button type="button" className="btn-ghost" onClick={onOpenNextPending}>
                Open next pending
              </button>
            )}
            {extraControls}
          </div>
        )}
      </div>
    </header>
  );
}

export function CalculatorModuleFormLayout({
  form,
  insight,
}: {
  form: ReactNode;
  insight: ReactNode;
}) {
  return (
    <div className="isf-module-layout">
      <div className="isf-module-layout__form">{form}</div>
      <div className="isf-module-layout__insight">{insight}</div>
    </div>
  );
}

export function CalculatorInsightCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="isf-insight-card card">
      <p className="isf-insight-card__title">{title}</p>
      <div className="isf-insight-card__body">{children}</div>
    </aside>
  );
}

export function CalculatorMetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="isf-metric-card">
      <p className="isf-metric-card__label">{label}</p>
      <p className="isf-metric-card__value">{value}</p>
      {hint && <p className="isf-metric-card__hint">{hint}</p>}
    </div>
  );
}

export function CalculatorWorkbenchError({ message }: { message: string }) {
  return (
    <p className="isf-workbench-error" role="alert">
      {message}
    </p>
  );
}

export function CalculatorWorkbenchFooter({
  left,
  actions,
}: {
  left?: ReactNode;
  actions: ReactNode;
}) {
  const footerRef = useRef<HTMLElement>(null);
  const portalRoot = useDashMainPortalRoot();

  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const page = document.querySelector(".isf-workbench-page, .calc-workbench-page");
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
        <div className="isf-workbench-footer__left">{left}</div>
        <div className="isf-workbench-footer__actions">{actions}</div>
      </div>
    </footer>
  );

  if (portalRoot) return createPortal(footer, portalRoot);
  return footer;
}
