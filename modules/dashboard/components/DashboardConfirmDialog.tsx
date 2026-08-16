"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";

export type DashboardConfirmDialogProps = {
  open: boolean;
  closing?: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DashboardConfirmDialog({
  open,
  closing = false,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: DashboardConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || closing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closing, busy, onCancel]);

  useEffect(() => {
    if (!open || closing || busy) return;
    const t = window.setTimeout(() => confirmRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, closing, busy]);

  if (!open && !closing) return null;

  const iconClass = destructive ? "ti ti-alert-triangle" : "ti ti-info-circle";

  return (
    <DashboardModalOverlay
      open={open}
      closing={closing}
      center={false}
      top
      onBackdropClick={() => {
        if (!busy && !closing) onCancel();
      }}
    >
      <div
        className={[
          "dash-modal",
          "dash-modal--confirm",
          destructive && "dash-modal--confirm-danger",
          closing && "dash-modal--closing",
        ]
          .filter(Boolean)
          .join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dash-confirm-title"
        aria-describedby={description ? "dash-confirm-desc" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-confirm__header">
          <div
            className={[
              "dash-confirm__icon",
              destructive && "dash-confirm__icon--danger",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <i className={iconClass} />
          </div>
          <div className="dash-confirm__copy">
            <p className="dash-confirm__eyebrow">Please confirm</p>
            <h2 id="dash-confirm-title" className="dash-confirm__title">
              {title}
            </h2>
            {description ? (
              <div id="dash-confirm-desc" className="dash-confirm__desc">
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="dash-confirm__close"
            aria-label="Close dialog"
            disabled={busy || closing}
            onClick={onCancel}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="dash-confirm__footer">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy || closing}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? "btn-danger btn-sm" : "btn-primary btn-sm"}
            disabled={busy || closing}
            onClick={onConfirm}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </DashboardModalOverlay>
  );
}
