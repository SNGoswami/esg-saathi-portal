"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getDefaultLayout,
  loadLayout,
  saveLayout,
  type ProLayoutConfig,
} from "@/modules/dashboard/professional/professionalDashboardLayout";
import type { RoleKey } from "@/modules/platform/rbac/roles";

const listeners = new Set<() => void>();
const layoutCache = new Map<RoleKey, ProLayoutConfig>();

function cloneLayout(layout: ProLayoutConfig): ProLayoutConfig {
  return { order: [...layout.order], hidden: [...layout.hidden] };
}

function layoutsEqual(a: ProLayoutConfig, b: ProLayoutConfig): boolean {
  if (a.order.length !== b.order.length || a.hidden.length !== b.hidden.length) return false;
  return (
    a.order.every((id, index) => id === b.order[index]) &&
    a.hidden.every((id, index) => id === b.hidden[index])
  );
}

function readCachedLayout(role: RoleKey, read: () => ProLayoutConfig): ProLayoutConfig {
  const fresh = read();
  const cached = layoutCache.get(role);
  if (cached && layoutsEqual(cached, fresh)) return cached;

  const snapshot = cloneLayout(fresh);
  layoutCache.set(role, snapshot);
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

function getClientSnapshot(role: RoleKey): ProLayoutConfig {
  return readCachedLayout(role, () => loadLayout(role));
}

function getServerSnapshot(role: RoleKey): ProLayoutConfig {
  return readCachedLayout(role, () => getDefaultLayout(role));
}

export function useProDashboardLayout(role: RoleKey) {
  const layout = useSyncExternalStore(
    subscribe,
    () => getClientSnapshot(role),
    () => getServerSnapshot(role),
  );

  const setLayout = useCallback(
    (next: ProLayoutConfig) => {
      const snapshot = cloneLayout(next);
      layoutCache.set(role, snapshot);
      saveLayout(role, snapshot);
      notifyLayoutChange();
    },
    [role],
  );

  return [layout, setLayout] as const;
}
