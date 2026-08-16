import {
  calcCacheKey,
  fetchWithCalculatorCache,
  invalidateCalculatorCache,
  readCalculatorCache,
  writeCalculatorCache,
} from "@/modules/calculators/cache/calculatorCache";
import { apiFetch } from "@/modules/platform/api/client";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";
import type {
  ConvertResponse,
  IsfCalculateRequest,
  IsfCalculationResponse,
  IsfClientStatus,
  IsfHistoryItem,
  IsfSavedInputs,
} from "@/modules/isf-calculator/domain/types";

function toApiBody(req: IsfCalculateRequest): Record<string, unknown> {
  return {
    clientId: req.client_id ?? null,
    fiscalYear: req.fiscal_year,
    brsrAssessmentId: req.brsr_assessment_id ?? null,
    emissionIntensity: req.emission_intensity
      ? {
          scope1Tco2e: req.emission_intensity.scope1_tco2e,
          scope2Tco2e: req.emission_intensity.scope2_tco2e,
          revenueInrCr: req.emission_intensity.revenue_inr_cr,
          pppFactor: req.emission_intensity.ppp_factor,
          outputQuantity: req.emission_intensity.output_quantity,
          outputUnit: req.emission_intensity.output_unit,
        }
      : undefined,
    scope3Spend: req.scope3_spend
      ? {
          purchasedGoodsInr: req.scope3_spend.purchased_goods_inr,
          capitalGoodsInr: req.scope3_spend.capital_goods_inr,
          fuelEnergyInr: req.scope3_spend.fuel_energy_inr,
          transportInr: req.scope3_spend.transport_inr,
          wasteInr: req.scope3_spend.waste_inr,
          travelInr: req.scope3_spend.travel_inr,
          commutingInr: req.scope3_spend.commuting_inr,
        }
      : undefined,
    energy: req.energy
      ? {
          electricityKwh: req.energy.electricity_kwh,
          dieselHsdLitres: req.energy.diesel_hsd_litres,
          petrolMsLitres: req.energy.petrol_ms_litres,
          furnaceOilLitres: req.energy.furnace_oil_litres,
          lpgKg: req.energy.lpg_kg,
          cngKg: req.energy.cng_kg,
          naturalGasM3: req.energy.natural_gas_m3,
          solarKwh: req.energy.solar_kwh,
          windKwh: req.energy.wind_kwh,
          biomassKwh: req.energy.biomass_kwh,
          revenueInrCr: req.energy.revenue_inr_cr,
        }
      : undefined,
    water: req.water
      ? {
          pinCode: req.water.pin_code,
          groundwaterKl: req.water.groundwater_kl,
          surfaceWaterKl: req.water.surface_water_kl,
          municipalWaterKl: req.water.municipal_water_kl,
          rainwaterKl: req.water.rainwater_kl,
          otherWaterKl: req.water.other_water_kl,
          waterDischargedKl: req.water.water_discharged_kl,
          dischargeSurfaceKl: req.water.discharge_surface_kl,
          dischargeGroundwaterKl: req.water.discharge_groundwater_kl,
          dischargeSeawaterKl: req.water.discharge_seawater_kl,
          dischargeThirdpartyKl: req.water.discharge_thirdparty_kl,
          dischargeTreatedKl: req.water.discharge_treated_kl,
          waterWithdrawalStressedKl: req.water.water_withdrawal_stressed_kl,
          waterConsumptionStressedKl: req.water.water_consumption_stressed_kl,
          zidImplemented: req.water.zid_implemented,
        }
      : undefined,
    wasteRecovery: req.waste_recovery
      ? {
          totalGeneratedMt: req.waste_recovery.total_generated_mt,
          hazardousWasteMt: req.waste_recovery.hazardous_waste_mt,
          nonHazardousWasteMt: req.waste_recovery.non_hazardous_waste_mt,
          plasticWasteMt: req.waste_recovery.plastic_waste_mt,
          ewasteMt: req.waste_recovery.ewaste_mt,
          biomedicalWasteMt: req.waste_recovery.biomedical_waste_mt,
          otherWasteMt: req.waste_recovery.other_waste_mt,
          recycledMt: req.waste_recovery.recycled_mt,
          reusedMt: req.waste_recovery.reused_mt,
          compostedMt: req.waste_recovery.composted_mt,
          coprocessedMt: req.waste_recovery.coprocessed_mt,
          otherRecoveryMt: req.waste_recovery.other_recovery_mt,
          landfillMt: req.waste_recovery.landfill_mt,
          incinerationMt: req.waste_recovery.incineration_mt,
          otherDisposalMt: req.waste_recovery.other_disposal_mt,
        }
      : undefined,
    airEmissions: req.air_emissions
      ? {
          noxKg: req.air_emissions.nox_kg,
          soxKg: req.air_emissions.sox_kg,
          pmKg: req.air_emissions.pm_kg,
          vocKg: req.air_emissions.voc_kg,
          popKg: req.air_emissions.pop_kg,
          hapKg: req.air_emissions.hap_kg,
          otherAirKg: req.air_emissions.other_air_kg,
        }
      : undefined,
    envDisclosure: req.env_disclosure
      ? {
          isDesignatedConsumer: req.env_disclosure.is_designated_consumer,
          patTargetToe: req.env_disclosure.pat_target_toe,
          patEscerts: req.env_disclosure.pat_escerts,
          ghgReductionProject: req.env_disclosure.ghg_reduction_project,
          ghgProjectDetails: req.env_disclosure.ghg_project_details,
          emissionsAvoidedTco2e: req.env_disclosure.emissions_avoided_tco2e,
          wasteMgmtPractices: req.env_disclosure.waste_mgmt_practices,
          hazPlasticReduction: req.env_disclosure.haz_plastic_reduction,
          inEcoSensitiveArea: req.env_disclosure.in_eco_sensitive_area,
          ecoSensitiveDetails: req.env_disclosure.eco_sensitive_details,
          biodiversityImpact: req.env_disclosure.biodiversity_impact,
          eiaProjectName: req.env_disclosure.eia_project_name,
          eiaNotification: req.env_disclosure.eia_notification,
          eiaExternalAgency: req.env_disclosure.eia_external_agency,
          eiaPublicDomain: req.env_disclosure.eia_public_domain,
          envComplaint: req.env_disclosure.env_complaint,
          envNoncomplianceDetails: req.env_disclosure.env_noncompliance_details,
        }
      : undefined,
  };
}

function mapInputs(raw: Record<string, unknown> | undefined): IsfSavedInputs | undefined {
  if (!raw) return undefined;
  return {
    scope1_tco2e: raw.scope1Tco2e as number | undefined,
    scope2_tco2e: raw.scope2Tco2e as number | undefined,
    revenue_inr_cr: raw.revenueInrCr as number | undefined,
    ppp_factor: raw.pppFactor as number | undefined,
    output_quantity: raw.outputQuantity as number | undefined,
    output_unit: raw.outputUnit as string | undefined,
    purchased_goods_inr: raw.purchasedGoodsInr as number | undefined,
    capital_goods_inr: raw.capitalGoodsInr as number | undefined,
    fuel_energy_inr: raw.fuelEnergyInr as number | undefined,
    transport_inr: raw.transportInr as number | undefined,
    waste_inr: raw.wasteInr as number | undefined,
    travel_inr: raw.travelInr as number | undefined,
    commuting_inr: raw.commutingInr as number | undefined,
    electricity_kwh: raw.electricityKwh as number | undefined,
    diesel_hsd_litres: raw.dieselHsdLitres as number | undefined,
    petrol_ms_litres: raw.petrolMsLitres as number | undefined,
    furnace_oil_litres: raw.furnaceOilLitres as number | undefined,
    lpg_kg: raw.lpgKg as number | undefined,
    cng_kg: raw.cngKg as number | undefined,
    natural_gas_m3: raw.naturalGasM3 as number | undefined,
    solar_kwh: raw.solarKwh as number | undefined,
    wind_kwh: raw.windKwh as number | undefined,
    biomass_kwh: raw.biomassKwh as number | undefined,
    pin_code: raw.pinCode as string | undefined,
    groundwater_kl: raw.groundwaterKl as number | undefined,
    surface_water_kl: raw.surfaceWaterKl as number | undefined,
    municipal_water_kl: raw.municipalWaterKl as number | undefined,
    rainwater_kl: raw.rainwaterKl as number | undefined,
    other_water_kl: raw.otherWaterKl as number | undefined,
    water_discharged_kl: raw.waterDischargedKl as number | undefined,
    discharge_surface_kl: raw.dischargeSurfaceKl as number | undefined,
    discharge_groundwater_kl: raw.dischargeGroundwaterKl as number | undefined,
    discharge_seawater_kl: raw.dischargeSeawaterKl as number | undefined,
    discharge_thirdparty_kl: raw.dischargeThirdpartyKl as number | undefined,
    discharge_treated_kl: raw.dischargeTreatedKl as number | undefined,
    water_withdrawal_stressed_kl: raw.waterWithdrawalStressedKl as number | undefined,
    water_consumption_stressed_kl: raw.waterConsumptionStressedKl as number | undefined,
    zid_implemented: raw.zidImplemented as boolean | undefined,
    total_generated_mt: raw.totalGeneratedMt as number | undefined,
    hazardous_waste_mt: raw.hazardousWasteMt as number | undefined,
    non_hazardous_waste_mt: raw.nonHazardousWasteMt as number | undefined,
    plastic_waste_mt: raw.plasticWasteMt as number | undefined,
    ewaste_mt: raw.ewasteMt as number | undefined,
    biomedical_waste_mt: raw.biomedicalWasteMt as number | undefined,
    other_waste_mt: raw.otherWasteMt as number | undefined,
    recycled_mt: raw.recycledMt as number | undefined,
    reused_mt: raw.reusedMt as number | undefined,
    composted_mt: raw.compostedMt as number | undefined,
    coprocessed_mt: raw.coprocessedMt as number | undefined,
    other_recovery_mt: raw.otherRecoveryMt as number | undefined,
    landfill_mt: raw.landfillMt as number | undefined,
    incineration_mt: raw.incinerationMt as number | undefined,
    other_disposal_mt: raw.otherDisposalMt as number | undefined,
    nox_kg: raw.noxKg as number | undefined,
    sox_kg: raw.soxKg as number | undefined,
    pm_kg: raw.pmKg as number | undefined,
    voc_kg: raw.vocKg as number | undefined,
    pop_kg: raw.popKg as number | undefined,
    hap_kg: raw.hapKg as number | undefined,
    other_air_kg: raw.otherAirKg as number | undefined,
    is_designated_consumer: raw.isDesignatedConsumer as boolean | undefined,
    pat_target_toe: raw.patTargetToe as number | undefined,
    pat_escerts: raw.patEscerts as number | undefined,
    ghg_reduction_project: raw.ghgReductionProject as boolean | undefined,
    ghg_project_details: raw.ghgProjectDetails as string | undefined,
    emissions_avoided_tco2e: raw.emissionsAvoidedTco2e as number | undefined,
    waste_mgmt_practices: raw.wasteMgmtPractices as string | undefined,
    haz_plastic_reduction: raw.hazPlasticReduction as string | undefined,
    in_eco_sensitive_area: raw.inEcoSensitiveArea as boolean | undefined,
    eco_sensitive_details: raw.ecoSensitiveDetails as string | undefined,
    biodiversity_impact: raw.biodiversityImpact as string | undefined,
    eia_project_name: raw.eiaProjectName as string | undefined,
    eia_notification: raw.eiaNotification as string | undefined,
    eia_external_agency: raw.eiaExternalAgency as boolean | undefined,
    eia_public_domain: raw.eiaPublicDomain as boolean | undefined,
    env_complaint: raw.envComplaint as boolean | undefined,
    env_noncompliance_details: raw.envNoncomplianceDetails as string | undefined,
  };
}

function mapResponse(raw: Record<string, unknown>): IsfCalculationResponse {
  const ei = raw.emissionIntensity as Record<string, number> | undefined;
  const s3 = raw.scope3 as { totalTco2e?: number; breakdown?: Record<string, number> } | undefined;
  const en = raw.energy as Record<string, number> | undefined;
  const water = raw.water as Record<string, unknown> | undefined;
  const wr = raw.wasteRecovery as Record<string, number> | undefined;
  const air = raw.airEmissions as Record<string, number> | undefined;
  const disc = raw.envDisclosure as Record<string, unknown> | undefined;
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    inputs: mapInputs(raw.inputs as Record<string, unknown> | undefined),
    emission_intensity: ei
      ? {
          total_ghg_tco2e: ei.totalGhgTco2e,
          ppp_revenue: ei.pppRevenue,
          intensity_revenue: ei.intensityRevenue,
          intensity_output: ei.intensityOutput,
        }
      : undefined,
    scope3: s3
      ? { total_tco2e: s3.totalTco2e, breakdown: s3.breakdown }
      : undefined,
    energy: en
      ? {
          total_gj: en.totalGj,
          renewable_gj: en.renewableGj,
          non_renewable_gj: en.nonRenewableGj,
          renewable_pct: en.renewablePct,
          intensity_revenue: en.intensityRevenue,
        }
      : undefined,
    water: water
      ? {
          pin_code: water.pinCode as string | undefined,
          state: water.state as string | undefined,
          stress_level: water.stressLevel as string | undefined,
          water_stress_flag: water.waterStressFlag as boolean | undefined,
          total_water_kl: water.totalWaterKl as number | undefined,
          water_consumption_kl: water.waterConsumptionKl as number | undefined,
          negative_consumption: water.negativeConsumption as boolean | undefined,
        }
      : undefined,
    waste_recovery: wr
      ? {
          total_generated_mt: wr.totalGeneratedMt,
          total_recovered_mt: wr.totalRecoveredMt,
          total_disposed_mt: wr.totalDisposedMt,
          recovery_rate_pct: wr.recoveryRatePct,
        }
      : undefined,
    air_emissions: air
      ? {
          nox_kg: air.noxKg,
          sox_kg: air.soxKg,
          pm_kg: air.pmKg,
          voc_kg: air.vocKg,
          pop_kg: air.popKg,
          hap_kg: air.hapKg,
          other_air_kg: air.otherAirKg,
        }
      : undefined,
    env_disclosure: disc
      ? {
          is_designated_consumer: disc.isDesignatedConsumer as boolean | undefined,
          pat_target_toe: disc.patTargetToe as number | undefined,
          pat_escerts: disc.patEscerts as number | undefined,
          ghg_reduction_project: disc.ghgReductionProject as boolean | undefined,
          ghg_project_details: disc.ghgProjectDetails as string | undefined,
          emissions_avoided_tco2e: disc.emissionsAvoidedTco2e as number | undefined,
          waste_mgmt_practices: disc.wasteMgmtPractices as string | undefined,
          haz_plastic_reduction: disc.hazPlasticReduction as string | undefined,
          in_eco_sensitive_area: disc.inEcoSensitiveArea as boolean | undefined,
          eco_sensitive_details: disc.ecoSensitiveDetails as string | undefined,
          biodiversity_impact: disc.biodiversityImpact as string | undefined,
          eia_project_name: disc.eiaProjectName as string | undefined,
          eia_notification: disc.eiaNotification as string | undefined,
          eia_external_agency: disc.eiaExternalAgency as boolean | undefined,
          eia_public_domain: disc.eiaPublicDomain as boolean | undefined,
          env_complaint: disc.envComplaint as boolean | undefined,
          env_noncompliance_details: disc.envNoncomplianceDetails as string | undefined,
        }
      : undefined,
    brsr_populated: Boolean(raw.brsrPopulated),
    created_at: raw.createdAt as string | undefined,
  };
}

function mapHistoryItem(raw: Record<string, unknown>): IsfHistoryItem {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    client_company_name: raw.clientCompanyName as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    scope3_total_tco2e: raw.scope3TotalTco2e as number | undefined,
    energy_total_gj: raw.energyTotalGj as number | undefined,
    recovery_rate_pct: raw.recoveryRatePct as number | undefined,
    created_at: raw.createdAt as string | undefined,
  };
}

export async function calculateIsf(req: IsfCalculateRequest): Promise<IsfCalculationResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/api/isf/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiBody(req)),
  });
  invalidateCalculatorCache("isf");
  return mapResponse(raw);
}

async function fetchIsfHistory(params?: {
  clientId?: string;
  fiscalYear?: string;
}): Promise<IsfHistoryItem[]> {
  const qs = new URLSearchParams();
  if (params?.clientId) qs.set("clientId", params.clientId);
  if (params?.fiscalYear) qs.set("fiscalYear", params.fiscalYear);
  const suffix = qs.toString() ? `?${qs}` : "";
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/isf/history${suffix}`, {
    method: "GET",
  });
  return raw.map(mapHistoryItem);
}

export async function getIsfHistory(
  params?: { clientId?: string; fiscalYear?: string },
  onUpdate?: (items: IsfHistoryItem[]) => void,
): Promise<IsfHistoryItem[]> {
  const key = calcCacheKey("isf", "history", params?.fiscalYear, params?.clientId);
  return fetchWithCalculatorCache(key, () => fetchIsfHistory(params), onUpdate);
}

async function fetchIsfClientStatus(fiscalYear: string): Promise<IsfClientStatus[]> {
  const qs = new URLSearchParams({ fiscalYear });
  const raw = await apiFetch<Record<string, unknown>[]>(`/api/isf/clients-status?${qs}`, {
    method: "GET",
  });
  return raw.map((row) => ({
    client_id: String(row.clientId),
    company_name: String(row.companyName),
    has_calculation: Boolean(row.hasCalculation),
    calculation_id: row.calculationId ? String(row.calculationId) : undefined,
  }));
}

export async function getIsfClientStatus(
  fiscalYear: string,
  onUpdate?: (rows: IsfClientStatus[]) => void,
): Promise<IsfClientStatus[]> {
  const key = calcCacheKey("isf", "clients-status", fiscalYear);
  return fetchWithCalculatorCache(key, () => fetchIsfClientStatus(fiscalYear), onUpdate);
}

export async function getIsfById(id: string): Promise<IsfCalculationResponse> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/isf/calculations/${id}`, {
    method: "GET",
  });
  return mapResponse(raw);
}

async function fetchIsfRecord(
  clientId: string,
  fiscalYear: string,
): Promise<IsfCalculationResponse | null> {
  const qs = new URLSearchParams({ clientId, fiscalYear });
  const response = await fetchWithSession(`/api/isf/record?${qs}`, { method: "GET" });
  if (response.status === 204) return null;
  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed (${response.status})`;
    try {
      const data = JSON.parse(text) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  return mapResponse(raw);
}

export async function getIsfRecord(
  clientId: string,
  fiscalYear: string,
  onUpdate?: (record: IsfCalculationResponse | null) => void,
): Promise<IsfCalculationResponse | null> {
  const key = calcCacheKey("isf", "record", clientId, fiscalYear);
  const cached = readCalculatorCache<IsfCalculationResponse | null>(key);
  if (cached !== null) {
    void fetchIsfRecord(clientId, fiscalYear)
      .then((fresh) => {
        writeCalculatorCache(key, fresh);
        onUpdate?.(fresh);
      })
      .catch(() => {});
    return cached;
  }
  const fresh = await fetchIsfRecord(clientId, fiscalYear);
  writeCalculatorCache(key, fresh);
  return fresh;
}

export async function convertIsfUnit(
  kind: "energy" | "water" | "waste",
  value: number,
  from: string,
  to: string,
): Promise<ConvertResponse> {
  const qs = new URLSearchParams({ value: String(value), from, to });
  return apiFetch<ConvertResponse>(`/api/isf/convert/${kind}?${qs}`, { method: "GET" });
}
