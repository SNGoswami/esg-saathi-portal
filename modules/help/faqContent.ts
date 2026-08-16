import type { RoleKey } from "@/modules/platform/rbac/roles";

export type FaqCategoryId =
  | "getting-started"
  | "assessment"
  | "calculators"
  | "reports"
  | "clients"
  | "ai-advisor"
  | "account"
  | "compliance";

export type FaqItem = {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
  /** When set, the item is shown only for these roles. Omit to show for everyone. */
  roles?: RoleKey[];
  keywords?: string[];
};

export const FAQ_CATEGORIES: { id: FaqCategoryId; label: string; icon: string }[] = [
  { id: "getting-started", label: "Getting started", icon: "rocket" },
  { id: "assessment", label: "Lighthouse", icon: "clipboard-check" },
  { id: "calculators", label: "Calculators", icon: "calculator" },
  { id: "reports", label: "Reports", icon: "file-description" },
  { id: "clients", label: "Clients", icon: "users-group" },
  { id: "ai-advisor", label: "AI Advisor", icon: "sparkles" },
  { id: "account", label: "Account", icon: "user-circle" },
  { id: "compliance", label: "Compliance", icon: "shield-check" },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-esgsaathi",
    category: "getting-started",
    question: "What is ESGSaathi?",
    answer:
      "ESGSaathi is an ESG workspace for Indian MSMEs and their advisors. You can run Lighthouse self-assessments, use ISF and Scope 3 calculators, model net-zero pathways, prepare BRSR-related outputs, and keep reports in one place.",
    keywords: ["platform", "overview", "introduction"],
  },
  {
    id: "who-can-use",
    category: "getting-started",
    question: "Who can use the platform?",
    answer:
      "MSME business users manage their own ESG data. Chartered Accountants, Company Secretaries, ESG consultants, and assurers/auditors can onboard clients and work across engagements. Your sidebar and available tools depend on the role assigned at signup.",
    keywords: ["roles", "msme", "ca", "consultant", "auditor"],
  },
  {
    id: "navigate-dashboard",
    category: "getting-started",
    question: "How do I move between sections?",
    answer:
      "Use the left sidebar to open Overview, Assessment, Reports, calculators, and account pages. On mobile, open the menu from the top bar. The page title in the header always shows where you are.",
    keywords: ["navigation", "sidebar", "menu"],
  },
  {
    id: "lighthouse-purpose",
    category: "assessment",
    question: "What is the Lighthouse self-assessment?",
    answer:
      "Lighthouse is a structured ESG questionnaire across Environmental, Social, and Governance pillars. It produces pillar scores and KPI breakdowns you can revisit in Assessment and under Reports.",
    keywords: ["lighthouse", "scores", "pillars"],
  },
  {
    id: "lighthouse-retake",
    category: "assessment",
    question: "How often should I retake the assessment?",
    answer:
      "Retake it when your operations, policies, or disclosures change materially, or at least once per reporting cycle. Each completed run is saved so you can compare progress over time in Reports.",
    keywords: ["frequency", "retake", "history"],
  },
  {
    id: "lighthouse-scores",
    category: "assessment",
    question: "Where do I see my Lighthouse scores?",
    answer:
      "Open Assessment for the latest breakdown, or Reports and filter by Lighthouse to open a saved run. You can export a PDF from the report detail view when available.",
    keywords: ["scores", "kpi", "export"],
  },
  {
    id: "isf-calculator",
    category: "calculators",
    question: "What does the ISF Calculator cover?",
    answer:
      "The Indian Sustainability Framework (ISF) calculator helps estimate emission intensity, Scope 3 spend-based emissions, energy consumption, water stress, and waste recovery. Save a run to generate a report you can open from Reports.",
    keywords: ["isf", "emission intensity", "energy", "water", "waste"],
  },
  {
    id: "scope3-calculator",
    category: "calculators",
    question: "What is the Scope 3 GHG calculator?",
    answer:
      "It follows GHG Protocol Scope 3 with 15 categories. You can use spend-based or activity-based inputs where supported. Completed calculations appear in calculator history and in Reports under Scope 3 GHG.",
    keywords: ["scope 3", "ghg", "categories", "spend"],
  },
  {
    id: "net-zero-baseline",
    category: "calculators",
    question: "How does Net Zero auto-fill baseline work?",
    answer:
      "When creating a net-zero target, choose a source fiscal year that has saved ISF and/or Scope 3 data. Use Auto-fill baseline from ISF + Scope 3 to pull combined emissions instead of typing the baseline manually.",
    keywords: ["net zero", "baseline", "auto-fill", "fiscal year"],
  },
  {
    id: "fiscal-year-choice",
    category: "calculators",
    question: "Which fiscal year should I select?",
    answer:
      "Use the Indian financial year that matches the data you entered (for example 2024-25). Advisors must pick the client and fiscal year before saving calculator runs so reports stay scoped to the right engagement.",
    keywords: ["fiscal year", "fy", "client"],
  },
  {
    id: "reports-location",
    category: "reports",
    question: "Where are my saved reports?",
    answer:
      "Open Reports from the sidebar. Use category filters for Lighthouse, BRSR, ISF Calculator, Scope 3 GHG, and Net Zero. Click a row to open the full report detail.",
    keywords: ["reports hub", "history", "saved"],
  },
  {
    id: "reports-download",
    category: "reports",
    question: "Can I download or share a report?",
    answer:
      "Lighthouse and several calculator reports support PDF export from the detail view. Use the download action on the open report. If export is unavailable for a report type, you can still review it online.",
    keywords: ["pdf", "export", "download"],
  },
  {
    id: "reports-advisor-scope",
    category: "reports",
    roles: ["ca", "esg_consultant", "assurer_auditor"],
    question: "Why do I only see certain client reports?",
    answer:
      "Advisor accounts are scoped to your clients. Use the client and fiscal year filters at the top of Reports to switch context. You will not see another advisor's clients or unrelated MSME data.",
    keywords: ["client filter", "advisor", "scope", "privacy"],
  },
  {
    id: "reports-msme",
    category: "reports",
    roles: ["msme"],
    question: "Why don't I see client filters on Reports?",
    answer:
      "MSME accounts work on a single organisation. Reports automatically show your own Lighthouse, calculator, and filing outputs without a client picker.",
    keywords: ["msme", "single company"],
  },
  {
    id: "add-client",
    category: "clients",
    roles: ["ca", "esg_consultant", "assurer_auditor"],
    question: "How do I add or manage clients?",
    answer:
      "Open Clients from the sidebar to view engagements, add organisations, and see status at a glance. Calculator and report workflows use the active client you select in each tool's toolbar.",
    keywords: ["onboard", "engagement", "organisation"],
  },
  {
    id: "client-calculator-link",
    category: "clients",
    roles: ["ca", "esg_consultant", "assurer_auditor"],
    question: "How are calculator runs linked to a client?",
    answer:
      "Before saving in ISF, Scope 3, or Net Zero, choose the client (and fiscal year where required) in the calculator toolbar. Saved runs and generated reports are stored against that client for filtering in Reports.",
    keywords: ["client id", "toolbar", "save"],
  },
  {
    id: "ai-advisor-limit",
    category: "ai-advisor",
    question: "How many AI Advisor questions can I ask?",
    answer:
      "Each account has a daily quota (shown at the top of AI Advisor). The count resets every day. When quota is used up, you can still browse your earlier answers in the same session until the next reset.",
    keywords: ["quota", "limit", "daily", "gemini"],
  },
  {
    id: "ai-advisor-topics",
    category: "ai-advisor",
    question: "What should I ask the AI Advisor?",
    answer:
      "Use it for practical ESG guidance: BRSR readiness, improving Lighthouse pillar scores, document checklists, and plain-language explanations of E, S, and G. It complements, not replaces, professional assurance or statutory advice.",
    keywords: ["chat", "questions", "brsr", "guidance"],
  },
  {
    id: "update-contact",
    category: "account",
    question: "How do I update my phone or email?",
    answer:
      "Go to Settings → Profile. Phone updates save directly. Email changes require OTP verification sent to your new address. Password changes also use OTP for security.",
    keywords: ["settings", "otp", "phone", "email", "password"],
  },
  {
    id: "profile-vs-settings",
    category: "account",
    question: "What is the difference between Profile and Settings?",
    answer:
      "Profile shows registration and role-specific credentials (read-only). Settings is where you change contact details and password. Complete missing profile fields at signup; ongoing contact changes belong in Settings.",
    keywords: ["profile", "credentials", "read only"],
  },
  {
    id: "brsr-filing",
    category: "compliance",
    roles: ["ca", "cs", "esg_consultant", "assurer_auditor"],
    question: "What is BRSR Filing in the workspace?",
    answer:
      "BRSR Filing helps structure Business Responsibility and Sustainability Report workflows. Use it alongside Lighthouse and calculator outputs to prepare disclosures. Availability depends on your role and client engagement.",
    keywords: ["brsr", "sebi", "filing"],
  },
  {
    id: "assurance-workflow",
    category: "compliance",
    roles: ["ca", "cs", "esg_consultant", "assurer_auditor"],
    question: "What is the Assurance section for?",
    answer:
      "Assurance supports third-party review and sign-off workflows for ESG disclosures. Assurers and auditors use it in line with their accreditation; other professional roles may use it for preparer handoff.",
    keywords: ["assurance", "audit", "sign-off"],
  },
  {
    id: "data-security",
    category: "account",
    question: "Is my ESG data shared with other users?",
    answer:
      "MSME data is private to your account. Advisors only access clients they are linked to. Reports and calculator caches are scoped per user session and cleared on logout to reduce cross-account leakage on shared devices.",
    keywords: ["security", "privacy", "data", "logout"],
  },
];

export function faqsForRole(role: RoleKey): FaqItem[] {
  return FAQ_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

export function filterFaqs(
  items: FaqItem[],
  query: string,
  category: FaqCategoryId | "all",
): FaqItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!q) return true;
    const haystack = [
      item.question,
      item.answer,
      ...(item.keywords ?? []),
      FAQ_CATEGORIES.find((c) => c.id === item.category)?.label ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
