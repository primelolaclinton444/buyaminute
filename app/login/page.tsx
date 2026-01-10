"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reason = searchParams.get("reason");
  const nextPath = searchParams.get("next") ?? "/";
  const reasonMessage = useMemo(() => {
    if (reason === "expired") {
      return "Your session expired. Please log in again.";
    }
    if (reason === "signin") {
      return "Please sign in to continue.";
    }
    return null;
  }, [reason]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      router.replace(nextPath);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
      <h1>Log in</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Access your BuyAMinute account.
      </p>

      {reasonMessage ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff4e5",
            borderRadius: 8,
          }}
        >
          {reasonMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6 }}
            placeholder="you@email.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6 }}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </label>

        {error ? <p style={{ color: "#d45" }}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Need an account? <Link href="/signup">Create one</Link>.
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
        By signing in you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
          <h1>Log in</h1>
          <p style={{ marginTop: 8, color: "#666" }}>Loading sign-in form…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
