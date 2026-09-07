"use client";

import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AblyRealtimeProvider from "@/components/realtime/AblyRealtimeProvider";
import PresencePing from "@/components/presence/PresencePing";
import IncomingCallListener from "@/components/realtime/IncomingCallListener";
import WhereTo from "@/components/nav/WhereTo";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AblyRealtimeProvider>
            <PresencePing />
            <IncomingCallListener />
            <WhereTo />
            <NavConditional />
            {children}
          </AblyRealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function NavConditional() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/main") return null;
  return <Nav />;
}
