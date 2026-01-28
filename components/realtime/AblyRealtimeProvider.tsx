"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Ably from "ably";

type AblyCtx = { client: Ably.Realtime | null };
const AblyContext = createContext<AblyCtx>({ client: null });

export function useAbly() {
  return useContext(AblyContext);
}

export default function AblyRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    const ablyClient = new Ably.Realtime({
      authUrl: "/api/ably/auth",
      autoConnect: true,
    });

    setClient(ablyClient);

    return () => {
      try {
        ablyClient.close();
      } catch {}
    };
  }, []);

  const value = useMemo(() => ({ client }), [client]);

  return <AblyContext.Provider value={value}>{children}</AblyContext.Provider>;
}
