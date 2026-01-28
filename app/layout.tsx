import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AblyRealtimeProvider from "@/components/realtime/AblyRealtimeProvider";
import PresencePing from "@/components/presence/PresencePing";

export const metadata = {
  title: "BuyAMinute",
  description: "Token-based calls MVP",
};

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
            <Nav />
            {children}
          </AblyRealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
