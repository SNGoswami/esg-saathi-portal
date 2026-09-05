/**
 * Role normalization and post-login redirect for the portal.
 */

import {
  ADMIN_HOME,
  USER_HOME,
  getSafeRedirectPath,
  remapUserPathToAdmin,
} from "@/modules/platform/auth/redirect";

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

export function workspaceHome(role: string | null | undefined): string {
  return normalizeRole(role) === "admin" ? ADMIN_HOME : USER_HOME;
}

export function getPostLoginPath(
  role: string | null | undefined,
  redirect?: string | null,
): string {
  const key = normalizeRole(role);
  const fallback = workspaceHome(key);
  const safe = getSafeRedirectPath(redirect, fallback);
  const pathname = safe.split("?")[0] ?? safe;

  if (key === "admin") {
    if (pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`)) return safe;
    if (pathname.startsWith("/user/")) return remapUserPathToAdmin(safe);
    return ADMIN_HOME;
  }

  if (pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`)) {
    return USER_HOME;
  }
  return safe;
}
