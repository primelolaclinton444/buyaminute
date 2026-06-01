"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAbly } from "@/components/realtime/AblyRealtimeProvider";
import { CALL_REQUEST_WINDOW_MS, TOKEN_UNIT_USD } from "@/lib/constants";

const css = `
  .bam-rq-page {
    min-height: 100vh;
    padding: 48px 24px 80px;
    background: radial-gradient(circle at top, rgba(90,110,255,0.18), transparent 55%), #05070f;
  }
  .bam-rq-wrap { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

  /* Header */
  .bam-rq-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 999px; font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    background: rgba(90,110,255,0.18); color: #c4b5fd;
    border: 1px solid rgba(90,110,255,0.3); width: fit-content;
  }
  .bam-rq-heading { font-size: 1.6rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em; line-height: 1.2; }
  .bam-rq-heading em { font-style: normal; color: #a5b4ff; }
  .bam-rq-sub { font-size: 0.88rem; color: rgba(245,247,255,0.45); line-height: 1.6; max-width: 480px; }

  /* Card */
  .bam-rq-card {
    background: rgba(12,16,32,0.8); border: 1px solid rgba(120,140,255,0.18);
    border-radius: 20px; padding: 24px; display: flex; flex-direction: column;
    gap: 20px; box-shadow: 0 12px 40px rgba(5,7,15,0.45);
  }
  .bam-rq-card-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(245,247,255,0.4); }

  /* Cost estimate */
  .bam-rq-cost-block {
    display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  }
  .bam-rq-cost-rate {
    font-size: 2.2rem; font-weight: 800; color: #f5f7ff; letter-spacing: -0.03em; line-height: 1;
  }
  .bam-rq-cost-unit { font-size: 0.85rem; color: rgba(245,247,255,0.4); }
  .bam-rq-cost-estimate {
    font-size: 0.82rem; color: rgba(196,181,253,0.75);
    font-style: italic; font-family: Georgia, serif;
  }

  /* Mode tabs */
  .bam-rq-mode-wrap {
    display: inline-flex; gap: 6px; padding: 5px;
    border-radius: 999px; background: rgba(10,12,26,0.9);
    border: 1px solid rgba(120,140,255,0.2);
  }
  .bam-rq-mode-btn {
    border-radius: 999px; border: 1px solid transparent;
    background: transparent; color: rgba(245,247,255,0.5);
    padding: 8px 20px; cursor: pointer; font-size: 0.88rem;
    font-family: inherit; font-weight: 500;
    transition: all 0.15s ease;
  }
  .bam-rq-mode-btn:hover { color: rgba(245,247,255,0.85); }
  .bam-rq-mode-btn-active {
    background: rgba(90,110,255,0.3); color: #f5f7ff;
    border-color: rgba(150,165,255,0.5);
  }
  .bam-rq-mode-disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }

  /* Minutes input */
  .bam-rq-field { display: flex; flex-direction: column; gap: 6px; }
  .bam-rq-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(245,247,255,0.45); }
  .bam-rq-input {
    background: rgba(10,12,24,0.9); border: 1px solid rgba(120,140,255,0.25);
    border-radius: 12px; padding: 11px 14px; color: #f5f7ff;
    font-size: 1rem; font-family: inherit; outline: none; width: 100%;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .bam-rq-input:focus { border-color: rgba(120,140,255,0.6); box-shadow: 0 0 0 3px rgba(90,110,255,0.12); }
  .bam-rq-hint { font-size: 0.75rem; color: rgba(245,247,255,0.3); }

  /* Send button */
  .bam-rq-send {
    width: 100%; padding: 14px 20px; border-radius: 999px; border: none;
    font-size: 1rem; font-weight: 700; font-family: inherit; cursor: pointer;
    background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%);
    color: #0b0f1f; letter-spacing: 0.01em;
    box-shadow: 0 8px 24px rgba(0,212,255,0.25);
    transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  .bam-rq-send:hover:not(:disabled) {
    opacity: 0.9; transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(0,212,255,0.35);
  }
  .bam-rq-send:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Status card */
  .bam-rq-status {
    border-radius: 16px; padding: 18px 20px;
    background: rgba(13,20,40,0.9); border: 1px solid rgba(120,140,255,0.2);
    display: flex; flex-direction: column; gap: 8px;
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .bam-rq-status-warning { border-color: rgba(255,190,90,0.4); background: rgba(40,28,8,0.75); }
  .bam-rq-status-danger  { border-color: rgba(255,120,160,0.4); background: rgba(45,10,20,0.75); }
  .bam-rq-status-success { border-color: rgba(130,240,190,0.4); background: rgba(15,35,25,0.75); }
  .bam-rq-status-title { font-size: 0.95rem; font-weight: 700; color: #f5f7ff; }
  .bam-rq-status-body { font-size: 0.88rem; color: rgba(245,247,255,0.6); line-height: 1.5; }
  .bam-rq-status-reason { font-size: 0.78rem; color: rgba(245,247,255,0.35); }

  /* Countdown ring */
  .bam-rq-countdown-wrap {
    display: flex; align-items: center; gap: 14px;
  }
  .bam-rq-ring { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
  .bam-rq-ring-svg { transform: rotate(-90deg); }
  .bam-rq-ring-track { fill: none; stroke: rgba(255,190,90,0.15); stroke-width: 3; }
  .bam-rq-ring-fill {
    fill: none; stroke: rgba(255,190,90,0.8); stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear;
  }
  .bam-rq-ring-label {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 0.85rem; font-weight: 700;
    color: rgba(255,210,120,0.9); font-variant-numeric: tabular-nums;
  }
  .bam-rq-countdown-text { display: flex; flex-direction: column; gap: 2px; }
  .bam-rq-countdown-title { font-size: 0.88rem; font-weight: 600; color: #f5f7ff; }
  .bam-rq-countdown-sub { font-size: 0.78rem; color: rgba(245,247,255,0.45); }

  /* Action row */
  .bam-rq-action-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .bam-rq-btn {
    padding: 9px 18px; border-radius: 999px; font-size: 0.83rem; font-weight: 600;
    font-family: inherit; cursor: pointer; border: none; text-decoration: none;
    display: inline-flex; align-items: center;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .bam-rq-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .bam-rq-btn-primary { background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%); color: #0b0f1f; }
  .bam-rq-btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(245,247,255,0.7); }

  /* Skeleton */
  .bam-rq-skeleton {
    height: 20px; border-radius: 6px;
    background: rgba(255,255,255,0.06);
    animation: bam-rq-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes bam-rq-shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }

  @media (max-width: 480px) {
    .bam-rq-page { padding: 32px 16px 64px; }
    .bam-rq-heading { font-size: 1.3rem; }
    .bam-rq-cost-rate { font-size: 1.8rem; }
  }
`;

const modeOptions = [
  { id: "voice", label: "Voice" },
  { id: "video", label: "Video" },
] as const;

type Mode = (typeof modeOptions)[number]["id"];

type RequestState =
  | "idle" | "pending" | "declined" | "timeout"
  | "insufficient" | "offline" | "video_not_allowed" | "accepted";

type CallStateResponse = {
  call?: { status?: "ringing" | "connected" | "ended" };
  redirectTo?: string | null;
};

const WINDOW_SECS = Math.floor(CALL_REQUEST_WINDOW_MS / 1000);
const CIRCUMFERENCE = 2 * Math.PI * 23; // r=23

export default function CallRequestPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const didRedirectRef = useRef(false);
  const normalizedUsername = useMemo(() => (username ? username.replace(/^@/, "") : ""), [username]);

  const [mode, setMode] = useState<Mode>("voice");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(WINDOW_SECS);
  const [loading, setLoading] = useState(false);
  const [intendedMinutes, setIntendedMinutes] = useState<number>(5);
  const [profileRate, setProfileRate] = useState<number | null>(null);
  const [videoAllowed, setVideoAllowed] = useState(true);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">("idle");
  const { client } = useAbly();

  const estimatedCost = useMemo(() => {
    if (profileRate === null) return null;
    const usd = profileRate * intendedMinutes;
    return `~$${usd.toFixed(2)} for ${intendedMinutes} min`;
  }, [profileRate, intendedMinutes]);

  const statusClass = useMemo(() => {
    if (requestState === "accepted") return "bam-rq-status bam-rq-status-success";
    if (["insufficient", "offline", "video_not_allowed"].includes(requestState)) return "bam-rq-status bam-rq-status-danger";
    if (["pending", "timeout", "declined"].includes(requestState)) return "bam-rq-status bam-rq-status-warning";
    return "bam-rq-status";
  }, [requestState]);

  const statusCopy = useMemo(() => {
    switch (requestState) {
      case "pending":    return { title: "Request sent", body: `Waiting for @${normalizedUsername} to accept.` };
      case "timeout":    return { title: "Request expired", body: "No response in time. Try again or send a ping." };
      case "declined":   return { title: "Request declined", body: "They declined this call. Try again later." };
      case "insufficient": return { title: "Top up required", body: "Your balance is too low for this rate. Add funds to continue." };
      case "offline":    return { title: "Receiver offline", body: "They are not accepting calls right now." };
      case "video_not_allowed": return { title: "Video unavailable", body: "This receiver only accepts voice calls." };
      case "accepted":   return { title: "Accepted — connecting", body: "You will enter the preview momentarily." };
      default:           return { title: "Ready to request", body: "Select voice or video, set your intended minutes, and send." };
    }
  }, [normalizedUsername, requestState]);

  // Countdown timer
  useEffect(() => {
    if (requestState !== "pending") return;
    if (secondsLeft <= 0) { setRequestState("timeout"); return; }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [requestState, secondsLeft]);

  // Ably subscriptions
  useEffect(() => {
    if (!requestId || !client) return;
    const channel = client.channels.get(`call:${requestId}`);
    const onAccepted = () => { setRequestState("accepted"); router.push(`/call/${requestId}`); };
    const onDeclined = () => { setRequestState("declined"); router.replace(`/call/${requestId}/receipt`); };
    const onConnected = () => { if (didRedirectRef.current) return; setRequestState("accepted"); router.push(`/call/${requestId}`); };
    channel.subscribe("call_accepted", onAccepted);
    channel.subscribe("call_declined", onDeclined);
    channel.subscribe("call_connected", onConnected);
    return () => {
      channel.unsubscribe("call_accepted", onAccepted);
      channel.unsubscribe("call_declined", onDeclined);
      channel.unsubscribe("call_connected", onConnected);
    };
  }, [client, requestId, router]);

  // State poll on mount
  useEffect(() => {
    if (!requestId) return;
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/calls/active?id=${requestId}`);
        if (!res.ok || !mounted) return;
        const payload = (await res.json()) as CallStateResponse;
        if (payload.redirectTo && !didRedirectRef.current && pathname !== payload.redirectTo) {
          didRedirectRef.current = true; router.replace(payload.redirectTo); return;
        }
        const s = payload?.call?.status;
        if (!mounted || !s) return;
        if (s === "connected") { setRequestState("accepted"); router.push(`/call/${requestId}`); }
        if (s === "ended") { setRequestState("declined"); router.replace(`/call/${requestId}/receipt`); }
      } catch {}
    };
    void load();
    return () => { mounted = false; };
  }, [pathname, requestId, router]);

  // Polling during pending/timeout
  useEffect(() => {
    if (!requestId || (requestState !== "pending" && requestState !== "timeout")) return;
    let mounted = true;
    const poll = async () => {
      const res = await fetch(`/api/calls/active?id=${requestId}`);
      if (!res.ok || !mounted) return;
      const payload = (await res.json()) as CallStateResponse;
      if (payload.redirectTo && !didRedirectRef.current && pathname !== payload.redirectTo) {
        didRedirectRef.current = true; router.replace(payload.redirectTo);
      }
    };
    const interval = window.setInterval(() => void poll(), 3000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, [pathname, requestId, requestState, router]);

  // Load profile
  useEffect(() => {
    async function load() {
      setProfileStatus("loading");
      try {
        const res = await fetch(`/api/profile?username=${encodeURIComponent(normalizedUsername)}`);
        if (!res.ok) { setProfileStatus("error"); return; }
        const data = (await res.json()) as { profile?: { rate?: number; videoAllowed?: boolean } };
        setProfileRate(data.profile?.rate ?? null);
        setVideoAllowed(data.profile?.videoAllowed ?? true);
        setProfileStatus("idle");
      } catch { setProfileStatus("error"); }
    }
    load();
  }, [normalizedUsername]);

  useEffect(() => { if (!videoAllowed && mode === "video") setMode("voice"); }, [videoAllowed, mode]);

  const availableModes = useMemo(
    () => videoAllowed ? modeOptions : modeOptions.filter((o) => o.id === "voice"),
    [videoAllowed]
  );

  async function handleRequest() {
    setLoading(true);
    setOfflineReason(null);
    try {
      const minIntendedSeconds = Number.isFinite(intendedMinutes) && intendedMinutes > 0
        ? Math.round(intendedMinutes * 60) : undefined;
      const res = await fetch("/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, mode, minIntendedSeconds }),
      });
      const payload = await res.json();
      const reason = payload?.reason ?? payload?.error?.reason ?? payload?.error?.code ?? null;
      setOfflineReason(reason);
      if (!res.ok) {
        setRequestState(payload?.error?.code === "VIDEO_NOT_ALLOWED" ? "video_not_allowed" : "offline");
        setRequestId(null);
        return;
      }
      setRequestId(payload.requestId ?? null);
      setRequestState(payload.status ?? "pending");
      setSecondsLeft(WINDOW_SECS);
    } catch {
      setOfflineReason(null);
      setRequestState("timeout");
    } finally {
      setLoading(false);
    }
  }

  function handleModeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = availableModes.findIndex((o) => o.id === mode);
    const next = e.key === "ArrowRight"
      ? (idx + 1) % availableModes.length
      : (idx - 1 + availableModes.length) % availableModes.length;
    setMode(availableModes[next].id);
  }

  // Ring progress
  const ringOffset = requestState === "pending"
    ? CIRCUMFERENCE * (1 - secondsLeft / WINDOW_SECS)
    : CIRCUMFERENCE;

  const canRetry = ["timeout", "declined", "offline", "video_not_allowed", "insufficient"].includes(requestState);

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="bam-rq-page">
        <div className="bam-rq-wrap">

          {/* Header */}
          <div>
            <div className="bam-rq-eyebrow">Paid call request</div>
            <h1 className="bam-rq-heading" style={{ marginTop: 12 }}>
              Call <em>@{normalizedUsername}</em>
            </h1>
            <p className="bam-rq-sub" style={{ marginTop: 8 }}>
              Send a paid request. They have {WINDOW_SECS} seconds to accept. Preview time applies automatically.
            </p>
          </div>

          {/* Call details card */}
          <div className="bam-rq-card">
            <div className="bam-rq-card-title">Rate</div>
            <div className="bam-rq-cost-block">
              {profileStatus === "loading" ? (
                <div className="bam-rq-skeleton" style={{ width: 120, height: 36 }} />
              ) : profileRate !== null ? (
                <>
                  <span className="bam-rq-cost-rate">${profileRate.toFixed(2)}</span>
                  <span className="bam-rq-cost-unit">/ min</span>
                  {estimatedCost ? (
                    <span className="bam-rq-cost-estimate">{estimatedCost}</span>
                  ) : null}
                </>
              ) : (
                <span className="bam-rq-cost-rate" style={{ color: "rgba(245,247,255,0.3)" }}>—</span>
              )}
            </div>

            <div>
              <div className="bam-rq-card-title" style={{ marginBottom: 10 }}>Mode</div>
              <div
                className="bam-rq-mode-wrap"
                role="tablist"
                aria-label="Choose call mode"
                onKeyDown={handleModeKeyDown}
              >
                {availableModes.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === option.id}
                    tabIndex={mode === option.id ? 0 : -1}
                    className={`bam-rq-mode-btn${mode === option.id ? " bam-rq-mode-btn-active" : ""}`}
                    onClick={() => setMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
                {!videoAllowed ? (
                  <span className="bam-rq-mode-btn bam-rq-mode-disabled">Video</span>
                ) : null}
              </div>
            </div>

            <div className="bam-rq-field">
              <label className="bam-rq-label" htmlFor="intended-minutes">Intended minutes</label>
              <input
                id="intended-minutes"
                className="bam-rq-input"
                type="number"
                min={1}
                value={intendedMinutes}
                onChange={(e) => setIntendedMinutes(Number(e.target.value))}
                style={{ maxWidth: 140 }}
              />
              <span className="bam-rq-hint">Billing is per-second after any free preview. Unused balance is refunded.</span>
            </div>

            <button
              className="bam-rq-send"
              type="button"
              onClick={handleRequest}
              disabled={loading || requestState === "pending" || requestState === "accepted"}
              aria-label="Send call request"
            >
              {loading ? "Sending…" : requestState === "pending" ? "Waiting for response…" : "Send request"}
            </button>
          </div>

          {/* Status card */}
          <div className={statusClass} aria-live="polite">
            {requestState === "pending" ? (
              <div className="bam-rq-countdown-wrap">
                <div className="bam-rq-ring">
                  <svg className="bam-rq-ring-svg" width="52" height="52" viewBox="0 0 52 52">
                    <circle className="bam-rq-ring-track" cx="26" cy="26" r="23" />
                    <circle
                      className="bam-rq-ring-fill"
                      cx="26" cy="26" r="23"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <div className="bam-rq-ring-label">{secondsLeft}</div>
                </div>
                <div className="bam-rq-countdown-text">
                  <div className="bam-rq-countdown-title">{statusCopy.title}</div>
                  <div className="bam-rq-countdown-sub">{statusCopy.body}</div>
                </div>
              </div>
            ) : (
              <>
                <div className="bam-rq-status-title">{statusCopy.title}</div>
                <div className="bam-rq-status-body">{statusCopy.body}</div>
                {offlineReason && requestState !== "accepted" ? (
                  <div className="bam-rq-status-reason">Reason: {offlineReason}</div>
                ) : null}
              </>
            )}

            {canRetry ? (
              <div className="bam-rq-action-row" style={{ marginTop: 8 }}>
                <button className="bam-rq-btn bam-rq-btn-primary" type="button" onClick={handleRequest} disabled={loading}>
                  Try again
                </button>
                {requestState === "insufficient" ? (
                  <a href="/wallet" className="bam-rq-btn bam-rq-btn-ghost">Add funds</a>
                ) : (
                  <a href={`/u/${normalizedUsername}`} className="bam-rq-btn bam-rq-btn-ghost">View profile</a>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
