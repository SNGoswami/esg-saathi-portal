import type { LighthouseAssessmentApi } from "@/modules/lighthouse/api/lighthouseApi";
import { getLighthouseForClient, getMyLighthouseAssessment } from "@/modules/lighthouse/api/lighthouseApi";

function cacheKey(clientId?: string | null) {
  return clientId ? `lighthouse_report_v1_${clientId}` : "lighthouse_report_v1";
}

export function readLighthouseReportCache(clientId?: string | null): LighthouseAssessmentApi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(clientId));
    return raw ? (JSON.parse(raw) as LighthouseAssessmentApi) : null;
  } catch {
    return null;
  }
}

export function writeLighthouseReportCache(data: LighthouseAssessmentApi, clientId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(clientId), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function formatLighthouseTakenAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: "-", time: "-" };
  }
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

/**
 * Returns cached report immediately when available, then refreshes from API in the background.
 */
export async function loadLighthouseReport(options?: {
  clientId?: string | null;
  forceRefresh?: boolean;
  onUpdate?: (report: LighthouseAssessmentApi | null) => void;
}): Promise<LighthouseAssessmentApi | null> {
  const clientId = options?.clientId ?? null;
  const cached = readLighthouseReportCache(clientId);
  const fetchFresh = () =>
    clientId ? getLighthouseForClient(clientId) : getMyLighthouseAssessment();

  if (!options?.forceRefresh && cached) {
    fetchFresh()
      .then((fresh) => {
        if (fresh) writeLighthouseReportCache(fresh, clientId);
        options?.onUpdate?.(fresh);
      })
      .catch(() => {
        /* keep cache */
      });
    return cached;
  }

  const fresh = await fetchFresh();
  if (fresh) writeLighthouseReportCache(fresh, clientId);
  options?.onUpdate?.(fresh);
  return fresh;
}
