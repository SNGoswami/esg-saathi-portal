"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getDefaultMsmeLayout,
  loadMsmeLayout,
  saveMsmeLayout,
  type MsmeLayoutConfig,
} from "@/modules/dashboard/msme/msmeDashboardLayout";

const listeners = new Set<() => void>();
const layoutCache: { current: MsmeLayoutConfig | null } = { current: null };

function cloneLayout(layout: MsmeLayoutConfig): MsmeLayoutConfig {
  return { order: [...layout.order], hidden: [...layout.hidden] };
}

function layoutsEqual(a: MsmeLayoutConfig, b: MsmeLayoutConfig): boolean {
  if (a.order.length !== b.order.length || a.hidden.length !== b.hidden.length) return false;
  return (
    a.order.every((id, index) => id === b.order[index]) &&
    a.hidden.every((id, index) => id === b.hidden[index])
  );
}

function readCachedLayout(read: () => MsmeLayoutConfig): MsmeLayoutConfig {
  const fresh = read();
  if (layoutCache.current && layoutsEqual(layoutCache.current, fresh)) {
    return layoutCache.current;
  }

  const snapshot = cloneLayout(fresh);
  layoutCache.current = snapshot;
  return snapshot;
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function notifyLayoutChange() {
  listeners.forEach((listener) => listener());
}

export function useMsmeDashboardLayout() {
  const layout = useSyncExternalStore(
    subscribe,
    () => readCachedLayout(loadMsmeLayout),
    () => readCachedLayout(getDefaultMsmeLayout),
  );

  const setLayout = useCallback((next: MsmeLayoutConfig) => {
    const snapshot = cloneLayout(next);
    layoutCache.current = snapshot;
    saveMsmeLayout(snapshot);
    notifyLayoutChange();
  }, []);

  return [layout, setLayout] as const;
}
