/**
 * Role-based dashboard navigation, matches product RBAC matrix.
 * CA, ESG Consultant, Assurer: 18 links | CS: 16 | MSME: 14 (Selective vs Governance).
 */

import type { RoleKey } from "@/modules/platform/rbac/roles";

export type NavItem = {
  label: string;
  view: string;
  icon: string;
  badge?: string;
  /** Shorter label for the sidebar when `label` is too long for the nav rail. */
  sidebarLabel?: string;
};

export type NavGroup = {
  section: string;
  items: NavItem[];
};

const ACCOUNT_GROUP: NavGroup = {
  section: "Account",
  items: [
    { label: "Profile", view: "profile", icon: "user-circle" },
    { label: "Settings", view: "settings", icon: "settings" },
  ],
};

const OVERVIEW: NavItem = { label: "Overview", view: "dashboard", icon: "layout-dashboard" };
const CLIENTS: NavItem = { label: "Clients", view: "clients", icon: "users-group" };
const ASSESSMENT: NavItem = { label: "Assessment", view: "assessment", icon: "clipboard-check" };
const REPORTS: NavItem = { label: "Reports", view: "reports", icon: "file-description" };

const TOOLS: NavItem[] = [
  { label: "AI Advisor", view: "ai-advisor", icon: "sparkles" },
  { label: "Documents", view: "documents", icon: "files" },
  { label: "Regulatory Deadline", view: "regulatory-deadline", icon: "calendar-due" },
];

const PILLARS_BASE: NavItem[] = [
  { label: "Environmental", view: "environmental", icon: "leaf" },
  { label: "Workforce", view: "workforce", icon: "users" },
  { label: "Stakeholder & HR", view: "stakeholder-hr", icon: "heart-handshake" },
];

const GOVERNANCE: NavItem = { label: "Governance", view: "governance", icon: "building-bank" };
const SELECTIVE: NavItem = { label: "Selective", view: "selective-governance", icon: "filter" };

const CALCULATORS: NavItem[] = [
  { label: "ISF Calculator", view: "isf-calculator", icon: "calculator" },
  { label: "Scope 3 GHG", view: "scope-3-ghg", icon: "cloud" },
  { label: "Net Zero Emissions", view: "net-zero", icon: "plant-2" },
];

const ESG_HEAT_MAP: NavItem = { label: "ESG Heat Map", view: "esg-heatmap", icon: "chart-dots-3" };
const BRSR_FILING: NavItem = { label: "BRSR Filing", view: "brsr-filing", icon: "file-certificate" };
const ASSURANCE: NavItem = { label: "Assurance", view: "assurance", icon: "shield-check" };
const FAQ_ITEM: NavItem = {
  label: "Frequently asked questions",
  sidebarLabel: "FAQ",
  view: "faq",
  icon: "help-circle",
};

function mainItems(role: RoleKey): NavItem[] {
  const items: NavItem[] = [OVERVIEW];
  if (role === "ca" || role === "esg_consultant" || role === "assurer_auditor") {
    items.push(CLIENTS);
  }
  items.push(ASSESSMENT, REPORTS);
  return items;
}

function pillarItems(role: RoleKey): NavItem[] {
  const items = [...PILLARS_BASE];
  items.push(role === "msme" ? SELECTIVE : GOVERNANCE);
  return items;
}

function complianceItems(role: RoleKey): NavItem[] {
  const items: NavItem[] = [];
  if (role === "ca" || role === "esg_consultant" || role === "assurer_auditor") {
    items.push(ESG_HEAT_MAP);
  }
  if (role === "ca" || role === "esg_consultant" || role === "cs" || role === "assurer_auditor") {
    items.push(BRSR_FILING, ASSURANCE);
  }
  return items;
}

function toolItems(role: RoleKey): NavItem[] {
  return [...TOOLS, ...complianceItems(role)];
}

function buildRoleNav(role: RoleKey): NavGroup[] {
  if (role === "admin") return ADMIN_NAV;

  return [
    { section: "Main", items: mainItems(role) },
    { section: "Calculators", items: [...CALCULATORS] },
    { section: "Tools", items: toolItems(role) },
    { section: "ESG Pillars", items: pillarItems(role) },
    { section: "Help", items: [FAQ_ITEM] },
    ACCOUNT_GROUP,
  ];
}

const ADMIN_NAV: NavGroup[] = [
  {
    section: "Workspace",
    items: [
      { label: "Inbox", view: "dashboard", icon: "inbox" },
      { label: "Meetings", view: "meetings", icon: "calendar-event" },
      { label: "Approvals", view: "pending-users", icon: "user-check" },
      { label: "Users", view: "users", icon: "users" },
      { label: "Analytics", view: "analytics", icon: "chart-bar" },
    ],
  },
  ACCOUNT_GROUP,
];

/** Legacy directory URLs still open the unified Users view. */
export const ADMIN_DIRECTORY_VIEWS = ["users", "msmes", "cas", "css", "esgs", "auditors"] as const;

export const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  msme: buildRoleNav("msme"),
  ca: buildRoleNav("ca"),
  cs: buildRoleNav("cs"),
  esg_consultant: buildRoleNav("esg_consultant"),
  assurer_auditor: buildRoleNav("assurer_auditor"),
  admin: ADMIN_NAV,
};

export const ROLE_LABELS: Record<string, string> = {
  msme: "MSME",
  ca: "Chartered Accountant",
  cs: "Company Secretary",
  esg_consultant: "ESG Consultant",
  assurer_auditor: "Assurer / Auditor",
  admin: "Administrator",
};

export const AUTH_ROLE_TO_PROFILE: Record<string, string> = {
  msme: "MSME",
  ca: "CA",
  cs: "CS",
  esg_consultant: "ESG_CONSULTANT",
  assurer_auditor: "ASSURER_AUDITOR",
  admin: "ADMIN",
};

export function allViewsForRole(role: string): NavItem[] {
  return (NAV_BY_ROLE[role] ?? NAV_BY_ROLE.msme).flatMap((g) => g.items);
}

export function findNavItem(role: string, view: string): NavItem | undefined {
  const items = allViewsForRole(role);
  const direct = items.find((i) => i.view === view);
  if (direct) return direct;
  if (role === "admin" && ADMIN_DIRECTORY_VIEWS.includes(view as (typeof ADMIN_DIRECTORY_VIEWS)[number])) {
    return items.find((i) => i.view === "users");
  }
  return undefined;
}

export function isViewAllowedForRole(role: string, view: string): boolean {
  if (allViewsForRole(role).some((i) => i.view === view)) return true;
  return role === "admin" && ADMIN_DIRECTORY_VIEWS.includes(view as (typeof ADMIN_DIRECTORY_VIEWS)[number]);
}

export function navHighlightView(role: string, view: string): string {
  if (role === "admin" && ADMIN_DIRECTORY_VIEWS.includes(view as (typeof ADMIN_DIRECTORY_VIEWS)[number])) {
    return "users";
  }
  return view;
}

const VIEW_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Your ESG workspace snapshot, scores, tasks, and quick access to tools.",
  analytics: "Users by status and role.",
  "pending-users": "Signups waiting for a demo and access decision.",
  meetings: "Week calendar for product demos.",
  users: "Registered accounts by role.",
  msmes: "MSME users, name, sector, and sub-sector.",
  cas: "Chartered Accountants, name and ICAI member number.",
  css: "Company Secretaries, name and ICSI member number.",
  esgs: "ESG consultants, consultant ID, organization, and expertise.",
  auditors: "Assurers and auditors, accreditation number and organization.",
  logs: "System and audit logs for troubleshooting.",
  profile: "Account details and professional credentials.",
  settings: "Update phone, email (OTP verified), and password.",
  assessment: "Lighthouse and BRSR assessments — one per client organisation.",
  "ai-advisor": "Personalized ESG chat, 5 questions per day (Gemini 2.0 Flash).",
  reports:
    "All reports — Lighthouse, BRSR, calculators, Workforce, Stakeholder & HR, and Governance.",
  clients: "Manage client organisations and engagements.",
  governance: "Policy matrix, board structure, ethics, CSR, and sustainability committee.",
  "selective-governance": "Selective BRSR governance disclosures for MSMEs.",
  "stakeholder-hr":
    "Stakeholder engagement, materiality, human rights training, grievances, and HR policies.",
  assurance: "Assurance workflows and sign-off.",
  "brsr-filing": "BRSR filing preparation and submission.",
  environmental:
    "Environment extras — furnace oil & CNG, water balance, waste types & disposal, air emissions, PAT, EIA, and compliance. Complements ISF Calculator.",
  "isf-calculator":
    "ISF Calculator — emission intensity, Scope 3 spend, core energy, water-stress PIN, and waste recovery.",
  "scope-3-ghg": "GHG Protocol Scope 3 calculator, 15 categories with spend and activity-based methods.",
  "net-zero": "Net zero targets, SBTi alignment, pathway modelling, and progress tracking.",
  workforce:
    "Workforce disclosures — headcount, wages, safety, training, benefits, and inclusion metrics.",
  faq: "Answers about Lighthouse, calculators, reports, clients, AI Advisor, and account settings.",
};

export function viewDescription(view: string, role?: string): string {
  if (view === "dashboard" && role === "admin") {
    return "Unreplied mail, upcoming demo, and waitlist.";
  }
  if (view === "dashboard") {
    return VIEW_DESCRIPTIONS.dashboard;
  }
  return VIEW_DESCRIPTIONS[view] ?? "Manage this section of your ESG workspace.";
}
