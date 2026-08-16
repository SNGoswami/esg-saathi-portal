export type IsfModuleId =
  | "emission"
  | "scope3"
  | "energy"
  | "water"
  | "waste"
  | "air"
  | "disclosure";

export type IsfFormState = {
  scope1: string;
  scope2: string;
  revenue: string;
  ppp: string;
  outputQty: string;
  outputUnit: string;
  scope3: Record<string, string>;
  electricityKwh: string;
  dieselHsd: string;
  petrolMs: string;
  furnaceOil: string;
  lpg: string;
  cng: string;
  gas: string;
  solar: string;
  wind: string;
  biomass: string;
  pinCode: string;
  groundwaterKl: string;
  surfaceWaterKl: string;
  municipalWaterKl: string;
  rainwaterKl: string;
  otherWaterKl: string;
  waterDischargedKl: string;
  dischargeSurfaceKl: string;
  dischargeGroundwaterKl: string;
  dischargeSeawaterKl: string;
  dischargeThirdpartyKl: string;
  dischargeTreatedKl: string;
  waterWithdrawalStressedKl: string;
  waterConsumptionStressedKl: string;
  zidImplemented: boolean | null;
  hazardousWasteMt: string;
  nonHazardousWasteMt: string;
  plasticWasteMt: string;
  ewasteMt: string;
  biomedicalWasteMt: string;
  otherWasteMt: string;
  wasteTotal: string;
  wasteRecycled: string;
  wasteReused: string;
  wasteComposted: string;
  wasteCoprocessed: string;
  wasteOtherRecovery: string;
  landfillMt: string;
  incinerationMt: string;
  otherDisposalMt: string;
  noxKg: string;
  soxKg: string;
  pmKg: string;
  vocKg: string;
  popKg: string;
  hapKg: string;
  otherAirKg: string;
  isDesignatedConsumer: boolean | null;
  patTargetToe: string;
  patEscerts: string;
  ghgReductionProject: boolean | null;
  ghgProjectDetails: string;
  emissionsAvoidedTco2e: string;
  wasteMgmtPractices: string;
  hazPlasticReduction: string;
  inEcoSensitiveArea: boolean | null;
  ecoSensitiveDetails: string;
  biodiversityImpact: string;
  eiaProjectName: string;
  eiaNotification: string;
  eiaExternalAgency: boolean | null;
  eiaPublicDomain: boolean | null;
  envComplaint: boolean | null;
  envNoncomplianceDetails: string;
};

export const EMPTY_SCOPE3: Record<string, string> = {
  purchased_goods_inr: "",
  capital_goods_inr: "",
  fuel_energy_inr: "",
  transport_inr: "",
  waste_inr: "",
  travel_inr: "",
  commuting_inr: "",
};

export const DEFAULT_ISF_FORM: IsfFormState = {
  scope1: "120.5",
  scope2: "85",
  revenue: "45",
  ppp: "22.882",
  outputQty: "",
  outputUnit: "units",
  scope3: {
    purchased_goods_inr: "5000000",
    capital_goods_inr: "",
    fuel_energy_inr: "",
    transport_inr: "",
    waste_inr: "",
    travel_inr: "",
    commuting_inr: "",
  },
  electricityKwh: "",
  dieselHsd: "",
  petrolMs: "",
  furnaceOil: "",
  lpg: "",
  cng: "",
  gas: "",
  solar: "10000",
  wind: "",
  biomass: "",
  pinCode: "400001",
  groundwaterKl: "",
  surfaceWaterKl: "",
  municipalWaterKl: "",
  rainwaterKl: "",
  otherWaterKl: "",
  waterDischargedKl: "",
  dischargeSurfaceKl: "",
  dischargeGroundwaterKl: "",
  dischargeSeawaterKl: "",
  dischargeThirdpartyKl: "",
  dischargeTreatedKl: "",
  waterWithdrawalStressedKl: "",
  waterConsumptionStressedKl: "",
  zidImplemented: null,
  hazardousWasteMt: "",
  nonHazardousWasteMt: "",
  plasticWasteMt: "",
  ewasteMt: "",
  biomedicalWasteMt: "",
  otherWasteMt: "",
  wasteTotal: "500",
  wasteRecycled: "200",
  wasteReused: "50",
  wasteComposted: "30",
  wasteCoprocessed: "",
  wasteOtherRecovery: "",
  landfillMt: "",
  incinerationMt: "",
  otherDisposalMt: "",
  noxKg: "",
  soxKg: "",
  pmKg: "",
  vocKg: "",
  popKg: "",
  hapKg: "",
  otherAirKg: "",
  isDesignatedConsumer: null,
  patTargetToe: "",
  patEscerts: "",
  ghgReductionProject: null,
  ghgProjectDetails: "",
  emissionsAvoidedTco2e: "",
  wasteMgmtPractices: "",
  hazPlasticReduction: "",
  inEcoSensitiveArea: null,
  ecoSensitiveDetails: "",
  biodiversityImpact: "",
  eiaProjectName: "",
  eiaNotification: "",
  eiaExternalAgency: null,
  eiaPublicDomain: null,
  envComplaint: null,
  envNoncomplianceDetails: "",
};

export type WorkbenchModuleDef = {
  id: IsfModuleId;
  label: string;
  shortLabel: string;
  icon: string;
  accent: string;
  fieldKeys: (keyof IsfFormState | string)[];
};

/** Original ISF Calculator — core intensity / spend / energy / pin / recovery. */
export const ISF_MODULES: WorkbenchModuleDef[] = [
  {
    id: "emission",
    label: "Emission intensity",
    shortLabel: "Emission",
    icon: "cloud",
    accent: "#2563EB",
    fieldKeys: ["scope1", "scope2", "revenue", "ppp"],
  },
  {
    id: "scope3",
    label: "Scope 3 spend",
    shortLabel: "Scope 3",
    icon: "truck-delivery",
    accent: "#8B5CF6",
    fieldKeys: Object.keys(EMPTY_SCOPE3),
  },
  {
    id: "energy",
    label: "Energy consumption",
    shortLabel: "Energy",
    icon: "bolt",
    accent: "#059669",
    fieldKeys: ["electricityKwh", "dieselHsd", "petrolMs", "lpg", "gas", "solar", "wind", "biomass"],
  },
  {
    id: "water",
    label: "Water stress",
    shortLabel: "Water",
    icon: "droplet",
    accent: "#0EA5E9",
    fieldKeys: ["pinCode"],
  },
  {
    id: "waste",
    label: "Waste recovery",
    shortLabel: "Waste",
    icon: "recycle",
    accent: "#D97706",
    fieldKeys: [
      "wasteTotal",
      "wasteRecycled",
      "wasteReused",
      "wasteComposted",
      "wasteCoprocessed",
      "wasteOtherRecovery",
    ],
  },
];

/** Environmental tab — Rev 2.1 gap / extra fields (ISF + Env = full isf_calculations). */
export const ENV_MODULES: WorkbenchModuleDef[] = [
  {
    id: "energy",
    label: "Extra fuels",
    shortLabel: "Fuels",
    icon: "flame",
    accent: "#059669",
    fieldKeys: ["furnaceOil", "cng"],
  },
  {
    id: "water",
    label: "Water balance",
    shortLabel: "Water",
    icon: "droplet",
    accent: "#0EA5E9",
    fieldKeys: [
      "zidImplemented",
      "groundwaterKl",
      "surfaceWaterKl",
      "municipalWaterKl",
      "rainwaterKl",
      "otherWaterKl",
      "waterDischargedKl",
      "dischargeSurfaceKl",
      "dischargeGroundwaterKl",
      "dischargeSeawaterKl",
      "dischargeThirdpartyKl",
      "dischargeTreatedKl",
      "waterWithdrawalStressedKl",
      "waterConsumptionStressedKl",
    ],
  },
  {
    id: "waste",
    label: "Waste types & disposal",
    shortLabel: "Waste",
    icon: "recycle",
    accent: "#D97706",
    fieldKeys: [
      "hazardousWasteMt",
      "nonHazardousWasteMt",
      "plasticWasteMt",
      "ewasteMt",
      "biomedicalWasteMt",
      "otherWasteMt",
      "landfillMt",
      "incinerationMt",
      "otherDisposalMt",
    ],
  },
  {
    id: "air",
    label: "Air emissions",
    shortLabel: "Air",
    icon: "wind",
    accent: "#64748B",
    fieldKeys: ["noxKg", "soxKg", "pmKg", "vocKg", "popKg", "hapKg", "otherAirKg"],
  },
  {
    id: "disclosure",
    label: "Env disclosure",
    shortLabel: "Disclosure",
    icon: "file-text",
    accent: "#0F766E",
    fieldKeys: [
      "isDesignatedConsumer",
      "patTargetToe",
      "patEscerts",
      "ghgReductionProject",
      "emissionsAvoidedTco2e",
      "ghgProjectDetails",
      "wasteMgmtPractices",
      "hazPlasticReduction",
      "inEcoSensitiveArea",
      "ecoSensitiveDetails",
      "biodiversityImpact",
      "eiaProjectName",
      "eiaNotification",
      "eiaExternalAgency",
      "eiaPublicDomain",
      "envComplaint",
      "envNoncomplianceDetails",
    ],
  },
];

export function modulesForVariant(variant: "isf" | "environmental"): WorkbenchModuleDef[] {
  return variant === "environmental" ? ENV_MODULES : ISF_MODULES;
}

const TEXT_FIELD_KEYS = new Set([
  "ghgProjectDetails",
  "wasteMgmtPractices",
  "hazPlasticReduction",
  "ecoSensitiveDetails",
  "biodiversityImpact",
  "eiaProjectName",
  "eiaNotification",
  "envNoncomplianceDetails",
  "outputUnit",
]);

/** Completion for one workbench module — uses that module's fieldKeys only. */
export function countModuleFieldProgress(
  form: IsfFormState,
  fieldKeys: (keyof IsfFormState | string)[],
): { filled: number; total: number; pct: number } {
  const total = Math.max(fieldKeys.length, 1);
  let filled = 0;
  for (const key of fieldKeys) {
    if (key in EMPTY_SCOPE3) {
      const raw = form.scope3[key] ?? "";
      if (raw.trim() !== "" && Number.isFinite(parseFloat(raw))) filled += 1;
      continue;
    }
    const v = form[key as keyof IsfFormState];
    if (typeof v === "boolean" || v === null) {
      if (v !== null) filled += 1;
      continue;
    }
    if (typeof v === "string") {
      if (key === "pinCode") {
        if (v.length === 6) filled += 1;
      } else if (TEXT_FIELD_KEYS.has(key)) {
        if (v.trim() !== "") filled += 1;
      } else if (v.trim() !== "" && Number.isFinite(parseFloat(v))) {
        filled += 1;
      }
    }
  }
  return { filled, total, pct: Math.round((filled / total) * 100) };
}
