"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const fieldClass =
  "w-full rounded-[12px] px-[14px] py-[13px] text-[14px] outline-none " +
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "text-[var(--color-text)] " +
  "transition-all duration-200 " +
  "focus:border-[var(--brand-500)] focus:ring-[3px] focus:ring-[var(--brand-focus-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string, option?: Option) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  emptyMessage?: string;
}

export default function SearchableSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Search or select…",
  disabled = false,
  error,
  emptyMessage = "No matches found",
}: SearchableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const panelOpen = !disabled && open;
  const displayQuery = disabled ? "" : query;

  function handleSelect(option: Option) {
    onChange(option.value, option);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <div className="relative">
        <input
          type="text"
          value={panelOpen ? displayQuery : selectedLabel}
          disabled={disabled}
          placeholder={disabled ? "Select state first" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery("");
            }
          }}
          className={`${fieldClass} pr-10 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : ""}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {panelOpen && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-lg"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{emptyMessage}</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleSelect(option)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--brand-tint-08)] ${
                    value === option.value
                      ? "bg-[rgba(0,108,73,0.1)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-text)]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
