"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const css = `
  .bam-auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    position: relative;
    overflow: hidden;
  }
  .bam-auth-page::before {
    content: "";
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(ellipse at center, rgba(124,92,255,0.12) 0%, transparent 65%);
    pointer-events: none;
  }
  .bam-auth-card {
    width: 100%;
    max-width: 420px;
    background: rgba(12,16,32,0.75);
    border: 1px solid rgba(124,92,255,0.22);
    border-radius: 20px;
    padding: 40px 36px 36px;
    backdrop-filter: blur(16px);
    box-shadow: 0 24px 60px rgba(5,7,15,0.6), 0 0 0 0.5px rgba(124,92,255,0.1);
    position: relative;
    z-index: 1;
  }
  .bam-auth-logo {
    font-family: var(--font-space), system-ui, sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(245,247,255,0.4);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 28px;
  }
  .bam-auth-logo:hover { color: rgba(245,247,255,0.7); }
  .bam-auth-heading {
    font-size: 1.6rem;
    font-weight: 700;
    color: #f5f7ff;
    line-height: 1.2;
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  .bam-auth-sub {
    font-size: 0.9rem;
    color: rgba(245,247,255,0.5);
    margin-bottom: 28px;
  }
  .bam-auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .bam-auth-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bam-auth-label {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(245,247,255,0.55);
  }
  .bam-auth-input {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(124,92,255,0.2);
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 0.95rem;
    color: #f5f7ff;
    font-family: inherit;
    width: 100%;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    outline: none;
  }
  .bam-auth-input::placeholder { color: rgba(245,247,255,0.2); }
  .bam-auth-input:hover {
    border-color: rgba(124,92,255,0.35);
    background: rgba(255,255,255,0.06);
  }
  .bam-auth-input:focus {
    border-color: rgba(124,92,255,0.6);
    background: rgba(124,92,255,0.06);
    box-shadow: 0 0 0 3px rgba(124,92,255,0.12);
  }
  .bam-auth-pw-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .bam-auth-pw-wrap .bam-auth-input {
    padding-right: 44px;
  }
  .bam-auth-pw-toggle {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: rgba(245,247,255,0.3);
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
    line-height: 1;
    flex-shrink: 0;
  }
  .bam-auth-pw-toggle:hover { color: rgba(245,247,255,0.7); }
  .bam-auth-notice {
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 0.85rem;
    background: rgba(255,184,48,0.08);
    border: 1px solid rgba(255,184,48,0.2);
    color: rgba(255,210,120,0.9);
    line-height: 1.5;
    margin-bottom: 4px;
  }
  .bam-auth-error {
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 0.85rem;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.25);
    color: rgba(255,130,130,0.95);
  }
  .bam-auth-submit {
    margin-top: 4px;
    width: 100%;
    padding: 13px 20px;
    border-radius: 999px;
    border: none;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%);
    color: #0b0f1f;
    box-shadow: 0 8px 24px rgba(0,212,255,0.28);
    transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    letter-spacing: 0.01em;
  }
  .bam-auth-submit:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(0,212,255,0.38);
  }
  .bam-auth-submit:active:not(:disabled) { transform: translateY(0); }
  .bam-auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .bam-auth-divider {
    height: 1px;
    background: rgba(124,92,255,0.12);
    margin: 22px 0 18px;
  }
  .bam-auth-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  .bam-auth-footer-link {
    font-size: 0.88rem;
    color: rgba(245,247,255,0.45);
  }
  .bam-auth-footer-link a {
    color: rgba(124,92,255,0.9);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s ease;
  }
  .bam-auth-footer-link a:hover { color: #9f82ff; }
  .bam-auth-legal {
    font-size: 0.75rem;
    color: rgba(245,247,255,0.28);
  }
  .bam-auth-legal a { color: rgba(245,247,255,0.4); text-decoration: none; }
  .bam-auth-legal a:hover { color: rgba(245,247,255,0.65); }
  @media (max-width: 480px) {
    .bam-auth-card { padding: 28px 20px 24px; border-radius: 16px; }
    .bam-auth-heading { font-size: 1.35rem; }
    .bam-auth-input { padding: 13px 14px; font-size: 1rem; }
    .bam-auth-submit { padding: 15px 20px; font-size: 1rem; }
    .bam-auth-page::before { width: 300px; height: 300px; top: -100px; }
  }
  @media (max-width: 360px) {
    .bam-auth-card { padding: 24px 16px 20px; }
  }
`;

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reason = searchParams.get("reason");
  const nextPath = searchParams.get("next") ?? "/";
  const reasonMessage = useMemo(() => {
    if (reason === "expired") return "Your session expired. Please log in again.";
    if (reason === "signin") return "Please sign in to continue.";
    return null;
  }, [reason]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!emailPattern.test(email)) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
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
    <main className="bam-auth-page">
      <style>{css}</style>
      <div className="bam-auth-card">
        <Link href="/" className="bam-auth-logo">BuyAMinute</Link>

        <h1 className="bam-auth-heading">Welcome back</h1>
        <p className="bam-auth-sub">Sign in to your account to continue.</p>

        {reasonMessage ? (
          <div className="bam-auth-notice" role="status">{reasonMessage}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="bam-auth-form" noValidate>
          <div className="bam-auth-field">
            <label className="bam-auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bam-auth-input"
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="bam-auth-field">
            <label className="bam-auth-label" htmlFor="password">Password</label>
            <div className="bam-auth-pw-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bam-auth-input"
                placeholder="••••••••"
                autoComplete="current-password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="bam-auth-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error ? <div className="bam-auth-error" role="alert">{error}</div> : null}

          <button type="submit" disabled={loading} className="bam-auth-submit">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="bam-auth-divider" />

        <div className="bam-auth-footer">
          <p className="bam-auth-footer-link">
            No account yet? <Link href="/signup">Create one</Link>
          </p>
          <p className="bam-auth-legal">
            By signing in you agree to our{" "}
            <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="bam-auth-page">
          <style>{css}</style>
          <div className="bam-auth-card">
            <Link href="/" className="bam-auth-logo">BuyAMinute</Link>
            <h1 className="bam-auth-heading">Welcome back</h1>
            <p className="bam-auth-sub">Loading…</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
