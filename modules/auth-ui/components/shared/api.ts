import { fetchForAuthAction } from "@/modules/platform/api/sessionFetch";

/** Auth forms, never reuse a stale session; no refresh redirect on failure. */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  config: { clearSession?: boolean } = {},
): Promise<T> {
  const response = await fetchForAuthAction(endpoint, options, config);

  let data: unknown = {};
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    /* empty body */
  }

  if (!response.ok) {
    const err = data as { errors?: Record<string, string>; message?: string };
    if (err.errors && typeof err.errors === "object") {
      const parts = Object.values(err.errors).filter((v) => typeof v === "string");
      if (parts.length > 0) {
        throw new Error(parts.join(" "));
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

export const validateEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Password validation:
 * - 8–128 characters
 * - At least one letter and one digit
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const validatePassword = (value: string): string | null => {
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 128) return "Password must be under 128 characters";
  if (!/[A-Za-z]/.test(value)) return "Password must contain at least one letter";
  if (!/\d/.test(value)) return "Password must contain at least one digit";
  return null;
};
