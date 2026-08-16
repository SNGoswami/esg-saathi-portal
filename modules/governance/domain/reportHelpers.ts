export function fmtNum(n?: number | null, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
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

export function fmtKpiGov(
  value?: number | string | null,
  status?: string | null,
  suffix = "",
): string {
  if (status === "NOT_APPLICABLE") return "N/A";
  if (typeof value === "string") return value;
  if (value == null || !Number.isFinite(value)) return "-";
  return `${fmtNum(value, 2)}${suffix}`;
}
