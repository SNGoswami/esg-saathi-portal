"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4200;
const TOAST_EXIT_MS = 240;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const timersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    const existing = timersRef.current.get(id);
    if (existing) {
      window.clearTimeout(existing);
      timersRef.current.delete(id);
    }

    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || target.exiting) return prev;
      return prev.map((t) => (t.id === id ? { ...t, exiting: true } : t));
    });

    const exitTimer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, TOAST_EXIT_MS);
    timersRef.current.set(id, exitTimer);
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const text = message.trim();
      if (!text) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message: text, variant }]);
      const autoTimer = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timersRef.current.set(id, autoTimer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
      info: (message) => show(message, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="dash-toast-stack" aria-live="polite" aria-relevant="additions">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={[
                  "dash-toast",
                  `dash-toast--${t.variant}`,
                  t.exiting && "dash-toast--exiting",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="status"
              >
                <span className="dash-toast__icon" aria-hidden="true">
                  <i
                    className={
                      t.variant === "success"
                        ? "ti ti-circle-check"
                        : t.variant === "error"
                          ? "ti ti-alert-circle"
                          : "ti ti-info-circle"
                    }
                  />
                </span>
                <span className="dash-toast__message">{t.message}</span>
                <button
                  type="button"
                  className="dash-toast__dismiss"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(t.id)}
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
                {!t.exiting && (
                  <span
                    className="dash-toast__progress"
                    style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
