"use client";

import { useMemo } from "react";
import { getFiscalYearOptions } from "@/modules/platform/utils/fiscalYear";

export function FiscalYearSelect({
  value,
  onChange,
  className = "dash-input",
  disabled,
  id,
  "aria-label": ariaLabel = "Fiscal year",
}: {
  value: string;
  onChange: (fy: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  const options = useMemo(() => getFiscalYearOptions(10, value), [value]);

  return (
    <select
      className={className}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {options.map((fy) => (
        <option key={fy} value={fy}>
          {fy}
        </option>
      ))}
    </select>
  );
}
