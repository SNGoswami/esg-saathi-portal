/** Brand & ESG pillar palette, keep in sync with app/globals.css */
export const BRAND = {
  900: "#003d2a",
  800: "#004d34",
  700: "#006c49",
  600: "#0b8a5a",
  500: "#10b981",
  400: "#34d399",
} as const;

export const PILLARS = {
  environment: { base: "#006c49", soft: "#10b981" },
  social: { base: "#2563eb", soft: "#60a5fa" },
  governance: { base: "#ea580c", soft: "#fb923c" },
} as const;

export const SEMANTIC = {
  text: "#0a0a0a",
  textMuted: "#454545",
  surface: "#fafafa",
  card: "#ffffff",
  error: "#e24b4a",
} as const;

export const SEMANTIC_DARK = {
  text: "#fafafa",
  textMuted: "#a3a3a3",
  surface: "#0a0a0a",
  card: "#141414",
} as const;

export function pillarFill(isDark: boolean) {
  return {
    Environmental: isDark ? PILLARS.environment.soft : PILLARS.environment.base,
    Social: isDark ? PILLARS.social.soft : PILLARS.social.base,
    Governance: isDark ? PILLARS.governance.soft : PILLARS.governance.base,
  } as Record<string, string>;
}
