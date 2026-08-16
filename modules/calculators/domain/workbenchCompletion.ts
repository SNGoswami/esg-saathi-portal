import type { DisclosureFieldDef, DisclosureSectionDef } from "@/modules/calculators/domain/disclosureTypes";
import { isFieldVisible } from "@/modules/calculators/domain/disclosureFormHelpers";

export type SectionCompletion = {
  filled: number;
  total: number;
  pct: number;
};

export function sectionFieldCompletion(
  section: DisclosureSectionDef,
  form: Record<string, string>,
): SectionCompletion {
  if (section.variant === "policy_matrix") {
    return { filled: 0, total: 0, pct: 0 };
  }
  const fields = (section.fields ?? []).filter((f) => isFieldVisible(f, form));
  const filled = fields.filter((f) => (form[f.api_field] ?? "").trim() !== "").length;
  const total = fields.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}

export function overallFormCompletion(
  sections: DisclosureSectionDef[],
  form: Record<string, string>,
): SectionCompletion {
  let filled = 0;
  let total = 0;
  for (const section of sections) {
    const row = sectionFieldCompletion(section, form);
    filled += row.filled;
    total += row.total;
  }
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}

export function genericSectionCompletion(
  fields: { api_field: string }[],
  form: Record<string, string>,
): SectionCompletion {
  const filled = fields.filter((f) => (form[f.api_field] ?? "").trim() !== "").length;
  const total = fields.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}

export function brsrFieldCount(fields: DisclosureFieldDef[]): number {
  return fields.filter((f) => f.brsr_ref?.trim()).length;
}

