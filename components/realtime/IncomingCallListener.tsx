"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAbly } from "@/components/realtime/AblyRealtimeProvider";
import { CALL_REQUEST_WINDOW_MS } from "@/lib/constants";

// Pages where we suppress the overlay — either they handle incoming calls
// themselves (/call/incoming) or showing it would be disruptive (/call/[id])
const SUPPRESS_PATHS = ["/call/incoming"];
const SUPPRESS_PATTERN = /^\/call\/[^/]+$/; // matches /call/[id]

/* ─── types ──────────────────────────────────────────────── */
type IncomingRequest = {
  id: string;
  caller: string;
  mode: "voice" | "video";
  ratePerMinute: string;
  expiresAt: string;
  summary: string;
};

/* ─── audio ──────────────────────────────────────────────────
 * Strategy: create and RESUME AudioContext on the first user
 * gesture anywhere on the document. Store it in a module-level
 * singleton so it stays unlocked for the lifetime of the session.
 * When a call arrives the context is already live — no gesture needed.
 * ─────────────────────────────────────────────────────────── */
let sharedCtx: AudioContext | null = null;
let ctxUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    try { sharedCtx = new AudioContext(); } catch { return null; }
  }
  return sharedCtx;
}

// Call this once — attaches a one-time document listener that
// resumes the AudioContext on the first user interaction.
function primeAudioContext() {
  if (ctxUnlocked || typeof document === "undefined") return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().then(() => { ctxUnlocked = true; });
    } else {
      ctxUnlocked = true;
    }
    document.removeEventListener("click", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    document.removeEventListener("touchstart", unlock, true);
  };
  document.addEventListener("click", unlock, true);
  document.addEventListener("keydown", unlock, true);
  document.addEventListener("touchstart", unlock, true);
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, startTime);
  gain.gain.setValueAtTime(0.15, startTime + duration - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// US-style two-tone ring: 440Hz+480Hz for 2s, silence for 4s
function playRingtone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    // Context not yet unlocked — can't play, will be silent
    return;
  }
  const now = ctx.currentTime;
  playTone(ctx, 440, now, 2);
  playTone(ctx, 480, now, 2);
}

/* ─── CSS ────────────────────────────────────────────────── */
const css = `
  .icl-overlay {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 9999; width: calc(100% - 32px); max-width: 480px;
    animation: icl-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes icl-slide-up {
    from { opacity: 0; transform: translateX(-50%) translateY(24px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .icl-card {
    background: rgba(8,12,28,0.97);
    border: 1px solid rgba(74,222,128,0.4);
    border-radius: 20px;
    padding: 0;
    box-shadow: 0 0 0 1px rgba(74,222,128,0.1), 0 24px 60px rgba(0,0,0,0.7);
    overflow: hidden;
    font-family: -apple-system, 'Inter', system-ui, sans-serif;
  }
  .icl-top {
    padding: 18px 20px 14px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .icl-avatar {
    width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
    background: rgba(74,222,128,0.15);
    border: 1.5px solid rgba(74,222,128,0.35);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 700; color: #4ade80;
    letter-spacing: 0.02em;
  }
  .icl-info { flex: 1; min-width: 0; }
  .icl-eyebrow {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #4ade80; margin-bottom: 3px;
    display: flex; align-items: center; gap: 6px;
  }
  .icl-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
    animation: icl-pulse 1.4s ease-in-out infinite;
  }
  @keyframes icl-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
    50%      { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
  }
  .icl-caller {
    font-size: 1.1rem; font-weight: 700; color: #f5f7ff;
    letter-spacing: -0.01em; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .icl-meta {
    font-size: 0.78rem; color: rgba(245,247,255,0.5); margin-top: 3px;
    display: flex; align-items: center; gap: 8px;
  }
  .icl-rate {
    font-size: 0.82rem; font-weight: 700; color: #f5f7ff;
  }
  .icl-mode {
    font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;
    background: rgba(124,92,255,0.15); color: #c4b5fd;
    border: 1px solid rgba(124,92,255,0.25);
  }
  .icl-timer-wrap {
    flex-shrink: 0; display: flex; flex-direction: column;
    align-items: center; gap: 2px;
  }
  .icl-ring { position: relative; width: 44px; height: 44px; }
  .icl-ring-svg { transform: rotate(-90deg); }
  .icl-ring-track { fill: none; stroke: rgba(74,222,128,0.12); stroke-width: 3; }
  .icl-ring-fill  { fill: none; stroke: #4ade80; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
  .icl-ring-num {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 0.78rem; font-weight: 700;
    color: #4ade80; font-variant-numeric: tabular-nums;
  }
  .icl-timer-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(245,247,255,0.3); }
  .icl-divider { height: 1px; background: rgba(74,222,128,0.1); margin: 0 20px; }
  .icl-actions {
    padding: 14px 20px 18px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .icl-btn {
    padding: 13px 16px; border-radius: 999px; border: none;
    font-size: 0.88rem; font-weight: 700; font-family: inherit;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: 6px;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .icl-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .icl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .icl-btn-accept {
    background: linear-gradient(120deg, #4ade80 0%, #22d3ee 100%);
    color: #0b1f0f;
    box-shadow: 0 6px 20px rgba(74,222,128,0.3);
  }
  .icl-btn-decline {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(245,247,255,0.6);
  }
  .icl-dismiss {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; cursor: pointer;
    color: rgba(245,247,255,0.25); font-size: 0.9rem; line-height: 1;
    padding: 4px;
  }
  .icl-dismiss:hover { color: rgba(245,247,255,0.55); }
`;

const WINDOW_SECS = Math.floor(CALL_REQUEST_WINDOW_MS / 1000);
const CIRCUMFERENCE = 2 * Math.PI * 19; // r=19

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function IncomingCallListener() {
  const { session, status } = useAuth();
  const { client } = useAbly();
  const router = useRouter();
  const pathname = usePathname();

  const userId = session?.user?.id ?? "";

  // Suppress overlay on call pages
  const isSuppressed =
    SUPPRESS_PATHS.some((p) => pathname === p) ||
    SUPPRESS_PATTERN.test(pathname);

  const [request, setRequest] = useState<IncomingRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECS);
  const [responding, setResponding] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const didRespondRef = useRef(false);
  const ringtoneIntervalRef = useRef<number | null>(null);

  /* ── load the latest pending request ── */
  const loadRequest = useCallback(async () => {
    try {
      const res = await fetch("/api/calls/incoming");
      if (!res.ok) return;
      const data = await res.json() as { requests: IncomingRequest[] };
      const pending = data.requests.find((r) => r.status === "pending") ?? null;
      setRequest(pending);
      if (pending) {
        const secs = Math.max(
          0,
          Math.floor((new Date(pending.expiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsLeft(secs);
        didRespondRef.current = false;
      }
    } catch {}
  }, []);

  /* ── start/stop ringtone ── */
  function startRingtone() {
    playRingtone();
    // Re-trigger every 6s (2s ring + 4s silence)
    ringtoneIntervalRef.current = window.setInterval(playRingtone, 6000);
  }

  function stopRingtone() {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }

  /* ── Prime AudioContext on mount so it's unlocked before a call arrives ── */
  useEffect(() => { primeAudioContext(); }, []);

  /* ── Notification permission — check on mount, request if default ── */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
    // If never asked before, request proactively so receivers are ready
    if (Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        setNotifPermission(perm);
      });
    }
  }, []);


  /* ── Ably subscription ── */
  useEffect(() => {
    if (!userId || !client || status !== "authenticated") return;

    const channel = client.channels.get(`user:${userId}`);

    const handleIncoming = () => {
      void loadRequest();
      startRingtone();

      // Rich browser notification — fires after we have the full request data
      void fetch("/api/calls/incoming").then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { requests: IncomingRequest[] };
        const req = data.requests.find((r) => r.status === "pending");
        if (!req) return;

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(`📞 ${req.caller} is calling`, {
            body: `${req.ratePerMinute} · ${req.mode === "video" ? "📹 Video" : "🎤 Voice"} · ${WINDOW_SECS}s to accept`,
            tag: "incoming-call",
            requireInteraction: true,
            silent: false,
          });
        }
      });
    };

    channel.subscribe("incoming_call", handleIncoming);

    return () => {
      channel.unsubscribe("incoming_call", handleIncoming);
      stopRingtone();
    };
  }, [client, userId, status, loadRequest]);

  /* ── countdown timer ── */
  useEffect(() => {
    if (!request) return;
    if (secondsLeft <= 0) {
      setRequest(null);
      stopRingtone();
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [request, secondsLeft]);

  /* ── cleanup ringtone when request dismissed ── */
  useEffect(() => {
    if (!request) stopRingtone();
  }, [request]);

  /* ── respond ── */
  async function respond(action: "accept" | "decline") {
    if (!request || didRespondRef.current) return;
    didRespondRef.current = true;
    setResponding(true);
    stopRingtone();

    try {
      const res = await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action }),
      });
      const payload = await res.json().catch(() => null) as { redirectTo?: string | null } | null;
      setRequest(null);
      if (payload?.redirectTo) {
        if (action === "accept") {
          router.push(payload.redirectTo);
        } else {
          router.replace(payload.redirectTo);
        }
      }
    } catch {
      didRespondRef.current = false;
      setResponding(false);
    }
  }

  if (!request || isSuppressed) return null;

  const ringOffset = CIRCUMFERENCE * (1 - secondsLeft / WINDOW_SECS);
  const pct = Math.round((secondsLeft / WINDOW_SECS) * 100);

  return (
    <>
      <style>{css}</style>
      <div className="icl-overlay" role="dialog" aria-modal="false" aria-label="Incoming call">
        <div className="icl-card">
          <button
            className="icl-dismiss"
            type="button"
            onClick={() => { setRequest(null); stopRingtone(); }}
            aria-label="Dismiss"
          >
            ✕
          </button>

          <div className="icl-top">
            <div className="icl-avatar">{initials(request.caller)}</div>

            <div className="icl-info">
              <div className="icl-eyebrow">
                <span className="icl-dot" />
                Incoming call
              </div>
              <div className="icl-caller">@{request.caller}</div>
              <div className="icl-meta">
                <span className="icl-rate">{request.ratePerMinute}</span>
                <span className="icl-mode">{request.mode === "video" ? "Video" : "Voice"}</span>
              </div>
            </div>

            <div className="icl-timer-wrap">
              <div className="icl-ring">
                <svg className="icl-ring-svg" width="44" height="44" viewBox="0 0 44 44">
                  <circle className="icl-ring-track" cx="22" cy="22" r="19" />
                  <circle
                    className="icl-ring-fill"
                    cx="22" cy="22" r="19"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="icl-ring-num">{secondsLeft}</div>
              </div>
              <div className="icl-timer-label">secs left</div>
            </div>
          </div>

          <div className="icl-divider" />

          <div className="icl-actions">
            <button
              className="icl-btn icl-btn-accept"
              type="button"
              onClick={() => respond("accept")}
              disabled={responding}
              aria-label="Accept call"
            >
              {responding ? "Connecting…" : "Accept"}
            </button>
            <button
              className="icl-btn icl-btn-decline"
              type="button"
              onClick={() => respond("decline")}
              disabled={responding}
              aria-label="Decline call"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
