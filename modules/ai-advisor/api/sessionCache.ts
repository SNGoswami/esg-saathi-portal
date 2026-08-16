import type { AdvisorMessage, AiAdvisorQuota } from "@/modules/ai-advisor/api/aiAdvisorApi";

const CACHE_PREFIX = "ai_advisor_session_v1_";

export type AiAdvisorSessionCache = {
  messages: AdvisorMessage[];
  quota: AiAdvisorQuota | null;
  updatedAt: string;
};

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

export function readAiAdvisorSession(userId: string): AiAdvisorSessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiAdvisorSessionCache;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAiAdvisorSession(userId: string, data: AiAdvisorSessionCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function clearAiAdvisorSession(userId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(userId));
  } catch {
    /* ignore */
  }
}
