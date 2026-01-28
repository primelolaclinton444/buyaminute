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

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [status, session?.user?.id]);

  return null;
}
