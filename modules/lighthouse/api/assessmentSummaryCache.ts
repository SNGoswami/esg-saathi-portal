import type { BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import type { Client } from "@/modules/clients/api/clientsApi";
import type { IsfClientStatus } from "@/modules/isf-calculator/domain/types";
import type { IsfHistoryItem } from "@/modules/isf-calculator/domain/types";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import type { NzeTargetResponse } from "@/modules/net-zero/domain/types";
import type { RoleKey } from "@/modules/platform/rbac/roles";
import type { Scope3HistoryItem } from "@/modules/scope3-ghg/domain/types";
import type { DisclosureHistoryItem } from "@/modules/calculators/domain/disclosureTypes";
import type { WorkforceHistoryItem } from "@/modules/workforce/domain/types";

const MSME_CACHE_KEY = "assessment_summary_msme_v1";

export type MsmeAssessmentSummaryCache = {
  scores: LighthouseScoreResult | null;
  reportCreatedAt: string | null;
  reportUpdatedAt: string | null;
};

export type ProAssessmentSummaryCache = {
  fy: string;
  clients: Client[];
  brsrList: BrsrAssessment[];
  isfStatus: IsfClientStatus[];
  isfHistory: IsfHistoryItem[];
  scope3History: Scope3HistoryItem[];
  nzeTargets: NzeTargetResponse[];
  workforceHistory: WorkforceHistoryItem[];
  governanceHistory: DisclosureHistoryItem[];
  stakeholderHrHistory: DisclosureHistoryItem[];
  workforceStatus: Awaited<
    ReturnType<typeof import("@/modules/workforce/api/workforceApi").getWorkforceClientStatus>
  >;
  governanceStatus: Awaited<
    ReturnType<typeof import("@/modules/governance/api/governanceApi").getGovernanceClientStatus>
  >;
  stakeholderHrStatus: Awaited<
    ReturnType<typeof import("@/modules/stakeholder-hr/api/stakeholderHrApi").getStakeholderHrClientStatus>
  >;
};

function proCacheKey(role: RoleKey, fy: string) {
  return `assessment_summary_pro_v1_${role}_${fy}`;
}

export function readMsmeAssessmentSummaryCache(): MsmeAssessmentSummaryCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MSME_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MsmeAssessmentSummaryCache) : null;
  } catch {
    return null;
  }
}

export function writeMsmeAssessmentSummaryCache(data: MsmeAssessmentSummaryCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MSME_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateMsmeAssessmentSummaryCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MSME_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function readProAssessmentSummaryCache(
  role: RoleKey,
  fy: string,
): ProAssessmentSummaryCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(proCacheKey(role, fy));
    return raw ? (JSON.parse(raw) as ProAssessmentSummaryCache) : null;
  } catch {
    return null;
  }
}

export function writeProAssessmentSummaryCache(
  role: RoleKey,
  data: ProAssessmentSummaryCache,
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(proCacheKey(role, data.fy), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function invalidateProAssessmentSummaryCache(role: RoleKey, fy: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(proCacheKey(role, fy));
  } catch {
    /* ignore */
  }
}
