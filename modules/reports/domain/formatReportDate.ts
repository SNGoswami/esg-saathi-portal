export function formatReportTakenAt(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "-", time: "-" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "-", time: "-" };
  return {
    date: d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}
