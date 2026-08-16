"use client";

import { useTheme } from "@/context/ThemeContext";
import { Cookie, Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="public-icon-btn"
    >
      {isDark ? (
        <Sun size={17} strokeWidth={1.75} className="text-amber-400" />
      ) : (
        <Moon size={17} strokeWidth={1.75} />
      )}
    </button>
  );
}

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const btn = document.querySelector(".cky-btn-revisit") as HTMLButtonElement | null;
        btn?.click();
      }}
      className="public-footer__link footer-button"
    >
      <Cookie size={14} className="opacity-70" />
      Cookie Preferences
    </button>
  );
}
