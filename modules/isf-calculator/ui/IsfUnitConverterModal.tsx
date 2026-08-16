"use client";

import { useEffect, useRef, useState } from "react";
import { convertIsfUnit } from "@/modules/isf-calculator/api/isfApi";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";

function fmt4(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

const CONV_KINDS = [
  { id: "energy" as const, label: "Energy" },
  { id: "water" as const, label: "Water" },
  { id: "waste" as const, label: "Waste" },
];

export default function IsfUnitConverterModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [convKind, setConvKind] = useState<"energy" | "water" | "waste">("energy");
  const [convValue, setConvValue] = useState("100");
  const [convFrom, setConvFrom] = useState("kWh");
  const [convTo, setConvTo] = useState("GJ");
  const [convResult, setConvResult] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    const v = parseFloat(convValue);
    if (!Number.isFinite(v)) {
      timer.current = setTimeout(() => setConvResult(null), 0);
      return;
    }
    timer.current = setTimeout(() => {
      void convertIsfUnit(convKind, v, convFrom, convTo)
        .then((r) => setConvResult(r.value))
        .catch(() => setConvResult(null));
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, convValue, convFrom, convTo, convKind]);

  function selectKind(k: "energy" | "water" | "waste") {
    setConvKind(k);
    if (k === "energy") {
      setConvFrom("kWh");
      setConvTo("GJ");
    } else if (k === "water") {
      setConvFrom("Litres");
      setConvTo("KL");
    } else {
      setConvFrom("kg");
      setConvTo("MT");
    }
  }

  return (
    <DashboardModalOverlay open={open} center={false} top onBackdropClick={onClose}>
      <div
        className="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="isf-converter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-admin-reply__head">
          <div>
            <p id="isf-converter-title" className="dash-modal__title">
              Unit converter
            </p>
            <p className="dash-modal__desc">
              Convert energy, water, and waste units while filling ISF inputs.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="calc-workspace-tabs" role="tablist" style={{ marginTop: "1rem" }}>
          {CONV_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={convKind === k.id}
              className={`calc-workspace-tabs__btn${convKind === k.id ? " calc-workspace-tabs__btn--active" : ""}`}
              onClick={() => selectKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="calc-form-grid" style={{ marginTop: "1rem" }}>
          <label className="calc-field">
            <span className="calc-field__label">Value</span>
            <input
              className="dash-input"
              type="number"
              value={convValue}
              onChange={(e) => setConvValue(e.target.value)}
            />
          </label>
          <label className="calc-field">
            <span className="calc-field__label">From</span>
            <input className="dash-input" value={convFrom} onChange={(e) => setConvFrom(e.target.value)} />
          </label>
          <label className="calc-field">
            <span className="calc-field__label">To</span>
            <input className="dash-input" value={convTo} onChange={(e) => setConvTo(e.target.value)} />
          </label>
          <div className="isf-metric-card">
            <p className="isf-metric-card__label">Converted</p>
            <p className="isf-metric-card__value">{convResult != null ? fmt4(convResult) : "-"}</p>
          </div>
        </div>

        <button type="button" className="btn-ghost dash-modal__cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </DashboardModalOverlay>
  );
}
