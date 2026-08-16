"use client";

import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { BRAND, PILLARS, SEMANTIC, SEMANTIC_DARK, pillarFill } from "@/modules/platform/theme/tokens";

export function useCalcChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(
    () => ({
      text: isDark ? SEMANTIC_DARK.text : SEMANTIC.text,
      muted: isDark ? SEMANTIC_DARK.textMuted : SEMANTIC.textMuted,
      grid: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(10, 10, 10, 0.08)",
      bar: isDark ? BRAND[500] : BRAND[700],
      tooltipBg: isDark ? SEMANTIC_DARK.card : SEMANTIC.card,
      tooltipBorder: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(10, 10, 10, 0.08)",
      pillarFill: pillarFill(isDark),
      resolveFill: (fill: string) => {
        if (!isDark) return fill;
        const darkMap: Record<string, string> = {
          [PILLARS.environment.base]: PILLARS.environment.soft,
          [PILLARS.social.base]: PILLARS.social.soft,
          [PILLARS.governance.base]: PILLARS.governance.soft,
          "#8b5cf6": "#a78bfa",
          "#059669": BRAND[400],
          "#94a3b8": "#cbd5e1",
        };
        return darkMap[fill.toLowerCase()] ?? fill;
      },
    }),
    [isDark],
  );
}
