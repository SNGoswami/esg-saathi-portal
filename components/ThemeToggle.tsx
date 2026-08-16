"use client";

import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";

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
