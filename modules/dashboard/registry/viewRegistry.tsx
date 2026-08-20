"use client";

import dynamic from "next/dynamic";
import MsmeDashboardView from "@/modules/dashboard/msme/MsmeDashboardView";
import ProfessionalDashboardView from "@/modules/dashboard/professional/ProfessionalDashboardView";
import type { RoleKey } from "@/modules/platform/rbac/roles";

const AdminDashboardView = dynamic(() => import("@/modules/admin/ui/AdminDashboardView"));
const AdminAnalyticsView = dynamic(() => import("@/modules/admin/ui/AdminAnalyticsView"));
const AdminUsersView = dynamic(() => import("@/modules/admin/ui/AdminUsersView"));
const AdminPendingUsersView = dynamic(() => import("@/modules/admin/ui/AdminPendingUsersView"));
const ProfileView = dynamic(() => import("@/modules/account/ui/ProfileView"));
const ClientsView = dynamic(() => import("@/modules/clients/ui/ClientsView"));
const AssessmentView = dynamic(() => import("@/modules/lighthouse/ui/AssessmentView"));
const SettingsView = dynamic(() => import("@/modules/account/ui/SettingsView"));
const AiAdvisorView = dynamic(() => import("@/modules/ai-advisor/ui/AiAdvisorView"));
const ReportsView = dynamic(() => import("@/modules/lighthouse/ui/ReportsView"));
const PlaceholderView = dynamic(() => import("@/modules/dashboard/views/PlaceholderView"));
const IsfCalculatorView = dynamic(() => import("@/modules/isf-calculator/ui/IsfCalculatorView"));
const Scope3CalculatorView = dynamic(() => import("@/modules/scope3-ghg/ui/Scope3CalculatorView"));
const NetZeroView = dynamic(() => import("@/modules/net-zero/ui/NetZeroView"));
const WorkforceView = dynamic(() => import("@/modules/workforce/ui/WorkforceView"));
const StakeholderHrView = dynamic(() => import("@/modules/stakeholder-hr/ui/StakeholderHrView"));
const GovernanceView = dynamic(() => import("@/modules/governance/ui/GovernanceView"));
const FaqView = dynamic(() => import("@/modules/help/ui/FaqView"));

export function resolveDashboardView(
  role: string,
  view: string,
  icon?: string,
  onNavigateView?: (view: string) => void,
  onNavigateToReport?: (category: string, reportId: string, extra?: { clientId?: string | null }) => void,
  onNavigateToAssessment?: (params?: import("@/modules/dashboard/nav/workspaceRoutes").AssessmentRouteParams) => void,
) {
  if (view === "profile") return <ProfileView onNavigateView={onNavigateView} />;
  if (view === "clients") return <ClientsView />;
  if (view === "assessment")
    return (
      <AssessmentView
        onNavigateView={onNavigateView}
        onNavigateToReport={onNavigateToReport}
        onNavigateToAssessment={onNavigateToAssessment}
      />
    );
  if (view === "reports")
    return <ReportsView onNavigateToAssessment={onNavigateToAssessment} />;
  if (view === "settings") return <SettingsView />;
  if (view === "ai-advisor") return <AiAdvisorView />;
  if (view === "dashboard" && role === "admin") return <AdminDashboardView key="admin-dashboard" />;
  if (view === "analytics" && role === "admin") return <AdminAnalyticsView key="admin-analytics" />;
  if (view === "pending-users" && role === "admin") return <AdminPendingUsersView key="pending-users" />;
  if (
    role === "admin" &&
    (view === "msmes" || view === "cas" || view === "css" || view === "esgs" || view === "auditors")
  ) {
    return <AdminUsersView key={view} view={view} />;
  }
  if (view === "dashboard" && role === "msme") {
    return <MsmeDashboardView onNavigateView={onNavigateView} />;
  }
  if (view === "dashboard") {
    return (
      <ProfessionalDashboardView
        role={role as RoleKey}
        onNavigateView={onNavigateView}
      />
    );
  }
  if (view === "environmental")
    return (
      <IsfCalculatorView
        key={`env-${role}`}
        variant="environmental"
        onNavigateToReport={onNavigateToReport}
      />
    );
  if (view === "isf-calculator")
    return <IsfCalculatorView key={`isf-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "scope-3-ghg")
    return <Scope3CalculatorView key={`scope3-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "net-zero")
    return <NetZeroView key={`nze-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "workforce")
    return <WorkforceView key={`workforce-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "stakeholder-hr")
    return <StakeholderHrView key={`stakeholder-hr-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "governance" || view === "selective-governance")
    return <GovernanceView key={`governance-${role}`} onNavigateToReport={onNavigateToReport} />;
  if (view === "faq") return <FaqView onNavigateView={onNavigateView} />;
  return <PlaceholderView view={view} icon={icon} />;
}
