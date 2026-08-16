"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLoadingScreen from "@/modules/dashboard/components/DashboardLoadingScreen";
import DashboardShell from "@/modules/dashboard/shell/DashboardShell";
import { useAuth } from "@/modules/platform/auth/AuthContext";

export default function DashboardPageClient() {
  const { user, loading, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [initialView] = useState(() => searchParams.get("view") ?? "dashboard");
  const [refreshDone, setRefreshDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const refreshStartedRef = useRef(false);

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
