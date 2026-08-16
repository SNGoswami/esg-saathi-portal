/**
 * Role normalization and post-login redirect for the portal.
 */

import { getSafeRedirectPath } from "@/modules/platform/auth/redirect";

export type RoleKey =
  | "msme"
  | "ca"
  | "cs"
  | "esg_consultant"
  | "assurer_auditor"
  | "admin";

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
