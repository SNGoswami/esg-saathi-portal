"use client";

import { useEffect } from "react";
import { useToast, type ToastVariant } from "@/modules/dashboard/components/ToastProvider";

/** Show a toast whenever `message` becomes a non-empty string. */
export function useToastOnValue(message: string | undefined | null, variant: ToastVariant = "error") {
  const toast = useToast();

  useEffect(() => {
    const text = message?.trim();
    if (!text) return;
    toast.show(text, variant);
  }, [message, variant, toast]);
}
