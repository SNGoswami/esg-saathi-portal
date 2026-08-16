"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { clearServerSession } from "@/modules/platform/api/sessionFetch";
import { getPostLoginPath } from "@/modules/platform/rbac/roles";
import { useToast } from "@/modules/platform/feedback";
import BrandPanel from "./BrandPanel";
import MobileHeader from "./MobileHeader";
import OtpOnlyLogin from "../login/OtpOnlyLogin";

function loginPathWithoutSessionFlags(
  searchParams: URLSearchParams,
): string {
  const redirect = searchParams.get("redirect");
  return redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";
}

export default function AuthShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, loading, refreshUser, resetClientSession } = useAuth();
  const reauthParam = searchParams.get("reauth") === "1";
  const signedOutParam = searchParams.get("signed_out") === "1";
  const [sessionCleared, setSessionCleared] = useState(!reauthParam && !signedOutParam);
  const [sessionNotice] = useState<"reauth" | "signed_out" | null>(() => {
    if (reauthParam) return "reauth";
    if (signedOutParam) return "signed_out";
    return null;
  });
  const sessionNoticeToastRef = useRef(false);

  useEffect(() => {
    if (!reauthParam && !signedOutParam) return;

    let cancelled = false;

    (async () => {
      resetClientSession();
      if (signedOutParam) {
        await clearServerSession();
      }
      if (cancelled) return;

      if (!sessionNoticeToastRef.current) {
        sessionNoticeToastRef.current = true;
        if (sessionNotice === "reauth") {
          try {
            if (!sessionStorage.getItem("auth_reauth_notice_shown")) {
              sessionStorage.setItem("auth_reauth_notice_shown", "1");
              toast.info("Your session expired. Log in to continue.");
            }
          } catch {
            toast.info("Your session expired. Log in to continue.");
          }
        } else if (sessionNotice === "signed_out") {
          toast.success("You have been logged out.");
        }
      }

      router.replace(loginPathWithoutSessionFlags(searchParams), { scroll: false });
      setSessionCleared(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [reauthParam, signedOutParam, resetClientSession, router, searchParams, toast, sessionNotice]);

  useEffect(() => {
    if (!sessionCleared) return;
    if (reauthParam || signedOutParam) return;
    if (loading) return;

    if (user) {
      router.replace(getPostLoginPath(user.role, searchParams.get("redirect")));
      return;
    }

    let cancelled = false;
    refreshUser(true).then((fetched) => {
      if (cancelled || !fetched) return;
      router.replace(getPostLoginPath(fetched.role, searchParams.get("redirect")));
    });

    return () => {
      cancelled = true;
    };
  }, [
    sessionCleared,
    reauthParam,
    signedOutParam,
    user,
    loading,
    refreshUser,
    router,
    searchParams,
  ]);

  const waitingForSessionReset = (reauthParam || signedOutParam) && !sessionCleared;

  if (waitingForSessionReset || (!reauthParam && !signedOutParam && (user || loading))) {
    return (
      <div className="auth-shell">
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell-card">
        <div className="auth-shell-card__grid">
          <BrandPanel />

          <div className="auth-shell-card__form">
            <div className="auth-shell-card__form-inner">
              <MobileHeader />
              <OtpOnlyLogin />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
