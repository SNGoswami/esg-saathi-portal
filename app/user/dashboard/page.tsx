import WorkspaceRoutePage from "@/modules/dashboard/shell/WorkspaceRoutePage";
import type { SearchParamsRecord } from "@/modules/dashboard/nav/workspaceRoutes";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  return <WorkspaceRoutePage area="user" searchParams={searchParams} />;
}
