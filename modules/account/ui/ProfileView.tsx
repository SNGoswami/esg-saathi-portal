"use client";

import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { AUTH_ROLE_TO_PROFILE } from "@/modules/dashboard/nav/dashboardNav";
import ProfileDetails from "@/modules/account/profile/Details";

export default function ProfileView({
  onNavigateView,
}: {
  onNavigateView?: (view: string) => void;
}) {
  const { user } = useAuth();
  if (!user) return null;

  const role = (AUTH_ROLE_TO_PROFILE[normalizeRole(user.role)] ?? "MSME") as Parameters<
    typeof ProfileDetails
  >[0]["role"];

  return (
    <ProfileDetails
      role={role}
      embedded
      onOpenSettings={onNavigateView ? () => onNavigateView("settings") : undefined}
    />
  );
}
