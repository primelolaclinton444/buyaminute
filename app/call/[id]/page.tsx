"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import styles from "../call.module.css";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "ended";

type CallSummary = {
  id: string;
  caller: string;
  receiver: string;
  mode: "voice" | "video";
  viewerRole: "caller" | "receiver";
};

export default function ActiveCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "connecting"
  );
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    async function loadCall() {
      const res = await fetch(`/api/calls/active?id=${id}`);
      const data = await res.json();
      setSummary(data.call ?? null);
    }
    loadCall();
  }, [id]);

  const isReceiverVideo =
    summary?.mode === "video" && summary?.viewerRole === "receiver";

  useEffect(() => {
    if (connectionState !== "connected") return;
    const timer = window.setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [connectionState]);

  useEffect(() => {
    if (confirmOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [confirmOpen]);

  useEffect(() => {
    if (isReceiverVideo) {
      setCameraOn(true);
    }
  }, [isReceiverVideo]);

  useEffect(() => {
    if (!isReceiverVideo) return;
    if (!cameraOn) {
      setCameraPromptOpen(true);
      return;
    }
    setCameraPromptOpen(false);
  }, [cameraOn, isReceiverVideo]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsElapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsElapsed % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsElapsed]);

  const counterparty = summary
    ? summary.viewerRole === "caller"
      ? summary.receiver
      : summary.caller
    : "your host";

  function handleConfirmKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setConfirmOpen(false);
    }
  }

  async function handleEndCall() {
    setConfirmOpen(false);
    setConnectionState("ended");
    await fetch("/api/calls/end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId: id }),
    });
    router.push(`/call/${id}/receipt`);
  }

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>In call</p>
            <h1>Call with {summary ? `@${counterparty}` : "your host"}</h1>
            <p className={styles.subtitle}>
              Track the connection state, preview timer, and billing controls.
            </p>
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Connection</h2>
                <p className={styles.subtitle}>
                  {summary
                    ? `Caller: @${summary.caller} · Mode: ${summary.mode}`
                    : "Loading call summary…"}
                </p>
              </div>
              <span className={styles.pill} aria-live="polite">
                {connectionState}
              </span>
            </div>

            <div className={styles.grid}>
              <div className={styles.status}>
                <strong>Live timer</strong>
                <span className={styles.timer}>{formattedTime}</span>
              </div>
              <div className={styles.status} data-tone="success">
                <strong>Preview status</strong>
                <span>30s free preview remaining</span>
              </div>
              <div className={styles.status} data-tone="warning">
                <strong>Connection checks</strong>
                <span>Auto-reconnecting if signal drops</span>
              </div>
            </div>

            <div className={styles.row}>
              <button
                className={styles.button}
                type="button"
                onClick={() => setConnectionState("connected")}
              >
                Simulate connect
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={() => setConnectionState("reconnecting")}
              >
                Simulate reconnect
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Call controls</h2>
            <div className={styles.controls}>
              <button
                className={styles.iconButton}
                data-active={!muted}
                type="button"
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                onClick={() => setMuted((prev) => !prev)}
              >
                {muted ? "🔇" : "🎙️"}
              </button>
              <button
                className={styles.iconButton}
                data-active={cameraOn}
                type="button"
                aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                onClick={() => {
                  if (isReceiverVideo) return;
                  setCameraOn((prev) => !prev);
                }}
                disabled={isReceiverVideo}
              >
                {cameraOn ? "📷" : "🚫"}
              </button>
              <button
                className={styles.iconButton}
                data-active={speakerOn}
                type="button"
                aria-label={speakerOn ? "Mute speaker" : "Enable speaker"}
                onClick={() => setSpeakerOn((prev) => !prev)}
              >
                {speakerOn ? "🔊" : "🔈"}
              </button>
              <button
                className={styles.iconButton}
                data-active={captionsOn}
                type="button"
                aria-label={captionsOn ? "Hide captions" : "Show captions"}
                onClick={() => setCaptionsOn((prev) => !prev)}
              >
                {captionsOn ? "💬" : "💭"}
              </button>
              <button
                className={`${styles.iconButton} ${styles.buttonDanger}`}
                type="button"
                aria-label="End call"
                onClick={() => setConfirmOpen(true)}
              >
                ⏹️
              </button>
            </div>
          </section>
        </div>

        {confirmOpen ? (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-call-title"
              onKeyDown={handleConfirmKey}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="end-call-title">End this call?</h2>
              <p className={styles.subtitle}>
                The call will end immediately and a receipt will be generated.
              </p>
              <div className={styles.row}>
                <button
                  ref={confirmRef}
                  className={`${styles.button} ${styles.buttonDanger}`}
                  type="button"
                  onClick={handleEndCall}
                >
                  End call
                </button>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                >
                  Keep talking
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {cameraPromptOpen ? (
          <div className={styles.modalBackdrop} role="presentation">
            <div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="camera-required-title"
            >
              <h2 id="camera-required-title">Camera required</h2>
              <p className={styles.subtitle}>
                Video calls require your camera to stay on. Please enable camera
                access to continue.
              </p>
              <div className={styles.row}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => {
                    setCameraOn(true);
                    setCameraPromptOpen(false);
                  }}
                >
                  Enable camera
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
