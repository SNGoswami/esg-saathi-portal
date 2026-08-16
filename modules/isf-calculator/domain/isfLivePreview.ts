import {
  DEFAULT_ISF_FORM,
  EMPTY_SCOPE3,
  type IsfFormState,
} from "@/modules/isf-calculator/domain/isfFormState";
import {
  energySourceBreakdown,
  SCOPE3_FACTORS,
  SCOPE3_INPUT_KEYS,
  SCOPE3_LABELS,
} from "@/modules/isf-calculator/domain/reportHelpers";
import type { IsfSavedInputs } from "@/modules/isf-calculator/domain/types";

function parseNum(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function formToInputs(form: IsfFormState): IsfSavedInputs {
  return {
    scope1_tco2e: parseNum(form.scope1),
    scope2_tco2e: parseNum(form.scope2),
    revenue_inr_cr: parseNum(form.revenue),
    ppp_factor: parseNum(form.ppp),
    output_quantity: parseNum(form.outputQty),
    output_unit: form.outputUnit || undefined,
    purchased_goods_inr: parseNum(form.scope3.purchased_goods_inr),
    capital_goods_inr: parseNum(form.scope3.capital_goods_inr),
    fuel_energy_inr: parseNum(form.scope3.fuel_energy_inr),
    transport_inr: parseNum(form.scope3.transport_inr),
    waste_inr: parseNum(form.scope3.waste_inr),
    travel_inr: parseNum(form.scope3.travel_inr),
    commuting_inr: parseNum(form.scope3.commuting_inr),
    electricity_kwh: parseNum(form.electricityKwh),
    diesel_hsd_litres: parseNum(form.dieselHsd),
    petrol_ms_litres: parseNum(form.petrolMs),
    furnace_oil_litres: parseNum(form.furnaceOil),
    lpg_kg: parseNum(form.lpg),
    cng_kg: parseNum(form.cng),
    natural_gas_m3: parseNum(form.gas),
    solar_kwh: parseNum(form.solar),
    wind_kwh: parseNum(form.wind),
    biomass_kwh: parseNum(form.biomass),
    pin_code: form.pinCode || undefined,
    groundwater_kl: parseNum(form.groundwaterKl),
    surface_water_kl: parseNum(form.surfaceWaterKl),
    municipal_water_kl: parseNum(form.municipalWaterKl),
    rainwater_kl: parseNum(form.rainwaterKl),
    other_water_kl: parseNum(form.otherWaterKl),
    water_discharged_kl: parseNum(form.waterDischargedKl),
    hazardous_waste_mt: parseNum(form.hazardousWasteMt),
    non_hazardous_waste_mt: parseNum(form.nonHazardousWasteMt),
    plastic_waste_mt: parseNum(form.plasticWasteMt),
    ewaste_mt: parseNum(form.ewasteMt),
    biomedical_waste_mt: parseNum(form.biomedicalWasteMt),
    other_waste_mt: parseNum(form.otherWasteMt),
    total_generated_mt: parseNum(form.wasteTotal),
    recycled_mt: parseNum(form.wasteRecycled),
    reused_mt: parseNum(form.wasteReused),
    composted_mt: parseNum(form.wasteComposted),
    coprocessed_mt: parseNum(form.wasteCoprocessed),
    other_recovery_mt: parseNum(form.wasteOtherRecovery),
    landfill_mt: parseNum(form.landfillMt),
    incineration_mt: parseNum(form.incinerationMt),
    other_disposal_mt: parseNum(form.otherDisposalMt),
  };
}

export type IsfLivePreview = {
  scope1: number;
  scope2: number;
  totalGhg: number;
  pppRevenue: number;
  intensityRevenue: number;
  intensityOutput: number | null;
  scope3Total: number;
  scope3Breakdown: Array<{ key: string; label: string; spend: number; tco2e: number; pct: number }>;
  energyTotalGj: number;
  renewableGj: number;
  nonRenewableGj: number;
  renewablePct: number;
  energyIntensity: number | null;
  totalWaterKl: number;
  waterConsumptionKl: number;
  waterNegative: boolean;
  wasteGenerated: number;
  wasteRecovered: number;
  wasteDisposed: number;
  recoveryRatePct: number;
  wasteOverRecovered: boolean;
  totalFootprint: number;
  footprintPie: Array<{ name: string; value: number }>;
  moduleCompletion: Record<string, { filled: number; total: number; pct: number }>;
  overallCompletionPct: number;
};

export function computeIsfLivePreview(form: IsfFormState): IsfLivePreview {
  const inputs = formToInputs(form);
  const scope1 = inputs.scope1_tco2e ?? 0;
  const scope2 = inputs.scope2_tco2e ?? 0;
  const totalGhg = scope1 + scope2;
  const revenue = inputs.revenue_inr_cr ?? 0;
  const pppFactor = inputs.ppp_factor && inputs.ppp_factor > 0 ? inputs.ppp_factor : 22.882;
  const pppRevenue = pppFactor > 0 ? revenue / pppFactor : 0;
  const intensityRevenue = pppRevenue > 0 ? totalGhg / pppRevenue : 0;
  const outputQty = inputs.output_quantity ?? 0;
  const intensityOutput = outputQty > 0 ? totalGhg / outputQty : null;

  const scope3Breakdown = Object.keys(SCOPE3_LABELS).map((key) => {
    const spendKey = SCOPE3_INPUT_KEYS[key];
    const spend = Number(inputs[spendKey] ?? 0);
    const factor = SCOPE3_FACTORS[key];
    const tco2e = (spend * factor) / 1000;
    return { key, label: SCOPE3_LABELS[key], spend, tco2e, pct: 0 };
  });
  const scope3Total = scope3Breakdown.reduce((sum, row) => sum + row.tco2e, 0);
  scope3Breakdown.forEach((row) => {
    row.pct = scope3Total > 0 ? (row.tco2e / scope3Total) * 100 : 0;
  });

  const sources = energySourceBreakdown(inputs);
  const renewableKeys = new Set(["Solar", "Wind", "Biomass"]);
  let renewableGj = 0;
  let nonRenewableGj = 0;
  for (const row of sources) {
    if (renewableKeys.has(row.source)) renewableGj += row.gj;
    else nonRenewableGj += row.gj;
  }
  const energyTotalGj = renewableGj + nonRenewableGj;
  const renewablePct = energyTotalGj > 0 ? (renewableGj / energyTotalGj) * 100 : 0;
  const energyIntensity = revenue > 0 && energyTotalGj > 0 ? energyTotalGj / revenue : null;

  const totalWaterKl =
    (inputs.groundwater_kl ?? 0) +
    (inputs.surface_water_kl ?? 0) +
    (inputs.municipal_water_kl ?? 0) +
    (inputs.rainwater_kl ?? 0) +
    (inputs.other_water_kl ?? 0);
  const waterConsumptionKl = totalWaterKl - (inputs.water_discharged_kl ?? 0);
  const waterNegative = waterConsumptionKl < 0;

  const fromTypes =
    (inputs.hazardous_waste_mt ?? 0) +
    (inputs.non_hazardous_waste_mt ?? 0) +
    (inputs.plastic_waste_mt ?? 0) +
    (inputs.ewaste_mt ?? 0) +
    (inputs.biomedical_waste_mt ?? 0) +
    (inputs.other_waste_mt ?? 0);
  const wasteGenerated = fromTypes > 0 ? fromTypes : (inputs.total_generated_mt ?? 0);
  const wasteRecovered =
    (inputs.recycled_mt ?? 0) +
    (inputs.reused_mt ?? 0) +
    (inputs.composted_mt ?? 0) +
    (inputs.coprocessed_mt ?? 0) +
    (inputs.other_recovery_mt ?? 0);
  const disposalSum =
    (inputs.landfill_mt ?? 0) + (inputs.incineration_mt ?? 0) + (inputs.other_disposal_mt ?? 0);
  const hasDisposal =
    inputs.landfill_mt != null || inputs.incineration_mt != null || inputs.other_disposal_mt != null;
  const wasteDisposed = hasDisposal ? disposalSum : Math.max(0, wasteGenerated - wasteRecovered);
  const recoveryRatePct = wasteGenerated > 0 ? (wasteRecovered / wasteGenerated) * 100 : 0;

  const totalFootprint = totalGhg + scope3Total;
  const footprintPie = [
    { name: "Scope 1", value: scope1 },
    { name: "Scope 2", value: scope2 },
    { name: "Scope 3", value: scope3Total },
  ].filter((r) => r.value > 0);

  const moduleCompletion: IsfLivePreview["moduleCompletion"] = {
    emission: countModuleFields(form, ["scope1", "scope2", "revenue"], 4),
    scope3: countScope3Fields(form),
    energy: countModuleFields(
      form,
      ["electricityKwh", "dieselHsd", "petrolMs", "lpg", "gas", "solar", "wind", "biomass", "furnaceOil", "cng"],
      1,
    ),
    water: countModuleFields(
      form,
      ["pinCode", "groundwaterKl", "surfaceWaterKl", "municipalWaterKl", "waterDischargedKl"],
      1,
    ),
    waste: countModuleFields(
      form,
      ["wasteTotal", "wasteRecycled", "hazardousWasteMt", "landfillMt"],
      1,
    ),
    air: countModuleFields(form, ["noxKg", "soxKg", "pmKg"], 1),
    disclosure: {
      filled: [form.isDesignatedConsumer, form.ghgReductionProject, form.envComplaint].filter((v) => v != null)
        .length,
      total: 3,
      pct: Math.round(
        ([form.isDesignatedConsumer, form.ghgReductionProject, form.envComplaint].filter((v) => v != null).length /
          3) *
          100,
      ),
    },
  };

  const overallCompletionPct = Math.round(
    Object.values(moduleCompletion).reduce((sum, m) => sum + m.pct, 0) /
      Math.max(Object.keys(moduleCompletion).length, 1),
  );

  return {
    scope1,
    scope2,
    totalGhg,
    pppRevenue,
    intensityRevenue,
    intensityOutput,
    scope3Total,
    scope3Breakdown: scope3Breakdown.filter((r) => r.spend > 0 || r.tco2e > 0),
    energyTotalGj,
    renewableGj,
    nonRenewableGj,
    renewablePct,
    energyIntensity,
    totalWaterKl,
    waterConsumptionKl,
    waterNegative,
    wasteGenerated,
    wasteRecovered,
    wasteDisposed,
    recoveryRatePct,
    wasteOverRecovered: wasteGenerated > 0 && wasteRecovered > wasteGenerated,
    totalFootprint,
    footprintPie,
    moduleCompletion,
    overallCompletionPct,
  };
}

function hasValue(v: string) {
  return v.trim() !== "" && parseNum(v) != null;
}

function countModuleFields(form: IsfFormState, keys: (keyof IsfFormState)[], total: number) {
  const filled = keys.filter((k) => hasValue(String(form[k] ?? ""))).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

function countScope3Fields(form: IsfFormState) {
  const keys = Object.keys(form.scope3);
  const filled = keys.filter((k) => hasValue(form.scope3[k] ?? "")).length;
  return { filled, total: keys.length, pct: Math.round((filled / keys.length) * 100) };
}

export function formFromSavedInputs(inputs?: IsfSavedInputs): IsfFormState {
  if (!inputs) return { ...DEFAULT_ISF_FORM, scope3: { ...EMPTY_SCOPE3 } };

  const str = (n?: number | null) => (n != null && Number.isFinite(n) ? String(n) : "");
  const bool = (v?: boolean | null) => (v == null ? null : v);

  return {
    ...DEFAULT_ISF_FORM,
    scope1: str(inputs.scope1_tco2e),
    scope2: str(inputs.scope2_tco2e),
    revenue: str(inputs.revenue_inr_cr),
    ppp: str(inputs.ppp_factor) || "22.882",
    outputQty: str(inputs.output_quantity),
    outputUnit: inputs.output_unit ?? "units",
    scope3: {
      purchased_goods_inr: str(inputs.purchased_goods_inr),
      capital_goods_inr: str(inputs.capital_goods_inr),
      fuel_energy_inr: str(inputs.fuel_energy_inr),
      transport_inr: str(inputs.transport_inr),
      waste_inr: str(inputs.waste_inr),
      travel_inr: str(inputs.travel_inr),
      commuting_inr: str(inputs.commuting_inr),
    },
    electricityKwh: str(inputs.electricity_kwh),
    dieselHsd: str(inputs.diesel_hsd_litres),
    petrolMs: str(inputs.petrol_ms_litres),
    furnaceOil: str(inputs.furnace_oil_litres),
    lpg: str(inputs.lpg_kg),
    cng: str(inputs.cng_kg),
    gas: str(inputs.natural_gas_m3),
    solar: str(inputs.solar_kwh),
    wind: str(inputs.wind_kwh),
    biomass: str(inputs.biomass_kwh),
    pinCode: inputs.pin_code ?? "",
    groundwaterKl: str(inputs.groundwater_kl),
    surfaceWaterKl: str(inputs.surface_water_kl),
    municipalWaterKl: str(inputs.municipal_water_kl),
    rainwaterKl: str(inputs.rainwater_kl),
    otherWaterKl: str(inputs.other_water_kl),
    waterDischargedKl: str(inputs.water_discharged_kl),
    dischargeSurfaceKl: str(inputs.discharge_surface_kl),
    dischargeGroundwaterKl: str(inputs.discharge_groundwater_kl),
    dischargeSeawaterKl: str(inputs.discharge_seawater_kl),
    dischargeThirdpartyKl: str(inputs.discharge_thirdparty_kl),
    dischargeTreatedKl: str(inputs.discharge_treated_kl),
    waterWithdrawalStressedKl: str(inputs.water_withdrawal_stressed_kl),
    waterConsumptionStressedKl: str(inputs.water_consumption_stressed_kl),
    zidImplemented: bool(inputs.zid_implemented),
    hazardousWasteMt: str(inputs.hazardous_waste_mt),
    nonHazardousWasteMt: str(inputs.non_hazardous_waste_mt),
    plasticWasteMt: str(inputs.plastic_waste_mt),
    ewasteMt: str(inputs.ewaste_mt),
    biomedicalWasteMt: str(inputs.biomedical_waste_mt),
    otherWasteMt: str(inputs.other_waste_mt),
    wasteTotal: str(inputs.total_generated_mt),
    wasteRecycled: str(inputs.recycled_mt),
    wasteReused: str(inputs.reused_mt),
    wasteComposted: str(inputs.composted_mt),
    wasteCoprocessed: str(inputs.coprocessed_mt),
    wasteOtherRecovery: str(inputs.other_recovery_mt),
    landfillMt: str(inputs.landfill_mt),
    incinerationMt: str(inputs.incineration_mt),
    otherDisposalMt: str(inputs.other_disposal_mt),
    noxKg: str(inputs.nox_kg),
    soxKg: str(inputs.sox_kg),
    pmKg: str(inputs.pm_kg),
    vocKg: str(inputs.voc_kg),
    popKg: str(inputs.pop_kg),
    hapKg: str(inputs.hap_kg),
    otherAirKg: str(inputs.other_air_kg),
    isDesignatedConsumer: bool(inputs.is_designated_consumer),
    patTargetToe: str(inputs.pat_target_toe),
    patEscerts: str(inputs.pat_escerts),
    ghgReductionProject: bool(inputs.ghg_reduction_project),
    ghgProjectDetails: inputs.ghg_project_details ?? "",
    emissionsAvoidedTco2e: str(inputs.emissions_avoided_tco2e),
    wasteMgmtPractices: inputs.waste_mgmt_practices ?? "",
    hazPlasticReduction: inputs.haz_plastic_reduction ?? "",
    inEcoSensitiveArea: bool(inputs.in_eco_sensitive_area),
    ecoSensitiveDetails: inputs.eco_sensitive_details ?? "",
    biodiversityImpact: inputs.biodiversity_impact ?? "",
    eiaProjectName: inputs.eia_project_name ?? "",
    eiaNotification: inputs.eia_notification ?? "",
    eiaExternalAgency: bool(inputs.eia_external_agency),
    eiaPublicDomain: bool(inputs.eia_public_domain),
    envComplaint: bool(inputs.env_complaint),
    envNoncomplianceDetails: inputs.env_noncompliance_details ?? "",
  };
}
