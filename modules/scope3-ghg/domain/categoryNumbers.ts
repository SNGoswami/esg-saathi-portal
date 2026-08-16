/** GHG Protocol Scope 3, always 15 categories; pills render without waiting on /factors. */
export const SCOPE3_CATEGORY_COUNT = 15;

export const SCOPE3_CATEGORY_NUMBERS: number[] = Array.from(
  { length: SCOPE3_CATEGORY_COUNT },
  (_, i) => i + 1,
);
