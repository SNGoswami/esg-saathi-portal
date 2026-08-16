"use client";

import type { HTMLAttributes } from "react";
import { CalculatorField } from "@/modules/calculators/ui/CalculatorLayout";
import type { DisclosureFieldDef } from "@/modules/calculators/domain/disclosureTypes";
import { fieldLabel } from "@/modules/calculators/domain/disclosureFormHelpers";

function fieldStep(field: DisclosureFieldDef): string {
  if (field.step) return field.step;
  if (field.input_type === "percent") return "0.01";
  if (field.input_type === "number_decimal") return "0.1";
  if (field.integer) return "1";
  return "any";
}

function fieldInputMode(field: DisclosureFieldDef): HTMLAttributes<HTMLInputElement>["inputMode"] {
  if (field.input_type === "percent" || field.input_type === "number_decimal") return "decimal";
  if (field.input_type === "number") return "numeric";
  return undefined;
}

function fieldClassName(field: DisclosureFieldDef): string | undefined {
  if (field.input_type === "text_long") return "calc-field--full";
  return undefined;
}

export function DisclosureFieldInput({
  field,
  value,
  onChange,
  disabled = false,
}: {
  field: DisclosureFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const label = fieldLabel(field);
  const maxLen = field.maxLength ?? 2000;

  if (field.input_type === "boolean_dropdown") {
    return (
      <CalculatorField label={label} className={fieldClassName(field)}>
        <select
          className="dash-input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        {field.hint && <span className="calc-field__hint">{field.hint}</span>}
      </CalculatorField>
    );
  }

  if (field.input_type === "dropdown" && field.options) {
    return (
      <CalculatorField label={label} className={fieldClassName(field)}>
        <select
          className="dash-input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.hint && <span className="calc-field__hint">{field.hint}</span>}
      </CalculatorField>
    );
  }

  if (field.input_type === "text_long") {
    return (
      <CalculatorField label={label} className="calc-field--full">
        <textarea
          className="dash-input dash-input--textarea"
          rows={4}
          maxLength={maxLen}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter details…"
        />
        <span className="disclosure-char-count" aria-live="polite">
          {value.length.toLocaleString()} / {maxLen.toLocaleString()}
        </span>
        {field.hint && <span className="calc-field__hint">{field.hint}</span>}
      </CalculatorField>
    );
  }

  return (
    <CalculatorField label={label} className={fieldClassName(field)}>
      <input
        className="dash-input"
        type={field.input_type === "text_url" ? "url" : "number"}
        inputMode={field.input_type === "text_url" ? undefined : fieldInputMode(field)}
        step={field.input_type === "text_url" ? undefined : fieldStep(field)}
        min={field.input_type === "text_url" ? undefined : 0}
        max={field.input_type === "percent" ? 100 : undefined}
        maxLength={field.input_type === "text_url" ? 500 : undefined}
        value={value}
        readOnly={field.readOnly || disabled}
        disabled={disabled && field.input_type !== "text_url" ? disabled : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.input_type === "text_url" ? "https://" : undefined}
      />
      {field.hint && <span className="calc-field__hint">{field.hint}</span>}
    </CalculatorField>
  );
}
