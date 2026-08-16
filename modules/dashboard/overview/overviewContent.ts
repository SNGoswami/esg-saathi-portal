import type { RoleKey } from "@/modules/platform/rbac/roles";

export type OverviewQuickAction = {
  view: string;
  icon: string;
  label: string;
  description: string;
};

const ADVISOR_ROLES: RoleKey[] = ["ca", "esg_consultant", "assurer_auditor"];

export function roleHasClients(role: RoleKey): boolean {
  return ADVISOR_ROLES.includes(role);
}

export function overviewFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = month >= 3 ? year : year - 1;
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

export function msmeHeroContent(): { title: string; description: string } {
  return {
    title: "Your ESG dashboard",
    description: "Pillar scores, KPI progress, and saved reports, all in one place.",
  };
}

export function professionalHeroContent(role: RoleKey): { title: string; description: string } {
  switch (role) {
    case "ca":
      return {
        title: "Client portfolio",
        description: "BRSR progress, calculator adoption, and engagement health across your clients.",
      };
    case "cs":
      return {
        title: "Governance workspace",
        description: "BRSR readiness, filings status, and client governance coverage.",
      };
    case "esg_consultant":
      return {
        title: "Consulting portfolio",
        description: "Client deliverables, sustainability metrics, and calculator coverage.",
      };
    case "assurer_auditor":
      return {
        title: "Assurance pipeline",
        description: "Client ESG status, BRSR completion, and report activity.",
      };
    default:
      return {
        title: "Workspace overview",
        description: "Portfolio health, client activity, and saved deliverables.",
      };
  }
}

export function msmeQuickActions(): OverviewQuickAction[] {
  return [
    {
      view: "assessment",
      icon: "clipboard-check",
      label: "Lighthouse",
      description: "Run E, S, and G assessment",
    },
    {
      view: "isf-calculator",
      icon: "calculator",
      label: "ISF Calculator",
      description: "Intensity and resources",
    },
    {
      view: "scope-3-ghg",
      icon: "cloud",
      label: "Scope 3 GHG",
      description: "15 category emissions",
    },
    {
      view: "net-zero",
      icon: "plant-2",
      label: "Net Zero",
      description: "Targets and pathway",
    },
    {
      view: "reports",
      icon: "file-description",
      label: "Reports",
      description: "Saved outputs",
    },
    {
      view: "ai-advisor",
      icon: "sparkles",
      label: "AI Advisor",
      description: "Daily ESG guidance",
    },
  ];
}

export function professionalQuickActions(role: RoleKey): OverviewQuickAction[] {
  const actions: OverviewQuickAction[] = [];

  if (roleHasClients(role)) {
    actions.push({
      view: "clients",
      icon: "users-group",
      label: "Clients",
      description: "Manage organisations",
    });
  }

  actions.push(
    {
      view: "assessment",
      icon: "clipboard-check",
      label: "Assessment",
      description: "Lighthouse scores",
    },
    {
      view: "isf-calculator",
      icon: "calculator",
      label: "ISF Calculator",
      description: "Intensity and resources",
    },
    {
      view: "scope-3-ghg",
      icon: "cloud",
      label: "Scope 3 GHG",
      description: "Category emissions",
    },
    {
      view: "net-zero",
      icon: "plant-2",
      label: "Net Zero",
      description: "Targets and pathway",
    },
    {
      view: "reports",
      icon: "file-description",
      label: "Reports",
      description: "All saved outputs",
    },
  );

  if (role === "ca" || role === "cs" || role === "esg_consultant" || role === "assurer_auditor") {
    actions.push({
      view: "brsr-filing",
      icon: "file-certificate",
      label: "BRSR Filing",
      description: "Prepare disclosures",
    });
  }

  if (role === "ca" || role === "cs" || role === "esg_consultant" || role === "assurer_auditor") {
    actions.push({
      view: "assurance",
      icon: "shield-check",
      label: "Assurance",
      description: "Review and sign-off",
    });
  }

  if (role === "ca" || role === "esg_consultant" || role === "assurer_auditor") {
    actions.push({
      view: "esg-heatmap",
      icon: "chart-dots-3",
      label: "ESG Heat Map",
      description: "Portfolio risk view",
    });
  }

  return actions;
}
