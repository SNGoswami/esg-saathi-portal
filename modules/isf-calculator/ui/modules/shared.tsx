"use client";

export function NumField({
  label,
  value,
  onChange,
  hint,
  onOpenConverter,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  onOpenConverter?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="calc-field">
      <span className="calc-field__label">
        {label}
        {onOpenConverter && !disabled && (
          <button type="button" className="isf-field-convert-btn" onClick={onOpenConverter}>
            Convert
          </button>
        )}
      </span>
      <input
        className="dash-input"
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="isf-field-hint">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  rows = 3,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="calc-field">
      <span className="calc-field__label">{label}</span>
      <textarea
        className="dash-input"
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function BoolField({
  label,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="calc-field">
      <span className="calc-field__label">{label}</span>
      <select
        className="dash-input"
        value={value == null ? "" : value ? "yes" : "no"}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : v === "yes");
        }}
      >
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
      {hint && <span className="isf-field-hint">{hint}</span>}
    </label>
  );
}

export function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="isf-insight-card card">
      <p className="isf-insight-card__title">{title}</p>
      <div className="isf-insight-card__body">{children}</div>
    </aside>
  );
}

export function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="isf-metric-card">
      <p className="isf-metric-card__label">{label}</p>
      <p className="isf-metric-card__value">{value}</p>
      {hint && <p className="isf-metric-card__hint">{hint}</p>}
    </div>
  );
}

export function fmt4(n?: number | null, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}
