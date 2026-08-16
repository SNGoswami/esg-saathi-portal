"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IsfCalculationResponse, IsfSavedInputs } from "@/modules/isf-calculator/domain/types";
import {
  BRSR_MAPPINGS,
  SCOPE3_FACTORS,
  SCOPE3_INPUT_KEYS,
  SCOPE3_LABELS,
  STRESS_COLORS,
  STRESS_DESCRIPTIONS,
  energySourceBreakdown,
  fmtDate,
  fmtInrCr,
  fmtNum,
} from "@/modules/isf-calculator/domain/reportHelpers";

const PIE_COLORS = ["#2563EB", "#006C49", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

function SectionCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`lighthouse-chart-card${wide ? " lighthouse-chart-card--wide" : ""}`}
      data-pdf-section="chart"
    >
      <div className="lighthouse-chart-card__head">
        <p className="lighthouse-chart-card__title">{title}</p>
        {subtitle && <p className="lighthouse-chart-card__sub">{subtitle}</p>}
      </div>
      <div className="lighthouse-chart-card__body">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ padding: "1rem" }}>
      <p className="dash-muted" style={{ fontSize: "0.7rem" }}>
        {label}
      </p>
      <p className="dash-section-title" style={{ fontSize: "1.05rem", marginTop: 4 }}>
        {value}
      </p>
      {hint && (
        <p className="dash-muted" style={{ fontSize: "0.65rem", marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="dash-table-wrap" style={{ marginTop: 12 }}>
      <table className="dash-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} data-label={headers[j]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-input-row">
      <span className="report-input-row__label">{label}</span>
      <span className="report-input-row__value">{value}</span>
    </div>
  );
}

function brsrValue(
  mapping: (typeof BRSR_MAPPINGS)[number],
  report: IsfCalculationResponse,
  inputs: IsfSavedInputs,
): string {
  if ("field" in mapping && mapping.field) {
    const v = inputs[mapping.field];
    if (mapping.field.includes("tco2e")) return `${fmtNum(v)} tCO₂e`;
    return fmtNum(v);
  }
  switch (mapping.derived) {
    case "scope3_total":
      return `${fmtNum(report.scope3?.total_tco2e)} tCO₂e`;
    case "total_ghg":
      return `${fmtNum(report.emission_intensity?.total_ghg_tco2e)} tCO₂e`;
    case "intensity_revenue":
      return `${fmtNum(report.emission_intensity?.intensity_revenue)} tCO₂e / INR Cr PPP`;
    case "energy_gj":
      return `${fmtNum(report.energy?.total_gj)} GJ`;
    case "renewable_pct":
      return `${fmtNum(report.energy?.renewable_pct, 2)}%`;
    case "water_stress":
      return report.water?.stress_level?.replace(/_/g, " ") ?? "-";
    case "recovery_rate":
      return `${fmtNum(report.waste_recovery?.recovery_rate_pct, 2)}%`;
    default:
      return "-";
  }
}

export default function IsfReportDetailView({ report }: { report: IsfCalculationResponse }) {
  const inputs = useMemo(() => report.inputs ?? {}, [report.inputs]);
  const scope1 = inputs.scope1_tco2e ?? 0;
  const scope2 = inputs.scope2_tco2e ?? 0;
  const scope3Total = report.scope3?.total_tco2e ?? 0;
  const totalFootprint = scope1 + scope2 + scope3Total;

  const scope12Chart = useMemo(() => {
    const rows = [
      { name: "Scope 1", tco2e: scope1 },
      { name: "Scope 2", tco2e: scope2 },
    ].filter((r) => r.tco2e > 0);
    return rows;
  }, [scope1, scope2]);

  const footprintPie = useMemo(() => {
    return [
      { name: "Scope 1", value: scope1 },
      { name: "Scope 2", value: scope2 },
      { name: "Scope 3", value: scope3Total },
    ].filter((r) => r.value > 0);
  }, [scope1, scope2, scope3Total]);

  const scope3Rows = useMemo(() => {
    const breakdown = report.scope3?.breakdown ?? {};
    return Object.keys(SCOPE3_LABELS)
      .map((key) => {
        const spendKey = SCOPE3_INPUT_KEYS[key];
        const spend = Number(inputs[spendKey] ?? 0);
        const tco2e = breakdown[key] ?? 0;
        const factor = SCOPE3_FACTORS[key];
        const pct = scope3Total > 0 ? (tco2e / scope3Total) * 100 : 0;
        return {
          key,
          category: SCOPE3_LABELS[key],
          spend,
          factor,
          tco2e,
          pct,
        };
      })
      .filter((r) => r.spend > 0 || r.tco2e > 0);
  }, [report, inputs, scope3Total]);

  const scope3Chart = useMemo(
    () => scope3Rows.map((r) => ({ name: r.category.split(" ").slice(0, 2).join(" "), tco2e: r.tco2e })),
    [scope3Rows],
  );

  const energySources = useMemo(() => energySourceBreakdown(inputs), [inputs]);

  const energyChart = useMemo(() => {
    if (!report.energy) return [];
    return [
      { name: "Renewable", gj: report.energy.renewable_gj ?? 0 },
      { name: "Non-Renewable", gj: report.energy.non_renewable_gj ?? 0 },
    ];
  }, [report.energy]);

  const wasteBreakdown = useMemo(() => {
    const rows = [
      { method: "Recycled", mt: inputs.recycled_mt ?? 0 },
      { method: "Reused", mt: inputs.reused_mt ?? 0 },
      { method: "Composted", mt: inputs.composted_mt ?? 0 },
      { method: "Co-processed", mt: inputs.coprocessed_mt ?? 0 },
      { method: "Other recovery", mt: inputs.other_recovery_mt ?? 0 },
    ].filter((r) => r.mt > 0);
    return rows;
  }, [inputs]);

  const wasteChart = useMemo(() => {
    if (!report.waste_recovery) return [];
    return [
      { name: "Recovered", value: report.waste_recovery.total_recovered_mt ?? 0 },
      { name: "Disposed", value: report.waste_recovery.total_disposed_mt ?? 0 },
    ];
  }, [report.waste_recovery]);

  const stress = report.water?.stress_level ?? "";
  const stressColor = STRESS_COLORS[stress] ?? "#64748B";

  const pppRevenue =
    (inputs.revenue_inr_cr ?? 0) * (inputs.ppp_factor != null && inputs.ppp_factor > 0 ? inputs.ppp_factor : 1);

  return (
    <div className="report-detail-root" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div className="card card--elevated" style={{ padding: "14px 16px" }}>
        <p className="dash-section-title" style={{ fontSize: "1rem" }}>
          ISF Calculator Report, FY {report.fiscal_year ?? "-"}
        </p>
        <p className="dash-muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
          Comprehensive emission intensity, Scope 3 spend, energy, water stress, and waste recovery analysis.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px 20px",
            marginTop: 12,
            fontSize: "0.7rem",
          }}
          className="dash-muted"
        >
          <span>Generated: {fmtDate(report.created_at)}</span>
          {report.client_id && <span>Client ID: {report.client_id}</span>}
          {report.brsr_populated && (
            <span className="dash-badge" style={{ background: "#006C49", color: "#fff" }}>
              BRSR auto-populated
            </span>
          )}
        </div>
      </div>

      {/* Executive summary */}
      <SectionCard title="Executive summary" subtitle="Key performance indicators across all ISF modules">
        <div className="report-metrics-grid">
          <MetricCard
            label="Total carbon footprint"
            value={`${fmtNum(totalFootprint)} tCO₂e`}
            hint="Scope 1 + Scope 2 + Scope 3 (spend-based)"
          />
          <MetricCard
            label="Scope 1+2 intensity"
            value={`${fmtNum(report.emission_intensity?.intensity_revenue)} tCO₂e / INR Cr PPP`}
            hint="(Scope 1 + Scope 2) ÷ PPP-adjusted revenue"
          />
          <MetricCard
            label="Scope 3 (spend)"
            value={`${fmtNum(scope3Total)} tCO₂e`}
            hint={`${totalFootprint > 0 ? fmtNum((scope3Total / totalFootprint) * 100, 1) : "-"}% of total footprint`}
          />
          <MetricCard
            label="Energy consumption"
            value={`${fmtNum(report.energy?.total_gj)} GJ`}
            hint={`${fmtNum(report.energy?.renewable_pct, 1)}% renewable · intensity ${fmtNum(report.energy?.intensity_revenue)} GJ/Cr`}
          />
          <MetricCard
            label="Waste recovery"
            value={`${fmtNum(report.waste_recovery?.recovery_rate_pct, 1)}%`}
            hint={`${fmtNum(report.waste_recovery?.total_recovered_mt, 2)} MT recovered of ${fmtNum(inputs.total_generated_mt, 2)} MT generated`}
          />
          <MetricCard
            label="Water stress"
            value={stress.replace(/_/g, " ") || "-"}
            hint={report.water ? `PIN ${report.water.pin_code} · ${report.water.state}` : undefined}
          />
        </div>
      </SectionCard>

      {/* Carbon footprint composition */}
      {footprintPie.length > 0 && (
        <SectionCard
          title="Carbon footprint composition"
          subtitle="Share of Scope 1, 2, and 3 in total emissions"
          wide
        >
          <div className="report-chart-split">
            <div className="report-chart-split__chart report-chart-box" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={footprintPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {footprintPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="report-chart-split__side">
              {footprintPie.map((row) => (
                <InputRow
                  key={row.name}
                  label={`${row.name} (${totalFootprint > 0 ? fmtNum((row.value / totalFootprint) * 100, 1) : 0}%)`}
                  value={`${fmtNum(row.value)} tCO₂e`}
                />
              ))}
              <InputRow label="Total footprint" value={`${fmtNum(totalFootprint)} tCO₂e`} />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Emission intensity */}
      {report.emission_intensity && (
        <SectionCard
          title="Emission intensity (Scope 1 & 2)"
          subtitle="Direct and energy indirect emissions normalized by revenue and output"
        >
          <div className="report-metrics-grid" style={{ marginBottom: 12 }}>
            <MetricCard label="Scope 1" value={`${fmtNum(scope1)} tCO₂e`} />
            <MetricCard label="Scope 2" value={`${fmtNum(scope2)} tCO₂e`} />
            <MetricCard label="Total GHG (1+2)" value={`${fmtNum(report.emission_intensity.total_ghg_tco2e)} tCO₂e`} />
            <MetricCard label="PPP-adjusted revenue" value={fmtInrCr(report.emission_intensity.ppp_revenue)} />
            <MetricCard
              label="Intensity per revenue"
              value={`${fmtNum(report.emission_intensity.intensity_revenue)} tCO₂e / INR Cr PPP`}
              hint="Total GHG ÷ PPP revenue"
            />
            <MetricCard
              label="Intensity per output"
              value={`${fmtNum(report.emission_intensity.intensity_output)} tCO₂e / ${inputs.output_unit || "unit"}`}
              hint={
                inputs.output_quantity
                  ? `${fmtNum(inputs.output_quantity, 2)} ${inputs.output_unit ?? "units"} produced`
                  : "No output quantity provided"
              }
            />
          </div>

          {scope12Chart.length > 0 && (
            <div style={{ height: 180, marginBottom: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scope12Chart}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="tco2e" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="dash-label" style={{ fontSize: "0.7rem", marginBottom: 6 }}>
            Input data
          </p>
          <InputRow label="Revenue (INR Cr)" value={fmtInrCr(inputs.revenue_inr_cr)} />
          <InputRow label="PPP factor" value={fmtNum(inputs.ppp_factor, 4)} />
          <InputRow label="PPP revenue (computed)" value={fmtInrCr(pppRevenue)} />
          <InputRow label="Output quantity" value={`${fmtNum(inputs.output_quantity, 2)} ${inputs.output_unit ?? ""}`} />

          <p className="dash-muted" style={{ fontSize: "0.65rem", marginTop: 10 }}>
            Formulas: Total GHG = Scope 1 + Scope 2 · PPP revenue = Revenue × PPP factor · Intensity (revenue) =
            Total GHG ÷ PPP revenue · Intensity (output) = Total GHG ÷ output quantity
          </p>
        </SectionCard>
      )}

      {/* Scope 3 */}
      {report.scope3 && (
        <SectionCard
          title="Scope 3, spend-based emissions"
          subtitle={`Total ${fmtNum(report.scope3.total_tco2e)} tCO₂e · Emissions = Spend (INR) × factor ÷ 1000`}
          wide
        >
          {scope3Chart.length > 0 && (
            <div
              className="report-chart-box"
              style={{ height: Math.max(200, scope3Chart.length * 36), marginBottom: 12 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scope3Chart} layout="vertical" margin={{ left: 4, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={72} />
                  <Tooltip />
                  <Bar dataKey="tco2e" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <DataTable
            headers={["Category", "Spend (INR)", "Factor (kg/INR)", "Emissions (tCO₂e)", "% of Scope 3"]}
            rows={scope3Rows.map((r) => [
              r.category,
              r.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
              r.factor,
              fmtNum(r.tco2e),
              `${fmtNum(r.pct, 1)}%`,
            ])}
          />

          {scope3Rows.length === 0 && (
            <p className="dash-muted" style={{ fontSize: "0.75rem", marginTop: 8 }}>
              No Scope 3 spend categories were provided in this calculation.
            </p>
          )}
        </SectionCard>
      )}

      {/* Energy */}
      {report.energy && (
        <SectionCard
          title="Energy consumption"
          subtitle={`${fmtNum(report.energy.total_gj)} GJ total · ${fmtNum(report.energy.renewable_pct, 1)}% renewable`}
        >
          <div className="report-metrics-grid" style={{ marginBottom: 12 }}>
            <MetricCard label="Renewable" value={`${fmtNum(report.energy.renewable_gj)} GJ`} />
            <MetricCard label="Non-renewable" value={`${fmtNum(report.energy.non_renewable_gj)} GJ`} />
            <MetricCard
              label="Energy intensity"
              value={`${fmtNum(report.energy.intensity_revenue)} GJ / INR Cr`}
              hint="Total GJ ÷ revenue (INR Cr)"
            />
            <MetricCard label="Renewable share" value={`${fmtNum(report.energy.renewable_pct, 1)}%`} />
          </div>

          <div style={{ height: 200, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="gj" fill="#006C49" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {energySources.length > 0 && (
            <>
              <p className="dash-label" style={{ fontSize: "0.7rem", marginBottom: 6 }}>
                Source breakdown (from inputs)
              </p>
              <DataTable
                headers={["Source", "Input", "Estimated GJ"]}
                rows={energySources.map((r) => [r.source, r.raw, fmtNum(r.gj, 3)])}
              />
            </>
          )}

          <p className="dash-label" style={{ fontSize: "0.7rem", marginTop: 12, marginBottom: 6 }}>
            Raw inputs
          </p>
          <InputRow label="Grid electricity" value={`${fmtNum(inputs.electricity_kwh, 0)} kWh`} />
          <InputRow label="Solar / Wind / Biomass" value={`${fmtNum(inputs.solar_kwh, 0)} / ${fmtNum(inputs.wind_kwh, 0)} / ${fmtNum(inputs.biomass_kwh, 0)} kWh`} />
          <InputRow label="Diesel / Petrol" value={`${fmtNum(inputs.diesel_hsd_litres, 0)} L / ${fmtNum(inputs.petrol_ms_litres, 0)} L`} />
          <InputRow label="Furnace oil / CNG" value={`${fmtNum(inputs.furnace_oil_litres, 0)} L / ${fmtNum(inputs.cng_kg, 0)} kg`} />
          <InputRow label="LPG / Natural gas" value={`${fmtNum(inputs.lpg_kg, 0)} kg / ${fmtNum(inputs.natural_gas_m3, 0)} m³`} />
        </SectionCard>
      )}

      {/* Water stress */}
      {report.water && (
        <SectionCard title="Water stress assessment" subtitle="Location-based baseline water stress (WRI Aqueduct)">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <span
              className="dash-badge"
              style={{ background: stressColor, color: "#fff", fontSize: "0.8rem", padding: "6px 14px" }}
            >
              {stress.replace(/_/g, " ")}
            </span>
            <span style={{ fontSize: "0.8125rem" }}>
              PIN {report.water.pin_code} · {report.water.state}
              {report.water.total_water_kl != null && <> · Withdrawal {fmtNum(report.water.total_water_kl)} KL</>}
            </span>
          </div>
          <p className="dash-muted" style={{ fontSize: "0.75rem", marginTop: 12 }}>
            {STRESS_DESCRIPTIONS[stress] ??
              "Water stress level indicates competition for available water in the facility region."}
          </p>
          <p className="dash-muted" style={{ fontSize: "0.65rem", marginTop: 8 }}>
            Used for BRSR disclosure WAT_01 and informs operational water-risk planning.
          </p>
        </SectionCard>
      )}

      {/* Waste recovery */}
      {report.waste_recovery && (
        <SectionCard
          title="Waste recovery"
          subtitle={`${fmtNum(report.waste_recovery.recovery_rate_pct, 1)}% recovery rate`}
        >
          <div className="report-metrics-grid" style={{ marginBottom: 12 }}>
            <MetricCard label="Total generated" value={`${fmtNum(inputs.total_generated_mt, 2)} MT`} />
            <MetricCard label="Total recovered" value={`${fmtNum(report.waste_recovery.total_recovered_mt, 2)} MT`} />
            <MetricCard label="Disposed" value={`${fmtNum(report.waste_recovery.total_disposed_mt, 2)} MT`} />
            <MetricCard
              label="Recovery rate"
              value={`${fmtNum(report.waste_recovery.recovery_rate_pct, 1)}%`}
              hint="Recovered ÷ generated × 100"
            />
          </div>

          <div className="report-chart-split">
            <div className="report-chart-split__chart report-chart-box" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={wasteChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                    <Cell fill="#10B981" />
                    <Cell fill="#94A3B8" />
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {wasteBreakdown.length > 0 && (
              <div className="report-chart-split__side">
                <p className="dash-label" style={{ fontSize: "0.7rem", marginBottom: 6 }}>
                  Recovery methods
                </p>
                {wasteBreakdown.map((r) => (
                  <InputRow key={r.method} label={r.method} value={`${fmtNum(r.mt, 2)} MT`} />
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* BRSR mapping */}
      <SectionCard
        title="BRSR disclosure mapping"
        subtitle="Values that can populate BRSR Core indicators when linked to an assessment"
      >
        <DataTable
          headers={["BRSR code", "Indicator", "Value"]}
          rows={BRSR_MAPPINGS.map((m) => [m.code, m.label, brsrValue(m, report, inputs)])}
        />
        {!report.brsr_populated && (
          <p className="dash-muted" style={{ fontSize: "0.65rem", marginTop: 10 }}>
            This calculation was saved without linking to a BRSR assessment. Link an assessment in the calculator to
            auto-populate disclosure fields.
          </p>
        )}
      </SectionCard>

      {/* Methodology */}
      <SectionCard title="Methodology & assumptions" subtitle="Calculation references for audit and assurance">
        <ul className="dash-muted" style={{ fontSize: "0.7rem", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
          <li>Scope 1 & 2 intensity uses user-reported tCO₂e values and PPP-adjusted revenue (INR Crore).</li>
          <li>Scope 3 uses spend-based emission factors (kg CO₂e per INR) by category; result in tCO₂e.</li>
          <li>Energy converts fuel and electricity inputs to GJ using standard conversion factors; solar, wind, and biomass count as renewable.</li>
          <li>Water stress is derived from PIN code lookup against WRI Aqueduct baseline water stress.</li>
          <li>Waste recovery rate = sum of recovery pathways ÷ total waste generated.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
