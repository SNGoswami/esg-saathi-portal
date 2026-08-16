/** Data is "fresh" if fetched or updated within this window. */
export const WIDGET_FRESH_MS = 10 * 60 * 1000;

export type WidgetFreshness = "fresh" | "stale" | "unknown";

export type WidgetSourceState = {
  fetchedAt: number | null;
  latestDataAt: number | null;
  refreshing: boolean;
};

export function maxTimestamp(...values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

export function latestIsoTimestamp(...values: Array<string | null | undefined>): number | null {
  const times = values
    .map((iso) => (iso ? new Date(iso).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  return Math.max(...times);
}

export function getWidgetFreshness(
  sources: WidgetSourceState[],
  now = Date.now(),
): WidgetFreshness {
  if (sources.length === 0) return "unknown";
  if (sources.some((s) => s.fetchedAt == null)) return "unknown";

  const reference = maxTimestamp(
    ...sources.map((s) => maxTimestamp(s.latestDataAt, s.fetchedAt)),
  );
  if (reference == null) return "unknown";

  return now - reference <= WIDGET_FRESH_MS ? "fresh" : "stale";
}

export function formatWidgetUpdatedLabel(
  sources: WidgetSourceState[],
  now = Date.now(),
): string {
  const reference = maxTimestamp(
    ...sources.map((s) => maxTimestamp(s.latestDataAt, s.fetchedAt)),
  );
  if (reference == null) return "Not loaded";

  const diffMs = now - reference;
  if (diffMs < 60_000) return "Updated just now";
  if (diffMs < 3600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `Updated ${mins}m ago`;
  }
  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3600_000);
    return `Updated ${hours}h ago`;
  }
  return `Updated ${new Date(reference).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}
