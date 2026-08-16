"use client";

import type { BrsrAssessment } from "@/modules/brsr/api/brsrApi";
import { brsrStatusLabel } from "@/modules/brsr/api/brsrApi";

export default function BrsrWorkspaceView({
  assessment,
  onOpenReport,
}: {
  assessment: BrsrAssessment;
  onOpenReport?: () => void;
}) {
  const pct = Math.round(assessment.completionPct);

  return (
    <div className="workspace-stack">
      <div className="card card--elevated" style={{ padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
              BRSR · FY {assessment.fiscalYear}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
              {assessment.clientCompanyName}
            </h2>
            <span className="dash-badge">{brsrStatusLabel(assessment.status)}</span>
          </div>
          {onOpenReport && (
            <button type="button" className="btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }} onClick={onOpenReport}>
              View in Reports
            </button>
          )}
        </div>
      </div>

      <div className="card card--elevated" style={{ padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12 }}>
          Progress
        </p>
        <div style={{ height: 8, borderRadius: 999, background: "var(--color-border)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, pct)}%`,
              height: "100%",
              background: "var(--color-primary)",
              borderRadius: 999,
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
          {pct}% complete
        </p>
      </div>

      {(assessment.eScore != null || assessment.sScore != null || assessment.gScore != null) && (
        <div
          className="card card--elevated"
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Environmental", value: assessment.eScore },
            { label: "Social", value: assessment.sScore },
            { label: "Governance", value: assessment.gScore },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {item.label}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                {item.value != null ? `${Math.round(item.value)}` : "-"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 16, background: "var(--brand-tint-06)", borderColor: "rgba(0,108,73,0.15)" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          BRSR questionnaire workspace is being built. Assessment data is saved on the server,
          you can return here to continue once the full filing flow is available.
        </p>
      </div>
    </div>
  );
}
