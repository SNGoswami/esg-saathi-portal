"use client";

import type { IsfFormState, IsfModuleId } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfLivePreview } from "@/modules/isf-calculator/domain/isfLivePreview";
import type { IsfCalculationResponse } from "@/modules/isf-calculator/domain/types";
import type { useCalcChartTheme } from "@/modules/calculators/ui/chartTheme";
import { AirEmissionsModule } from "./modules/AirEmissionsModule";
import { EmissionModule } from "./modules/EmissionModule";
import { EnergyModule } from "./modules/EnergyModule";
import { EnvDisclosureModule } from "./modules/EnvDisclosureModule";
import { Scope3SpendModule, SCOPE3_FIELDS } from "./modules/Scope3SpendModule";
import { WasteModule } from "./modules/WasteModule";
import { WaterModule } from "./modules/WaterModule";

export { SCOPE3_FIELDS };

export function IsfModulePanel({
  moduleId,
  form,
  preview,
  result,
  chartTheme,
  onChange,
  onOpenConverter,
  readOnly = false,
  fieldScope = "isf",
}: {
  moduleId: IsfModuleId;
  form: IsfFormState;
  preview: IsfLivePreview;
  result: IsfCalculationResponse | null;
  chartTheme: ReturnType<typeof useCalcChartTheme>;
  onChange: React.Dispatch<React.SetStateAction<IsfFormState>>;
  onOpenConverter: () => void;
  readOnly?: boolean;
  fieldScope?: "isf" | "environmental";
}) {
  switch (moduleId) {
    case "emission":
      return <EmissionModule form={form} preview={preview} onChange={onChange} readOnly={readOnly} />;
    case "scope3":
      return (
        <Scope3SpendModule
          form={form}
          preview={preview}
          chartTheme={chartTheme}
          onChange={onChange}
          readOnly={readOnly}
        />
      );
    case "energy":
      return (
        <EnergyModule
          form={form}
          preview={preview}
          chartTheme={chartTheme}
          onChange={onChange}
          onOpenConverter={onOpenConverter}
          readOnly={readOnly}
          fieldScope={fieldScope}
        />
      );
    case "water":
      return (
        <WaterModule
          form={form}
          preview={preview}
          result={result}
          onChange={onChange}
          readOnly={readOnly}
          fieldScope={fieldScope}
        />
      );
    case "waste":
      return (
        <WasteModule
          form={form}
          preview={preview}
          chartTheme={chartTheme}
          onChange={onChange}
          onOpenConverter={onOpenConverter}
          readOnly={readOnly}
          fieldScope={fieldScope}
        />
      );
    case "air":
      return <AirEmissionsModule form={form} onChange={onChange} readOnly={readOnly} />;
    case "disclosure":
      return <EnvDisclosureModule form={form} onChange={onChange} readOnly={readOnly} />;
    default:
      return null;
  }
}
