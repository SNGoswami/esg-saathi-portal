/** Display label, e.g. 2025-26 → FY 2025–26 */
export function formatFiscalYearLabel(fy: string): string {
  return `FY ${fy.replace("-", "–")}`;
}

/** Indian financial year label, e.g. 2025-26 (April–March). */
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month < 3) {
    return `${year - 1}-${String(year).slice(2)}`;
  }
  return `${year}-${String(year + 1).slice(2)}`;
}

/** Prior FY label, e.g. 2024-25 → 2023-24. */
export function priorFiscalYear(fy: string): string {
  const m = fy.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const start = Number(m[1]);
  const endShort = Number(m[2]);
  return `${start - 1}-${String(endShort - 1).padStart(2, "0")}`;
}

/** True when `fy` is before the current Indian financial year. */
export function isPriorFiscalYear(fy: string): boolean {
  return fy !== getCurrentFiscalYear();
}

/** Current FY first, then the prior `priorCount` years (11 options by default). */
export function getFiscalYearOptions(priorCount = 10, include?: string): string[] {
  const options: string[] = [];
  let fy: string | null = getCurrentFiscalYear();
  while (fy && options.length <= priorCount) {
    options.push(fy);
    const prev = priorFiscalYear(fy);
    if (!prev || options.includes(prev)) break;
    fy = prev;
  }
  if (include && !options.includes(include)) {
    options.push(include);
  }
  return options;
}
