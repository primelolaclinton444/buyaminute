"use client";

import { useEffect, useMemo } from "react";
import Ably from "ably";
import { AblyProvider } from "react-ably";

export default function AblyRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(
    () =>
      new Ably.Realtime({
        authUrl: "/api/ably/auth",
      }),
    []
  );

  useEffect(() => {
    return () => {
      client.close();
    };
  }, [client]);

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
