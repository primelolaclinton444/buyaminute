"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import styles from "./call.module.css";

export default function CallHubPage() {
  const router = useRouter();
  const [targetUsername, setTargetUsername] = useState("");

  function handleManualRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = targetUsername.trim();
    if (!trimmed) return;
    router.push(`/call/request/${encodeURIComponent(trimmed)}`);
  }

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Calls</p>
            <h1>Manage your call flow</h1>
            <p className={styles.subtitle}>
              Request calls, handle incoming pings, and track live sessions with the
              same streamlined shell.
            </p>
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Start a request</h2>
                <p className={styles.subtitle}>
                  Choose a receiver, select voice or video, and send a paid request.
                </p>
              </div>
              <Link className={styles.button} href="/browse">
                Find a receiver
              </Link>
            </div>
            <form className={styles.row} onSubmit={handleManualRequest}>
              <label>
                Target username
                <input
                  className={styles.input}
                  type="text"
                  value={targetUsername}
                  onChange={(event) => setTargetUsername(event.target.value)}
                  placeholder="Enter username or handle"
                  aria-label="Target username"
                />
              </label>
              <button className={styles.button} type="submit" disabled={!targetUsername.trim()}>
                Request this user
              </button>
            </form>
            <div className={styles.grid}>
              <div>
                <h3>Request states</h3>
                <p className={styles.subtitle}>
                  Track pending, timed out, or unavailable responses while keeping
                  the caller informed.
                </p>
              </div>
              <div>
                <h3>Realtime hints</h3>
                <p className={styles.subtitle}>
                  See balance and availability checks before sending payment.
                </p>
              </div>
              <div>
                <h3>Accessibility-first</h3>
                <p className={styles.subtitle}>
                  Keyboard-ready tabs, focus rings, and reduced motion support.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Incoming requests</h2>
                <p className={styles.subtitle}>
                  Review caller intent and accept or decline within the countdown
                  window.
                </p>
              </div>
              <Link className={styles.button} href="/call/incoming">
                View incoming
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
