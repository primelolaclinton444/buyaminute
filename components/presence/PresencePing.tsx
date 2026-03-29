"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const PRESENCE_PING_INTERVAL_MS = 20000;

export default function PresencePing() {
  const { status, session } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    let isMounted = true;
    const ping = async () => {
      try {
        await fetch("/api/presence/ping", { method: "POST" });
      } catch {}
    };

    void ping();
    const interval = window.setInterval(() => {
      if (!isMounted) return;
      void ping();
    }, PRESENCE_PING_INTERVAL_MS);

    // FIX: browsers throttle setInterval on background/hidden tabs to 1+ minute
    // intervals. During a long call where the receiver's tab is backgrounded,
    // lastSeenAt can drift past the 5-minute presence window, making them appear
    // offline. Re-ping immediately whenever the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted) {
        void ping();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, session?.user?.id]);

  return null;
}
