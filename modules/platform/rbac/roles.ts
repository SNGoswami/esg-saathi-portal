/**
 * Central role normalization, used by auth, dashboard RBAC, and redirects.
 * Signup uses MSME | CA | CS | ESG_CONSULTANT | ASSURER_AUDITOR (5 roles).
 */

import { getSafeRedirectPath } from "@/modules/platform/auth/redirect";
import { BRAND, PILLARS } from "@/modules/platform/theme/tokens";

export type RoleKey =
  | "msme"
  | "ca"
  | "cs"
  | "esg_consultant"
  | "assurer_auditor"
  | "admin";

export const SIGNUP_ROLES = [
  { value: "MSME", slug: "msme" as RoleKey, label: "MSME", desc: "Micro, Small & Medium Enterprise", accent: BRAND[500] },
  { value: "CA", slug: "ca" as RoleKey, label: "Chartered Accountant", desc: "Audit & compliance partner", accent: BRAND[600] },
  { value: "CS", slug: "cs" as RoleKey, label: "Company Secretary", desc: "Governance & filings", accent: BRAND[700] },
  { value: "ESG_CONSULTANT", slug: "esg_consultant" as RoleKey, label: "ESG Consultant", desc: "Sustainability advisor", accent: PILLARS.social.base },
  { value: "ASSURER_AUDITOR", slug: "assurer_auditor" as RoleKey, label: "Assurer / Auditor", desc: "Third-party assurance", accent: PILLARS.governance.base },
] as const;

const ROLE_ALIASES: Record<string, RoleKey> = {
  msme: "msme",
  ca: "ca",
  cs: "cs",
  esg_consultant: "esg_consultant",
  esgconsultant: "esg_consultant",
  esg: "esg_consultant",
  assurer_auditor: "assurer_auditor",
  assurer: "assurer_auditor",
  auditor: "assurer_auditor",
  admin: "admin",
  administrator: "admin",
};

/** Normalize API/JWT role string → dashboard role slug */
export function normalizeRole(role: string | null | undefined): RoleKey {
  if (!role) return "msme";
  const raw = role.replace(/^ROLE_/i, "").toLowerCase().replace(/[\s-]+/g, "_");
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  if (raw.includes("assurer") || raw.includes("auditor")) return "assurer_auditor";
  if (raw.includes("consultant") || raw === "esg") return "esg_consultant";
  if (raw.includes("chartered") || raw === "accountant") return "ca";
  if (raw.includes("secretary")) return "cs";
  return "msme";
}

export function getPostLoginPath(
  _role: string | null | undefined,
  redirect?: string | null,
): string {
  return getSafeRedirectPath(redirect);
}

export function isKnownRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const raw = role.replace(/^ROLE_/i, "").toLowerCase().replace(/[\s-]+/g, "_");
  return (
    raw in ROLE_ALIASES ||
    raw.includes("assurer") ||
    raw.includes("auditor") ||
    raw.includes("consultant") ||
    raw === "admin"
  );
}
