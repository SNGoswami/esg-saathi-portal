import type { RoleKey } from "@/modules/platform/rbac/roles";

export type FaqJourneyStep = {
  step: number;
  icon: string;
  title: string;
  description: string;
  view?: string;
  roles?: RoleKey[];
};

export type FaqQuickLink = {
  view: string;
  icon: string;
  label: string;
  description: string;
  accent: string;
  roles?: RoleKey[];
};

const ADVISOR_ROLES: RoleKey[] = ["ca", "esg_consultant", "assurer_auditor"];

const JOURNEY_STEPS: FaqJourneyStep[] = [
  {
    step: 1,
    icon: "users-group",
    title: "Add clients",
    description: "Onboard MSME organisations you advise.",
    view: "clients",
    roles: ADVISOR_ROLES,
  },
  {
    step: 1,
    icon: "layout-dashboard",
    title: "Open Overview",
    description: "Check tasks and your latest ESG snapshot.",
    view: "dashboard",
    roles: ["msme"],
  },
  {
    step: 2,
    icon: "clipboard-check",
    title: "Run Lighthouse",
    description: "Complete the E, S, and G self-assessment.",
    view: "assessment",
  },
  {
    step: 3,
    icon: "calculator",
    title: "Use calculators",
    description: "ISF, Scope 3 GHG, and Net Zero for emissions data.",
    view: "isf-calculator",
  },
  {
    step: 4,
    icon: "file-description",
    title: "Open Reports",
    description: "Review, filter, and export saved outputs.",
    view: "reports",
  },
];

const QUICK_LINKS: FaqQuickLink[] = [
  {
    view: "clients",
    icon: "users-group",
    label: "Clients",
    description: "Manage engagements",
    accent: "#0D9488",
    roles: ADVISOR_ROLES,
  },
  {
    view: "assessment",
    icon: "clipboard-check",
    label: "Assessment",
    description: "Lighthouse scores",
    accent: "#10B981",
  },
  {
    view: "isf-calculator",
    icon: "calculator",
    label: "ISF Calculator",
    description: "Intensity & resources",
    accent: "#059669",
  },
  {
    view: "scope-3-ghg",
    icon: "cloud",
    label: "Scope 3 GHG",
    description: "15 GHG categories",
    accent: "#6366F1",
  },
  {
    view: "net-zero",
    icon: "plant-2",
    label: "Net Zero",
    description: "Targets & pathway",
    accent: "#2563EB",
  },
  {
    view: "reports",
    icon: "file-description",
    label: "Reports",
    description: "All saved outputs",
    accent: "#006C49",
  },
  {
    view: "ai-advisor",
    icon: "sparkles",
    label: "AI Advisor",
    description: "Daily ESG guidance",
    accent: "#8B5CF6",
  },
];

function visibleForRole<T extends { roles?: RoleKey[] }>(items: T[], role: RoleKey): T[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export function journeyStepsForRole(role: RoleKey): FaqJourneyStep[] {
  const steps = visibleForRole(JOURNEY_STEPS, role);
  return steps.map((s, i) => ({ ...s, step: i + 1 }));
}

export function quickLinksForRole(role: RoleKey): FaqQuickLink[] {
  return visibleForRole(QUICK_LINKS, role);
}
