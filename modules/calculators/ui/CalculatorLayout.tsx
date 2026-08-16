"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CalculatorPage({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`calc-page${className ? ` ${className}` : ""}`}>
      {title && (
        <header className="calc-page__header">
          <h1 className="calc-page__title">{title}</h1>
          {subtitle && <p className="calc-page__subtitle">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}

export function CalculatorWorkspaceTabs({
  active,
  onChange,
}: {
  active: "calculate" | "history";
  onChange: (tab: "calculate" | "history") => void;
}) {
  return (
    <div className="calc-workspace-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={active === "calculate"}
        className={`calc-workspace-tabs__btn${active === "calculate" ? " calc-workspace-tabs__btn--active" : ""}`}
        onClick={() => onChange("calculate")}
      >
        Calculator
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "history"}
        className={`calc-workspace-tabs__btn${active === "history" ? " calc-workspace-tabs__btn--active" : ""}`}
        onClick={() => onChange("history")}
      >
        History
      </button>
    </div>
  );
}

export function CalculatorField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`calc-field${className ? ` ${className}` : ""}`}>
      <span className="calc-field__label">{label}</span>
      {children}
    </label>
  );
}

export function CalculatorKpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="calc-kpi">
      <p className="calc-kpi__label">{label}</p>
      <p className="calc-kpi__value">{value}</p>
      {hint && <p className="calc-kpi__hint">{hint}</p>}
    </div>
  );
}

export function CalculatorKpiStrip({ children }: { children: ReactNode }) {
  return <div className="calc-kpi-strip">{children}</div>;
}

export function CalculatorPanel({
  title,
  subtitle,
  children,
  actions,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="calc-panel card card--elevated">
      {(title || actions) && (
        <div className="calc-panel__head">
          <div>
            {title && <h2 className="calc-panel__title">{title}</h2>}
            {subtitle && <p className="calc-panel__subtitle">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="calc-panel__body">{children}</div>
    </section>
  );
}

/** Primary/secondary actions row — matches Scope 3 GHG calculator pattern. */
export function CalculatorFormActions({ children }: { children: ReactNode }) {
  return <div className="calc-form-actions">{children}</div>;
}

/** Scroll a horizontal tab strip so the active child stays visible. */
export function scrollHorizontalIntoView(
  container: HTMLElement | null,
  child: HTMLElement | null,
  padding = 12,
) {
  if (!container || !child) return;

  const tabLeft = child.offsetLeft;
  const tabRight = tabLeft + child.offsetWidth;
  const viewLeft = container.scrollLeft;
  const viewRight = viewLeft + container.clientWidth;

  if (tabLeft < viewLeft + padding) {
    container.scrollTo({ left: Math.max(0, tabLeft - padding), behavior: "smooth" });
  } else if (tabRight > viewRight - padding) {
    container.scrollTo({
      left: tabRight - container.clientWidth + padding,
      behavior: "smooth",
    });
  }
}

export function CalculatorModuleTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; shortLabel?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollHorizontalIntoView(scrollRef.current, tabRefs.current.get(active) ?? null);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, tabs]);

  return (
    <div className="calc-module-tabs-wrap card card--elevated">
      <div className="calc-module-tabs" role="tablist" ref={scrollRef}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          ref={(node) => {
            if (node) tabRefs.current.set(t.id, node);
            else tabRefs.current.delete(t.id);
          }}
          className={`calc-module-tabs__btn${active === t.id ? " calc-module-tabs__btn--active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.shortLabel ? (
            <>
              <span className="calc-module-tabs__label calc-module-tabs__label--short">{t.shortLabel}</span>
              <span className="calc-module-tabs__label calc-module-tabs__label--full">{t.label}</span>
            </>
          ) : (
            t.label
          )}
        </button>
      ))}
      </div>
    </div>
  );
}

export function ClientProgressDetails({
  fiscalYear,
  completed,
  total,
  children,
}: {
  fiscalYear?: string;
  completed: number;
  total: number;
  children: ReactNode;
}) {
  const fyLabel = fiscalYear ? `, FY ${fiscalYear}` : "";
  return (
    <details className="calc-client-progress">
      <summary className="calc-client-progress__summary">
        Client progress{fyLabel}
        <span className="calc-client-progress__badge">
          {completed}/{total} complete
        </span>
      </summary>
      <div className="calc-client-progress__body">
        <div className="calc-history-table-wrap">{children}</div>
      </div>
    </details>
  );
}
