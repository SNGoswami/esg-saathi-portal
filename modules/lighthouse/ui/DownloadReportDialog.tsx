"use client";

import { useEffect, useRef } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";

export type DownloadFormat = "pdf" | "xbrl";

export default function DownloadReportDialog({
  open,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (format: DownloadFormat) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <DashboardModalOverlay
      open={open}
      center={false}
      top
      onBackdropClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dash-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="download-report-title" className="dash-modal__title">
          Download report
        </p>
        <p className="dash-modal__desc">
          Choose a format for your Lighthouse ESG assessment report.
        </p>

        <div className="dash-modal__actions">
          <button
            type="button"
            className="dash-modal__option dash-modal__option--pdf"
            disabled={busy}
            onClick={() => onSelect("pdf")}
          >
            <i className="ti ti-file-type-pdf" aria-hidden="true" />
            <span>
              <strong>Download as PDF</strong>
              <small>Professional PDF from your saved assessment (API data)</small>
            </span>
          </button>
          <button
            type="button"
            className="dash-modal__option dash-modal__option--xbrl"
            disabled={busy}
            onClick={() => onSelect("xbrl")}
          >
            <i className="ti ti-file-code" aria-hidden="true" />
            <span>
              <strong>Download as XBRL</strong>
              <small>Structured ESG facts (XML)</small>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="btn-ghost dash-modal__cancel"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>

        {busy && (
          <p className="dash-modal__busy" role="status">
            Preparing download…
          </p>
        )}
      </div>
    </DashboardModalOverlay>
  );
}
