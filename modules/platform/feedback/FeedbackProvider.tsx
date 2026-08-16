"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "@/modules/dashboard/components/ConfirmProvider";
import { ToastProvider } from "@/modules/dashboard/components/ToastProvider";

/** Site-wide toast + confirm dialogs (portaled to document.body). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
