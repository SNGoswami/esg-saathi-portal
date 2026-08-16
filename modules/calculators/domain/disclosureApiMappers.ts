function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function mapCamelInputs(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const inputs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (key === "policyMatrix") {
      inputs.policy_matrix = value;
      continue;
    }
    inputs[camelToSnake(key)] = value;
  }
  return inputs;
}

function mapCamelKpis(raw: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const kpis: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    kpis[camelToSnake(key)] = value;
  }
  return kpis;
}

export function toDisclosureApiBody(
  req: Record<string, unknown>,
  skip = new Set(["client_id", "fiscal_year", "brsr_assessment_id"]),
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    clientId: req.client_id ?? null,
    fiscalYear: req.fiscal_year,
    brsrAssessmentId: req.brsr_assessment_id ?? null,
  };
  for (const [key, value] of Object.entries(req)) {
    if (skip.has(key) || value == null) continue;
    if (key === "policy_matrix") {
      body.policyMatrix = value;
      continue;
    }
    body[snakeToCamel(key)] = value;
  }
  return body;
}

export function mapDisclosureResponse<TInputs>(
  raw: Record<string, unknown>,
): {
  id: string;
  client_id?: string;
  fiscal_year?: string;
  inputs?: TInputs;
  kpis?: Record<string, unknown>;
  updated_at?: string;
  created_at?: string;
} {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    inputs: mapCamelInputs(raw.inputs as Record<string, unknown> | undefined) as TInputs | undefined,
    kpis: mapCamelKpis(raw.kpis as Record<string, unknown> | undefined),
    updated_at: raw.updatedAt as string | undefined,
    created_at: raw.createdAt as string | undefined,
  };
}

export function mapDisclosureHistory(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    client_id: raw.clientId as string | undefined,
    client_company_name: raw.clientCompanyName as string | undefined,
    fiscal_year: raw.fiscalYear as string | undefined,
    updated_at: raw.updatedAt as string | undefined,
  };
}
