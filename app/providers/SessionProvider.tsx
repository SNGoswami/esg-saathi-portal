"use client";

import { useEffect } from "react";
import { getClientApiUrl } from "@/modules/platform/api/constants";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {

    let interval: NodeJS.Timeout;
    let debounceTimer: NodeJS.Timeout;

    const pingServer = async () => {
      try {
        await fetch(
          `${getClientApiUrl()}/api/auth/keepalive`,
          {
            credentials: "include",
          }
        );
      } catch (err) {
        console.error(err);
      }
    };

    const startHeartbeat = () => {
      clearInterval(interval);
      interval = setInterval(
        pingServer,
        1000 * 60 * 5
      );
    };

    // FIX: debounce activity events so the interval is not reset on every
    // mousemove/keydown/click (which fires hundreds of times per second).
    const onActivity = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(startHeartbeat, 500);
    };

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);

    // Defer first keepalive so it does not compete with dashboard auth/API on load.
    const initialDelay = setTimeout(startHeartbeat, 15_000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      clearTimeout(debounceTimer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };

  }, []);

  return children;
}
