"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { status, expired, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const reason = expired ? "expired" : "signin";
      const next = pathname ? `&next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login?reason=${reason}${next}`);
    }
  }, [status, expired, pathname, router]);

  if (status === "loading") {
    return (
      <main style={{ padding: 32 }}>
        <h1>Loading session…</h1>
        <p>Checking your account details.</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main style={{ padding: 32 }}>
        <h1>{expired ? "Session expired" : "Sign in required"}</h1>
        <p>
          {expired
            ? "Please log back in to continue."
            : "You need to sign in to access this page."}
        </p>
        {error ? <p style={{ color: "#d45" }}>{error}</p> : null}
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
