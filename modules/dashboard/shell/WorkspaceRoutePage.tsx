import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardLoadingScreen from "@/modules/dashboard/components/DashboardLoadingScreen";
import WorkspacePageClient from "@/modules/dashboard/shell/WorkspacePageClient";
import { getServerAuthUser } from "@/modules/platform/auth/serverAuth";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { USER_HOME } from "@/modules/platform/auth/redirect";
import {
  buildWorkspaceHref,
  type SearchParamsRecord,
} from "@/modules/dashboard/nav/workspaceRoutes";

function DashboardFallback() {
  return <DashboardLoadingScreen />;
}

export default async function WorkspaceRoutePage({
  area,
  searchParams,
}: {
  area: "admin" | "user";
  searchParams: Promise<SearchParamsRecord>;
}) {
  const user = await getServerAuthUser();
  const params = await searchParams;
  if (user) {
    const role = normalizeRole(user.role);
    if (area === "admin" && role !== "admin") {
      redirect(USER_HOME);
    }
    if (area === "user" && role === "admin") {
      const view = typeof params.view === "string" ? params.view : "dashboard";
      redirect(buildWorkspaceHref("admin", view, params));
    }
  }

  return (
    <Suspense fallback={<DashboardFallback />}>
      <WorkspacePageClient />
    </Suspense>
  );
}
