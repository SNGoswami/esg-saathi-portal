"use client";

import { useSyncExternalStore } from "react";

function getDashMainElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".dash-main");
}

/** Resolves `.dash-main` for portaling dashboard chrome without a setState effect. */
export function useDashMainPortalRoot(): HTMLElement | null {
  return useSyncExternalStore(
    () => () => {},
    getDashMainElement,
    () => null,
  );
}
