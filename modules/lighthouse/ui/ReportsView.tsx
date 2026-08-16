"use client";

import ReportsHubView from "@/modules/reports/ui/ReportsHubView";
import type { AssessmentRouteParams } from "@/modules/dashboard/nav/workspaceRoutes";

export default function ReportsView({
  onNavigateToAssessment,
}: {
  onNavigateToAssessment?: (params?: AssessmentRouteParams) => void;
}) {
  return <ReportsHubView onNavigateToAssessment={onNavigateToAssessment} />;
}
