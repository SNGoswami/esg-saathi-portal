"use client";

import { useState } from "react";
import { inputClass } from "./constants";
import { EyeIcon, EyeOffIcon } from "./icons";

interface Props {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  error?: string;
  autoComplete?: string;
  hint?: string;
}

export default function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  error,
  autoComplete,
  hint,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            {icon}
          </span>
        )}

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${icon ? "pl-12" : ""} ${
            isPassword ? "pr-12" : ""
          } ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : ""}`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {hint && !error && (
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
