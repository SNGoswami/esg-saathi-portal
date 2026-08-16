"use client";

import { useEffect } from "react";

type AppShellMarkerProps = {
  /** Dashboard shell uses a fixed topbar — shifts toasts/modals below it. */
  variant: "dashboard";
};

export default function AppShellMarker({ variant }: AppShellMarkerProps) {
  useEffect(() => {
    const className = `app-shell--${variant}`;
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [variant]);

  return null;
}
