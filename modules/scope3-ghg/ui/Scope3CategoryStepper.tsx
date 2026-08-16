"use client";

import type { WorkbenchModuleItem } from "@/modules/calculators/ui/CalculatorWorkbenchLayout";

export function Scope3CategoryStepper({
  modules,
  active,
  onChange,
  completionPct,
}: {
  modules: WorkbenchModuleItem[];
  active: string;
  onChange: (id: string) => void;
  completionPct?: number;
}) {
  return (
    <nav className="isf-stepper isf-stepper--scope3 card card--elevated" aria-label="Categories">
      <p className="isf-stepper__heading">
        Categories
        {completionPct != null && <span className="isf-stepper__pct">{completionPct}%</span>}
      </p>
      <ul className="isf-stepper__list isf-stepper__list--scope3-grid">
        {modules.map((mod) => (
          <li key={mod.id}>
            <button
              type="button"
              className={`isf-stepper__item isf-stepper__item--scope3-num${active === mod.id ? " isf-stepper__item--active" : ""}${mod.done ? " isf-stepper__item--done" : ""}`}
              onClick={() => onChange(mod.id)}
              style={mod.accent ? { ["--mod-accent" as string]: mod.accent } : undefined}
              aria-label={`Category ${mod.label}`}
            >
              <span className="isf-stepper__label">{mod.label}</span>
              {mod.done && <i className="ti ti-circle-check isf-stepper__check" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
