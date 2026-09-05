"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardLoadingScreen from "@/modules/dashboard/components/DashboardLoadingScreen";
import DashboardShell from "@/modules/dashboard/shell/DashboardShell";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { ADMIN_HOME, USER_HOME } from "@/modules/platform/auth/redirect";
import { buildWorkspaceHref } from "@/modules/dashboard/nav/workspaceRoutes";

export default function WorkspacePageClient() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialView] = useState(() => searchParams.get("view") ?? "dashboard");
  const [refreshDone, setRefreshDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const refreshStartedRef = useRef(false);
  const search = searchParams.toString();

  useEffect(() => {
    if (loading || user) return;
    if (refreshStartedRef.current) return;
    refreshStartedRef.current = true;

    let cancelled = false;
    let redirectTimer: number | undefined;

    void refreshUser(true).then((fetched) => {
      if (cancelled) return;
      setRefreshDone(true);
      if (fetched) return;
      setRedirecting(true);
      redirectTimer = window.setTimeout(() => {
        const returnPath = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
      }, 800);
    });

    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [loading, user, refreshUser]);

  useEffect(() => {
    if (!user) return;
    const role = normalizeRole(user.role);
    const onAdmin = pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
    if (role === "admin" && !onAdmin) {
      router.replace(buildWorkspaceHref("admin", initialView, new URLSearchParams(search)));
      return;
    }
    if (role !== "admin" && onAdmin) {
      router.replace(USER_HOME);
    }
  }, [user, pathname, search, initialView, router]);

  const sessionChecked = Boolean(user) || refreshDone;

  if (!user) {
    return (
      <DashboardLoadingScreen
        message={
          loading || !sessionChecked
            ? "Loading workspace…"
            : redirecting
              ? "Redirecting to sign in…"
              : "Restoring session…"
        }
      />
    );
  }

  return <DashboardShell initialView={initialView} />;
}
