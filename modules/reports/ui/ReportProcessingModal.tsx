"use client";

import { useEffect } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";

type Phase = "processing" | "success";

export default function ReportProcessingModal({
  open,
  phase,
  onGoToReports,
  onClose,
  processingTitle = "Processing…",
  processingDesc = "Running ISF calculations and generating your analytics report.",
  successTitle = "Report generated",
  successDesc = "Your ISF analytics report is ready. View breakdowns, charts, and KPIs in Reports.",
}: {
  open: boolean;
  phase: Phase;
  onGoToReports: () => void;
  onClose: () => void;
  processingTitle?: string;
  processingDesc?: string;
  successTitle?: string;
  successDesc?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && phase === "success") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  return (
    <DashboardModalOverlay
      open={open}
      center={false}
      top
      onBackdropClick={() => {
        if (phase === "success") onClose();
      }}
    >
      <div
        className="dash-modal dash-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-processing-title"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "processing" ? (
          <>
            <div className="dash-modal__icon dash-modal__icon--spin" aria-hidden="true">
              <i className="ti ti-loader-2" />
            </div>
            <p id="report-processing-title" className="dash-modal__title">
              {processingTitle}
            </p>
            <p className="dash-modal__desc">{processingDesc}</p>
          </>
        ) : (
          <>
            <div className="dash-modal__icon dash-modal__icon--success" aria-hidden="true">
              <i className="ti ti-check" />
            </div>
            <p id="report-processing-title" className="dash-modal__title">
              {successTitle}
            </p>
            <p className="dash-modal__desc">{successDesc}</p>
            <div className="dash-modal__actions">
              <button type="button" className="btn-primary" onClick={onGoToReports}>
                Go to Reports
              </button>
              <button type="button" className="btn-ghost dash-modal__cancel" onClick={onClose}>
                Stay here
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardModalOverlay>
  );
}
