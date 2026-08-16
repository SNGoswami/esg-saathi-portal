"use client";

import type { ReactNode } from "react";
import { isPriorFiscalYear } from "@/modules/platform/utils/fiscalYear";

export function FiscalYearFormGate({
  fiscalYear,
  recordLoading,
  hasRecord,
  layout = "default",
  children,
}: {
  fiscalYear: string;
  recordLoading?: boolean;
  hasRecord: boolean;
  layout?: "default" | "workbench";
  children: ReactNode;
}) {
  const isPriorFy = isPriorFiscalYear(fiscalYear);
  const showEmptyOverlay = isPriorFy && !recordLoading && !hasRecord;
  const layoutClass = layout === "workbench" ? " calc-fy-form-gate--workbench" : "";

  if (isPriorFy && recordLoading) {
    return (
      <div className={`calc-fy-form-gate calc-fy-form-gate--loading${layoutClass}`}>
        <p className="dash-muted">Loading fiscal year data…</p>
      </div>
    );
  }

  return (
    <div className={`calc-fy-form-gate${layoutClass}${showEmptyOverlay ? " calc-fy-form-gate--empty" : ""}`}>
      <div className="calc-fy-form-gate__content">{children}</div>
      {showEmptyOverlay && (
        <div className="calc-fy-form-gate__overlay" role="status">
          <p>No data available for this F.Y.</p>
        </div>
      )}
    </div>
  );
}
