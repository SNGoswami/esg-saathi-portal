"use client";

import type { RoleKey } from "@/modules/platform/rbac/roles";
import type { ProfessionalAnalytics } from "@/modules/dashboard/professional/professionalAnalytics";
import OverviewHeroBanner from "@/modules/dashboard/overview/OverviewHeroBanner";
import { professionalHeroContent } from "@/modules/dashboard/overview/overviewContent";
import { heroStatusClass } from "@/modules/dashboard/overview/heroStatusClass";

export default function ProfessionalHeroBanner({
  role,
  analytics,
  loading,
  fy,
  customizing,
  onCustomizeToggle,
}: {
  role: RoleKey;
  analytics: ProfessionalAnalytics | null;
  loading: boolean;
  fy: string;
  customizing?: boolean;
  onCustomizeToggle?: () => void;
}) {
  const { title, description } = professionalHeroContent(role);
  const label = analytics?.healthLabel ?? "Loading…";

  const brsrPct = analytics?.avgBrsrCompletion ?? analytics?.healthScore ?? 0;
  const metricLabel =
    analytics?.avgBrsrCompletion != null ? "BRSR completion" : "Portfolio health";
  const metricValue =
    analytics?.avgBrsrCompletion != null
      ? `${analytics.avgBrsrCompletion}%`
      : analytics?.healthScore != null
        ? `${analytics.healthScore}%`
        : "-";

  const stats: { icon: string; label: string }[] = [];
  if (analytics?.avgEsgScore != null) {
    stats.push({ icon: "chart-dots-3", label: `ESG ${analytics.avgEsgScore}` });
  }
  if (analytics) {
    stats.push({
      icon: "file-analytics",
      label: `${analytics.totalReports} ${analytics.totalReports === 1 ? "report" : "reports"}`,
    });
  }

  return (
    <OverviewHeroBanner
      ariaLabel="Portfolio analytics summary"
      eyebrow="Portfolio analytics"
      title={title}
      description={description}
      fy={fy}
      scoreLabel="Health score"
      score={analytics?.healthScore ?? null}
      statusLabel={label}
      statusClass={heroStatusClass(label)}
      loading={loading}
      customizing={customizing}
      onCustomizeToggle={onCustomizeToggle}
      metric={
        analytics
          ? {
              icon: analytics.avgBrsrCompletion != null ? "clipboard-check" : "activity",
              label: metricLabel,
              value: metricValue,
              progressPct: brsrPct,
            }
          : null
      }
      stats={stats}
    />
  );
}
