import WorkspaceRoutePage from "@/modules/dashboard/shell/WorkspaceRoutePage";
import type { SearchParamsRecord } from "@/modules/dashboard/nav/workspaceRoutes";

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  return <WorkspaceRoutePage area="admin" searchParams={searchParams} />;
}
