"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getNzePathway, getNzeProgressHistory } from "@/modules/net-zero/api/nzeApi";
import type { NzeProgressResponse, NzeTargetResponse } from "@/modules/net-zero/domain/types";

function fmt(n?: number | null, d = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

export default function NetZeroReportDetailView({ target }: { target: NzeTargetResponse }) {
  const [pathway, setPathway] = useState<{ year: number; expected: number; actual?: number }[]>([]);
  const [progress, setProgress] = useState<NzeProgressResponse[]>([]);

  useEffect(() => {
    void getNzePathway(target.id)
      .then((p) =>
        setPathway(
          p.records.map((r) => ({
            year: r.calendar_year,
            expected: r.expected_emissions_tco2e,
          })),
        ),
      )
      .catch(() => setPathway([]));

    void getNzeProgressHistory(target.id)
      .then(setProgress)
      .catch(() => setProgress([]));
  }, [target.id]);

  const chartData = useMemo(() => {
    const byYear = new Map(pathway.map((p) => [p.year, { ...p }]));
    for (const pr of progress) {
      const year = parseInt(pr.fiscal_year.replace(/\D/g, "").slice(0, 4), 10);
      const row = byYear.get(year) ?? { year, expected: pr.expected_emissions_tco2e };
      row.actual = pr.net_emissions_tco2e;
      byYear.set(year, row);
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [pathway, progress]);

  const gap = target.gap_analysis;

  return (
    <div className="report-detail-root" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card card--elevated" style={{ padding: "14px 16px" }}>
        <p className="dash-section-title" style={{ fontSize: "1rem" }}>
          {target.name}
        </p>
        {target.client_company_name && (
          <p className="dash-muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
            {target.client_company_name}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <span
            className="dash-badge"
            style={{ background: target.sbti_aligned ? "#006C49" : "#F59E0B", color: "#fff" }}
          >
            SBTi {target.sbti_aligned ? "aligned" : "not aligned"}
          </span>
          <span className="dash-badge">{target.status}</span>
        </div>
      </div>

      <div className="report-metrics-grid">
        <div className="card" style={{ padding: "1rem" }}>
          <p className="dash-muted" style={{ fontSize: "0.7rem" }}>Baseline ({target.baseline_year})</p>
          <p className="dash-section-title">{fmt(target.baseline_emissions_tco2e)} tCO₂e</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <p className="dash-muted" style={{ fontSize: "0.7rem" }}>Target ({target.target_year})</p>
          <p className="dash-section-title">{fmt(target.target_reduction_pct, 1)}% reduction</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <p className="dash-muted" style={{ fontSize: "0.7rem" }}>Pathway</p>
          <p className="dash-section-title">{target.pathway_type.replace(/_/g, " ")}</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <p className="dash-muted" style={{ fontSize: "0.7rem" }}>Scope coverage</p>
          <p className="dash-section-title">{target.scope.join(", ")}</p>
        </div>
      </div>

      {gap && (
        <div className="card card--elevated" style={{ padding: "1rem" }}>
          <p className="dash-label">Gap analysis</p>
          <div className="report-metrics-grid" style={{ marginTop: 12 }}>
            <div className="card" style={{ padding: "0.75rem" }}>
              <p className="dash-muted" style={{ fontSize: "0.65rem" }}>Current net emissions</p>
              <p>{fmt(gap.current_year_emissions)} tCO₂e</p>
            </div>
            <div className="card" style={{ padding: "0.75rem" }}>
              <p className="dash-muted" style={{ fontSize: "0.65rem" }}>Expected this year</p>
              <p>{fmt(gap.expected_year_emissions)} tCO₂e</p>
            </div>
            <div className="card" style={{ padding: "0.75rem" }}>
              <p className="dash-muted" style={{ fontSize: "0.65rem" }}>Gap</p>
              <p>{fmt(gap.gap_tco2e)} tCO₂e</p>
            </div>
            <div className="card" style={{ padding: "0.75rem" }}>
              <p className="dash-muted" style={{ fontSize: "0.65rem" }}>Years to target</p>
              <p>{gap.years_to_target ?? "-"}</p>
            </div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card card--elevated" style={{ padding: "1rem" }}>
          <p className="dash-label">Pathway vs actual progress</p>
          <div className="report-chart-box" style={{ height: 280, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="expected" stroke="#2563EB" name="Expected" dot={false} />
                <Line type="monotone" dataKey="actual" stroke="#006C49" name="Actual (net)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {progress.length > 0 && (
        <div className="card card--elevated" style={{ padding: "1rem" }}>
          <p className="dash-label">Progress history</p>
          <div className="dash-table-wrap" style={{ marginTop: 12 }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>FY</th>
                  <th>Actual</th>
                  <th>Offsets</th>
                  <th>Net</th>
                  <th>Expected</th>
                  <th>On track</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((p) => (
                  <tr key={p.id}>
                    <td data-label="FY">{p.fiscal_year}</td>
                    <td data-label="Actual">{fmt(p.actual_emissions_tco2e)}</td>
                    <td data-label="Offsets">{fmt(p.offset_credits_tco2e)}</td>
                    <td data-label="Net">{fmt(p.net_emissions_tco2e)}</td>
                    <td data-label="Expected">{fmt(p.expected_emissions_tco2e)}</td>
                    <td data-label="On track">{p.on_track ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {target.sbti_validation && (
        <div className="card" style={{ padding: "1rem" }}>
          <p className="dash-label">SBTi validation criteria</p>
          <ul style={{ fontSize: "0.75rem", marginTop: 8, paddingLeft: 18 }}>
            <li>Baseline year ≥ 2018: {target.sbti_validation.baseline_year_check ? "✓" : "✗"}</li>
            <li>Near-term reduction ≥ 42%: {target.sbti_validation.near_term_reduction_check ? "✓" : "✗"}</li>
            <li>Near-term timeline: {target.sbti_validation.near_term_timeline_check ? "✓" : "✗"}</li>
            <li>Long-term 90% @ 2050: {target.sbti_validation.long_term_reduction_check ? "✓" : "✗"}</li>
            <li>Target year ≤ 2050: {target.sbti_validation.target_ceiling_check ? "✓" : "✗"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
