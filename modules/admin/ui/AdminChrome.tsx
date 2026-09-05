"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function AdminPage({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-toolbar__copy">
          <h1 className="admin-toolbar__title">{title}</h1>
          {meta ? <p className="admin-toolbar__meta">{meta}</p> : null}
        </div>
        {actions ? <div className="admin-toolbar__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminSurface({
  children,
  className,
  padded,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`admin-surface${padded ? " admin-surface--padded" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

export function AdminSegmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div className="admin-seg" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={`admin-seg__btn${value === option.id ? " is-active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type AdminMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function AdminMenu({ items, disabled, label = "More actions" }: { items: AdminMenuItem[]; disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="admin-menu" ref={ref}>
      <button
        type="button"
        className="admin-icon-btn"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="ti ti-dots" aria-hidden="true" />
      </button>
      {open ? (
        <div className="admin-menu__list" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`admin-menu__item${item.danger ? " is-danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminEmpty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="admin-empty">
      <p className="admin-empty__title">{title}</p>
      {hint ? <p className="admin-empty__hint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function initialsFromName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
