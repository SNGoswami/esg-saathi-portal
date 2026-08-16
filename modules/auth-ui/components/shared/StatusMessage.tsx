"use client";

import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";

export function ErrorMessage({ message }: { message?: string }) {
  useToastOnValue(message, "error");
  return null;
}

export function SuccessMessage({ message }: { message?: string }) {
  useToastOnValue(message, "success");
  return null;
}
