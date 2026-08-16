"use client";

import { useCallback, useRef, useState } from "react";

const SCROLL_EDGE_PX = 80;
const SCROLL_STEP_PX = 12;

function getScrollContainer(): HTMLElement | null {
  return document.querySelector(".dash-main");
}

export function useDashboardWidgetDrag<T extends string>() {
  const [dragId, setDragId] = useState<T | null>(null);
  const dragIdRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerYRef = useRef(0);

  const stopAutoScroll = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const onDragStart = useCallback((id: T, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    dragIdRef.current = id;
    setDragId(id);
  }, []);

  const onDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragId(null);
    stopAutoScroll();
  }, [stopAutoScroll]);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      pointerYRef.current = e.clientY;
      if (rafRef.current != null || dragIdRef.current == null) return;

      const tick = () => {
        const container = getScrollContainer();
        if (!container || dragIdRef.current == null) {
          rafRef.current = null;
          return;
        }

        const rect = container.getBoundingClientRect();
        const y = pointerYRef.current;

        if (y < rect.top + SCROLL_EDGE_PX) {
          container.scrollTop -= SCROLL_STEP_PX;
        } else if (y > rect.bottom - SCROLL_EDGE_PX) {
          container.scrollTop += SCROLL_STEP_PX;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  return { dragId, onDragStart, onDragEnd, onDragOver };
}
