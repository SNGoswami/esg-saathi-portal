"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DashboardModalOverlayProps = {
  open: boolean;
  children: ReactNode;
  /** Play exit animation before unmount */
  closing?: boolean;
  /** Click backdrop to dismiss */
  onBackdropClick?: () => void;
  /** Vertically center the dialog (default) */
  center?: boolean;
  /** Anchor below topbar */
  top?: boolean;
};

/**
 * Full-viewport modal backdrop portaled to document.body so it is not clipped
 * by dash-shell overflow or stacking contexts.
 */
export function DashboardModalOverlay({
  open,
  children,
  closing = false,
  onBackdropClick,
  center = true,
  top = false,
}: DashboardModalOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if ((!open && !closing) || typeof document === "undefined") return null;

  const classes = [
    "dash-modal-overlay",
    center && "dash-modal-overlay--center",
    top && "dash-modal-overlay--top",
    closing && "dash-modal-overlay--closing",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={classes} role="presentation" onClick={closing ? undefined : onBackdropClick}>
      {children}
    </div>,
    document.body,
  );
}
