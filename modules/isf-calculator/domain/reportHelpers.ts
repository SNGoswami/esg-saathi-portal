/** Scope 3 spend factors (kg CO₂e per INR), mirrors backend Scope3SpendEngine */
export const SCOPE3_FACTORS: Record<string, number> = {
  purchased_goods: 0.0008,
  capital_goods: 0.0006,
  fuel_energy: 0.0012,
  transport: 0.0009,
  waste: 0.0005,
  travel: 0.0015,
  commuting: 0.0007,
};

export const SCOPE3_LABELS: Record<string, string> = {
  purchased_goods: "Purchased goods & services",
  capital_goods: "Capital goods",
  fuel_energy: "Fuel & energy-related",
  transport: "Upstream transport & distribution",
  waste: "Waste generated in operations",
  travel: "Business travel",
  commuting: "Employee commuting",
};

export const SCOPE3_INPUT_KEYS: Record<string, keyof import("./types").IsfSavedInputs> = {
  purchased_goods: "purchased_goods_inr",
  capital_goods: "capital_goods_inr",
  fuel_energy: "fuel_energy_inr",
  transport: "transport_inr",
  waste: "waste_inr",
  travel: "travel_inr",
  commuting: "commuting_inr",
};

export const STRESS_COLORS: Record<string, string> = {
  LOW: "#10B981",
  LOW_MEDIUM: "#14B8A6",
  MEDIUM_HIGH: "#F59E0B",
  HIGH: "#F97316",
  EXTREMELY_HIGH: "#DC2626",
};

export const STRESS_DESCRIPTIONS: Record<string, string> = {
  LOW: "Low baseline water stress, limited competition for water resources.",
  LOW_MEDIUM: "Low–medium stress, moderate seasonal or regional pressure.",
  MEDIUM_HIGH: "Medium–high stress, significant competition for available water.",
  HIGH: "High stress, substantial water scarcity risk for operations.",
  EXTREMELY_HIGH: "Extremely high stress, critical water scarcity; prioritize conservation.",
};

export function fmtNum(n?: number | null, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function fmtInrCr(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

export function fmtInrLakh(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Approximate GJ from energy inputs (same conversion factors as backend) */
export function energySourceBreakdown(inputs: import("./types").IsfSavedInputs) {
  const rows: { source: string; raw: string; gj: number }[] = [];
  const add = (source: string, raw: string, gj: number) => {
    if (gj > 0) rows.push({ source, raw, gj });
  };

  const kwh = (v?: number) => (v ?? 0) * 0.0036;
  add("Grid electricity", `${fmtNum(inputs.electricity_kwh, 0)} kWh`, kwh(inputs.electricity_kwh));
  add("Solar", `${fmtNum(inputs.solar_kwh, 0)} kWh`, kwh(inputs.solar_kwh));
  add("Wind", `${fmtNum(inputs.wind_kwh, 0)} kWh`, kwh(inputs.wind_kwh));
  add("Biomass", `${fmtNum(inputs.biomass_kwh, 0)} kWh`, kwh(inputs.biomass_kwh));
  add("Diesel", `${fmtNum(inputs.diesel_hsd_litres, 0)} L`, (inputs.diesel_hsd_litres ?? 0) * 0.0386);
  add("Petrol", `${fmtNum(inputs.petrol_ms_litres, 0)} L`, (inputs.petrol_ms_litres ?? 0) * 0.0327);
  add("Furnace oil", `${fmtNum(inputs.furnace_oil_litres, 0)} L`, (inputs.furnace_oil_litres ?? 0) * 0.041);
  add("LPG", `${fmtNum(inputs.lpg_kg, 0)} kg`, (inputs.lpg_kg ?? 0) * 0.046);
  add("CNG", `${fmtNum(inputs.cng_kg, 0)} kg`, (inputs.cng_kg ?? 0) * 0.048);
  add("Natural gas", `${fmtNum(inputs.natural_gas_m3, 0)} m³`, (inputs.natural_gas_m3 ?? 0) * 0.038);

  return rows;
}

export const BRSR_MAPPINGS = [
  { code: "GHG_01", label: "Scope 1 emissions", field: "scope1_tco2e" as const },
  { code: "GHG_02", label: "Scope 2 emissions", field: "scope2_tco2e" as const },
  { code: "GHG_03", label: "Scope 3 emissions (spend-based)", derived: "scope3_total" as const },
  { code: "GHG_04", label: "Total GHG (Scope 1+2)", derived: "total_ghg" as const },
  { code: "GHG_05", label: "Emission intensity per revenue", derived: "intensity_revenue" as const },
  { code: "ENE_01", label: "Total energy consumption", derived: "energy_gj" as const },
  { code: "ENE_02", label: "Renewable energy share", derived: "renewable_pct" as const },
  { code: "WAT_01", label: "Water stress level", derived: "water_stress" as const },
  { code: "WST_01", label: "Waste recovery rate", derived: "recovery_rate" as const },
];
