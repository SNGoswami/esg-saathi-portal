export function fmtNum(n?: number | null, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

export function fmtInr(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtKpi(
  value?: number | null,
  status?: string | null,
  unit?: string,
): string {
  if (status === "NOT_APPLICABLE") return "N/A";
  if (value == null || !Number.isFinite(value)) return "-";
  if (unit === "%") return `${fmtNum(value, 2)}%`;
  if (unit === "ratio") return fmtNum(value, 4);
  if (unit === "hrs") return `${fmtNum(value, 2)} hrs`;
  return fmtNum(value, 2);
}
