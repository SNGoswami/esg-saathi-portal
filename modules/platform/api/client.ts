import { fetchWithSession } from "@/modules/platform/api/sessionFetch";

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  baselineEmissionsTco2e: "Baseline emissions (tCO₂e)",
  baselineYear: "Baseline year",
  targetYear: "Target year",
  targetReductionPct: "Target reduction (%)",
  name: "Target name",
  fiscalYear: "Fiscal year",
  actualEmissionsTco2e: "Actual emissions (tCO₂e)",
  offsetCreditsTco2e: "Offset credits (tCO₂e)",
};

function validationFieldLabel(field: string): string {
  return VALIDATION_FIELD_LABELS[field] ?? field;
}

function formatValidationErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, message]) => {
      const label = validationFieldLabel(field);
      return message.toLowerCase().includes(label.toLowerCase())
        ? message
        : `${label}: ${message}`;
    })
    .join(" ");
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetchWithSession(endpoint, options);

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = {};

  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {}

  if (!response.ok) {
    const err = data as { errors?: Record<string, string>; message?: string };
    if (err.errors && typeof err.errors === "object") {
      const fieldErrors = Object.fromEntries(
        Object.entries(err.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
      if (Object.keys(fieldErrors).length > 0) {
        throw new Error(formatValidationErrors(fieldErrors));
      }
    }
    const fallback =
      response.status === 429
        ? "Rate limit exceeded. Please wait and try again."
        : `Request failed (${response.status})`;
    throw new Error(err.message || fallback);
  }

  return data as T;
}