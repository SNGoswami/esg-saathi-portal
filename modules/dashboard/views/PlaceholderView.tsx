"use client";

import { viewDescription } from "@/modules/dashboard/nav/dashboardNav";

interface PlaceholderViewProps {
  view: string;
  icon?: string;
}

export default function PlaceholderView({ view, icon = "layout-grid" }: PlaceholderViewProps) {
  const title = view
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="dash-empty card card--elevated">
      <div className="dash-empty__icon">
        <i className={`ti ti-${icon}`} style={{ fontSize: 28 }} aria-hidden="true" />
      </div>
      <p className="dash-section-title" style={{ fontSize: "0.9375rem" }}>
        {title}
      </p>
      <p className="dash-muted" style={{ maxWidth: 320, fontSize: "0.75rem" }}>
        {viewDescription(view)}
      </p>
      <span className="dash-badge">Coming soon</span>
    </div>
  );
}
