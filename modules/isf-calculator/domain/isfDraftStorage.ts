import type { IsfFormState } from "@/modules/isf-calculator/domain/isfFormState";
import type { IsfModuleId } from "@/modules/isf-calculator/domain/isfFormState";

export type IsfDraftPayload = {
  form: IsfFormState;
  activeModule: IsfModuleId;
  fiscalYear: string;
  savedAt: string;
};

function draftKey(
  clientId: string | null,
  fiscalYear: string,
  variant: "isf" | "environmental" = "isf",
) {
  const ns = variant === "environmental" ? "env" : "isf";
  return `esg-${ns}-draft:${clientId ?? "msme"}:${fiscalYear}`;
}

export function readIsfDraft(
  clientId: string | null,
  fiscalYear: string,
  variant: "isf" | "environmental" = "isf",
): IsfDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftKey(clientId, fiscalYear, variant));
    if (!raw) return null;
    return JSON.parse(raw) as IsfDraftPayload;
  } catch {
    return null;
  }
}

export function writeIsfDraft(
  clientId: string | null,
  fiscalYear: string,
  payload: Omit<IsfDraftPayload, "savedAt">,
  variant: "isf" | "environmental" = "isf",
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      draftKey(clientId, fiscalYear, variant),
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota */
  }
}

export function clearIsfDraft(
  clientId: string | null,
  fiscalYear: string,
  variant: "isf" | "environmental" = "isf",
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(draftKey(clientId, fiscalYear, variant));
  } catch {
    /* ignore */
  }
}
