export type RatioResult = {
  value: number | null;
  status: "OK" | "NOT_APPLICABLE" | null;
};

export function safeDivide(numerator?: number | null, denominator?: number | null): RatioResult {
  if (numerator == null || denominator == null) return { value: null, status: null };
  if (denominator === 0) return { value: null, status: "NOT_APPLICABLE" };
  return { value: numerator / denominator, status: "OK" };
}

export function safePct(numerator?: number | null, denominator?: number | null): RatioResult {
  const r = safeDivide(numerator, denominator);
  if (r.status === "OK" && r.value != null) {
    return { value: r.value * 100, status: "OK" };
  }
  return r;
}

export function countPolicyFlag(
  matrix: { policy_exists?: boolean; board_approved?: boolean; grievance_mechanism?: boolean }[] | undefined,
  key: "policy_exists" | "board_approved" | "grievance_mechanism",
): string {
  const total = 9;
  const count = (matrix ?? []).filter((r) => r[key] === true).length;
  return `${count}/${total}`;
}
