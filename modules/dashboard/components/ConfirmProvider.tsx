"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DashboardConfirmDialog,
} from "@/modules/dashboard/components/DashboardConfirmDialog";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const CONFIRM_CLOSE_MS = 220;

type ActiveConfirm = ConfirmOptions & {
  open: boolean;
  closing: boolean;
  busy: boolean;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveConfirm | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const finishClose = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setActive(null);
  }, []);

  const close = useCallback(
    (result: boolean) => {
      setActive((prev) => {
        if (!prev || prev.closing) return prev;
        if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => finishClose(result), CONFIRM_CLOSE_MS);
        return { ...prev, closing: true };
      });
    },
    [finishClose],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      resolveRef.current = resolve;
      setActive({ ...options, open: true, closing: false, busy: false });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {active ? (
        <DashboardConfirmDialog
          open={active.open}
          closing={active.closing}
          title={active.title}
          description={active.description}
          confirmLabel={active.confirmLabel}
          cancelLabel={active.cancelLabel}
          destructive={active.destructive}
          busy={active.busy}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
