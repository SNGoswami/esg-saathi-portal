import type { DisclosureFieldDef } from "@/modules/calculators/domain/disclosureTypes";

export function fieldLabel(field: DisclosureFieldDef): string {
  if (field.unit === "%" || field.unit === "—") return field.field_name;
  if (field.unit === "INR Lakhs") return `${field.field_name} (₹ Lakhs)`;
  if (field.unit === "INR") return `${field.field_name} (₹)`;
  if (field.unit === "days") return `${field.field_name} (days)`;
  if (field.unit === "hours") return `${field.field_name} (hours)`;
  if (field.unit === "count") return field.field_name;
  return field.field_name;
}

export function isFieldVisible(
  field: DisclosureFieldDef,
  form: Record<string, string>,
): boolean {
  if (!field.visibleWhen) return true;
  return form[field.visibleWhen.field] === field.visibleWhen.equals;
}

export function yesNoOptions() {
  return [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
}

export function parseBoolForm(v: string | undefined): boolean | undefined {
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

export function boolToForm(v?: boolean | null): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}
