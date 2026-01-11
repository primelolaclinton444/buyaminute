"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import styles from "../../call.module.css";

const modeOptions = [
  { id: "voice", label: "Voice" },
  { id: "video", label: "Video" },
] as const;

type Mode = (typeof modeOptions)[number]["id"];

type RequestState =
  | "idle"
  | "pending"
  | "timeout"
  | "insufficient"
  | "offline"
  | "accepted";

export default function CallRequestPage() {
  const { username } = useParams<{ username: string }>();
  const [mode, setMode] = useState<Mode>("voice");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [intendedMinutes, setIntendedMinutes] = useState<number>(5);

  const statusTone = useMemo(() => {
    if (requestState === "accepted") return "success";
    if (requestState === "insufficient" || requestState === "offline") return "danger";
    if (requestState === "pending" || requestState === "timeout") return "warning";
    return undefined;
  }, [requestState]);

  const statusCopy = useMemo(() => {
    switch (requestState) {
      case "pending":
        return {
          title: "Request sent",
          body: `Waiting for @${username} to accept. ${secondsLeft}s left in the window.`,
        };
      case "timeout":
        return {
          title: "Request expired",
          body: "No response in time. Try again or send an availability ping.",
        };
      case "insufficient":
        return {
          title: "Top up required",
          body: "Your balance is too low for this rate. Add funds to continue.",
        };
      case "offline":
        return {
          title: "Receiver offline",
          body: "They are not accepting calls right now. Check again later.",
        };
      case "accepted":
        return {
          title: "Request accepted",
          body: "Connecting you now. You will enter the preview momentarily.",
        };
      default:
        return {
          title: "Ready to request",
          body: "Select voice or video, confirm the rate, and send a request.",
        };
    }
  }, [requestState, secondsLeft, username]);

  useEffect(() => {
    if (requestState !== "pending") return;
    if (secondsLeft <= 0) {
      setRequestState("timeout");
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [requestState, secondsLeft]);

  async function handleRequest() {
    setLoading(true);
    try {
      const minIntendedSeconds =
        Number.isFinite(intendedMinutes) && intendedMinutes > 0
          ? Math.round(intendedMinutes * 60)
          : undefined;
      const res = await fetch("/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, mode, minIntendedSeconds }),
      });
      const payload = await res.json();
      setRequestId(payload.requestId ?? null);
      setRequestState(payload.status ?? "pending");
      setSecondsLeft(20);
    } catch {
      setRequestState("timeout");
    } finally {
      setLoading(false);
    }
  }

  function handleModeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = modeOptions.findIndex((option) => option.id === mode);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % modeOptions.length
        : (currentIndex - 1 + modeOptions.length) % modeOptions.length;
    setMode(modeOptions[nextIndex].id);
  }

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Request</p>
            <h1>Request a call with @{username}</h1>
            <p className={styles.subtitle}>
              Send a paid request with a 20-second response window. Preview time is
              applied automatically.
            </p>
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Call details</h2>
                <p className={styles.subtitle}>Choose your preferred mode.</p>
              </div>
              <span className={styles.pill}>Rate: $3.25 / min</span>
            </div>

            <div
              className={styles.modeTabs}
              role="tablist"
              aria-label="Choose call mode"
              onKeyDown={handleModeKeyDown}
            >
              {modeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === option.id}
                  tabIndex={mode === option.id ? 0 : -1}
                  className={styles.modeButton}
                  data-selected={mode === option.id}
                  onClick={() => setMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={styles.grid}>
              <label>
                Intended minutes
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={intendedMinutes}
                  aria-label="Intended minutes"
                  onChange={(event) => setIntendedMinutes(Number(event.target.value))}
                />
              </label>
            </div>

            <div className={styles.row}>
              <button
                className={styles.button}
                type="button"
                onClick={handleRequest}
                disabled={loading}
                aria-label="Send call request"
              >
                {loading ? "Sending…" : "Send request"}
              </button>
              <span className={styles.subtitle}>Request ID: {requestId ?? "—"}</span>
            </div>
          </section>

          <section className={styles.card} aria-live="polite">
            <h2>Status</h2>
            <div className={styles.status} data-tone={statusTone}>
              <strong>{statusCopy.title}</strong>
              <span>{statusCopy.body}</span>
            </div>
            <div className={styles.grid}>
              <div>
                <h3>What happens next?</h3>
                <p className={styles.subtitle}>
                  If accepted, you will enter a free preview. Billing starts after the
                  preview ends.
                </p>
              </div>
              <div>
                <h3>Need more time?</h3>
                <p className={styles.subtitle}>
                  You can retry the request or send an availability ping instead.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
