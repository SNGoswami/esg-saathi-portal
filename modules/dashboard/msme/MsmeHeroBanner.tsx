"use client";

import type { MsmeAnalytics } from "@/modules/dashboard/msme/msmeAnalytics";
import OverviewHeroBanner from "@/modules/dashboard/overview/OverviewHeroBanner";
import { msmeHeroContent } from "@/modules/dashboard/overview/overviewContent";
import { heroStatusClass } from "@/modules/dashboard/overview/heroStatusClass";

export default function MsmeHeroBanner({
  analytics,
  loading,
  fy,
  customizing,
  onCustomizeToggle,
}: {
  analytics: MsmeAnalytics | null;
  loading: boolean;
  fy: string;
  customizing?: boolean;
  onCustomizeToggle?: () => void;
}) {
  const { title, description } = msmeHeroContent();
  const label = analytics?.healthLabel ?? "Loading…";
  const kpiPct =
    analytics && analytics.kpisTotal > 0
      ? Math.round((analytics.kpisCompleted / analytics.kpisTotal) * 100)
      : 0;

  return (
    <OverviewHeroBanner
      ariaLabel="ESG readiness summary"
      eyebrow="ESG readiness"
      title={title}
      description={description}
      fy={fy}
      scoreLabel="ESG score"
      score={analytics?.healthScore ?? null}
      statusLabel={label}
      statusClass={heroStatusClass(label)}
      loading={loading}
      customizing={customizing}
      onCustomizeToggle={onCustomizeToggle}
      metric={
        analytics
          ? {
              icon: "list-check",
              label: "KPI progress",
              value: `${analytics.kpisCompleted}/${analytics.kpisTotal}`,
              progressPct: kpiPct,
            }
          : null
      }
      stats={
        analytics
          ? [
              {
                icon: "file-analytics",
                label: `${analytics.savedReports} ${analytics.savedReports === 1 ? "report" : "reports"}`,
              },
            ]
          : []
      }
    />
  );
}
