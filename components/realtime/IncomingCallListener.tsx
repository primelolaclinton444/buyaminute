"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAbly } from "@/components/realtime/AblyRealtimeProvider";
import { CALL_REQUEST_WINDOW_MS } from "@/lib/constants";

type IncomingRequest = {
  id: string;
  caller: string;
  mode: "voice" | "video";
  ratePerMinute: string;
  expiresAt: string;
  summary: string;
};

/* ── audio ───────────────────────────────────────────────────
   Module-level singleton — primed on first user gesture so
   it's unlocked before any call arrives.
──────────────────────────────────────────────────────────── */
let sharedCtx: AudioContext | null = null;
let ctxUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    try { sharedCtx = new AudioContext(); } catch { return null; }
  }
  return sharedCtx;
}

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

function playTone(ctx: AudioContext, freq: number, start: number, dur: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, start);
  gain.gain.setValueAtTime(0.15, start + dur - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

function playRingtone() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") return;
  const now = ctx.currentTime;
  playTone(ctx, 440, now, 2);
  playTone(ctx, 480, now, 2);
}

/* ── CSS ─────────────────────────────────────────────────── */
const css = `
  .icl-backdrop {
    position: fixed; inset: 0; z-index: 9998;
    background: rgba(3,5,15,0.75); backdrop-filter: blur(6px);
  }
  .icl-overlay {
    position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 9999; padding: 16px;
    display: flex; justify-content: center;
    animation: icl-up 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes icl-up {
    from { opacity:0; transform: translateY(40px); }
    to   { opacity:1; transform: translateY(0); }
  }
  .icl-card {
    width: 100%; max-width: 480px;
    background: #080c1c;
    border: 1.5px solid rgba(74,222,128,0.5);
    border-radius: 24px;
    box-shadow: 0 0 0 1px rgba(74,222,128,0.1), 0 32px 80px rgba(0,0,0,0.8);
    overflow: hidden;
    font-family: -apple-system, 'Inter', system-ui, sans-serif;
  }
  .icl-top {
    padding: 20px 22px 16px;
    display: flex; align-items: center; gap: 14px;
  }
  .icl-avatar {
    width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
    background: rgba(74,222,128,0.15);
    border: 2px solid rgba(74,222,128,0.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem; font-weight: 700; color: #4ade80;
  }
  .icl-info { flex: 1; min-width: 0; }
  .icl-eyebrow {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #4ade80; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .icl-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #4ade80;
    animation: icl-pulse 1.4s ease-in-out infinite;
  }
  @keyframes icl-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7); }
    50%      { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
  }
  .icl-caller {
    font-size: 1.2rem; font-weight: 700; color: #f5f7ff;
    letter-spacing: -0.01em; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .icl-meta {
    font-size: 0.8rem; color: rgba(245,247,255,0.5);
    margin-top: 3px; display: flex; align-items: center; gap: 8px;
  }
  .icl-rate { font-size: 0.85rem; font-weight: 700; color: #f5f7ff; }
  .icl-mode {
    font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;
    background: rgba(124,92,255,0.15); color: #c4b5fd;
    border: 1px solid rgba(124,92,255,0.25);
  }
  .icl-timer {
    flex-shrink: 0; display: flex; flex-direction: column;
    align-items: center; gap: 2px;
  }
  .icl-ring { position: relative; width: 48px; height: 48px; }
  .icl-ring svg { transform: rotate(-90deg); }
  .icl-ring-track { fill: none; stroke: rgba(74,222,128,0.15); stroke-width: 3; }
  .icl-ring-fill  { fill: none; stroke: #4ade80; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
  .icl-ring-num {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 0.8rem; font-weight: 700;
    color: #4ade80; font-variant-numeric: tabular-nums;
  }
  .icl-timer-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(245,247,255,0.3); }
  .icl-divider { height: 1px; background: rgba(74,222,128,0.12); }
  .icl-actions {
    padding: 16px 22px 20px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .icl-accept {
    padding: 15px; border-radius: 999px; border: none;
    font-size: 0.95rem; font-weight: 700; font-family: inherit; cursor: pointer;
    background: linear-gradient(120deg, #4ade80 0%, #22d3ee 100%);
    color: #041a0a;
    box-shadow: 0 8px 24px rgba(74,222,128,0.35);
    transition: opacity 0.15s, transform 0.15s;
  }
  .icl-accept:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .icl-accept:disabled { opacity: 0.4; cursor: not-allowed; }
  .icl-decline {
    padding: 15px; border-radius: 999px;
    font-size: 0.95rem; font-weight: 600; font-family: inherit; cursor: pointer;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(245,247,255,0.6);
    transition: opacity 0.15s, transform 0.15s;
  }
  .icl-decline:hover:not(:disabled) { opacity: 0.8; transform: translateY(-1px); }
  .icl-decline:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const WINDOW_SECS = Math.floor(CALL_REQUEST_WINDOW_MS / 1000);
const CIRC = 2 * Math.PI * 20;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function IncomingCallListener() {
  const { session, status } = useAuth();
  const { client } = useAbly();
  const router = useRouter();

  const userId = session?.user?.id ?? "";

  const [request, setRequest] = useState<IncomingRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECS);
  const [responding, setResponding] = useState(false);
  const didRespondRef = useRef(false);
  const ringtoneRef = useRef<number | null>(null);

  /* ── prime audio on mount ── */
  useEffect(() => { primeAudioContext(); }, []);

  /* ── request notification permission on mount ── */
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const stopRingtone = () => {
    if (ringtoneRef.current) { window.clearInterval(ringtoneRef.current); ringtoneRef.current = null; }
  };

  const loadRequest = useCallback(async () => {
    try {
      const res = await fetch("/api/calls/incoming");
      if (!res.ok) return;
      const data = await res.json() as { requests: IncomingRequest[] };
      const pending = data.requests[0] ?? null;
      if (pending) {
        const secs = Math.max(0, Math.floor((new Date(pending.expiresAt).getTime() - Date.now()) / 1000));
        setSecondsLeft(secs);
        didRespondRef.current = false;
      }
      setRequest(pending);
    } catch {}
  }, []);

  /* ── Ably subscription (primary) ── */
  useEffect(() => {
    if (!userId || !client || status !== "authenticated") return;
    const channel = client.channels.get(`user:${userId}`);

    const handleIncoming = () => {
      void loadRequest();
      playRingtone();
      ringtoneRef.current = window.setInterval(playRingtone, 6000);
      if ("Notification" in window && Notification.permission === "granted") {
        void fetch("/api/calls/incoming").then(async (r) => {
          if (!r.ok) return;
          const d = await r.json() as { requests: IncomingRequest[] };
          const req = d.requests[0];
          if (!req) return;
          new Notification(`📞 ${req.caller} is calling`, {
            body: `${req.ratePerMinute} · ${req.mode === "video" ? "Video" : "Voice"} · ${WINDOW_SECS}s to accept`,
            tag: "incoming-call",
            requireInteraction: true,
          });
        });
      }
    };

    channel.subscribe("incoming_call", handleIncoming);
    return () => {
      channel.unsubscribe("incoming_call", handleIncoming);
      stopRingtone();
    };
  }, [client, userId, status, loadRequest]);

  /* ── Polling fallback (catches missed Ably events) ── */
  useEffect(() => {
    if (!userId || status !== "authenticated") return;
    // Poll every 4 seconds — fast enough to catch a 90s window
    const interval = window.setInterval(() => {
      // Only poll if no request is currently showing
      // to avoid interrupting an active overlay
      setRequest((current) => {
        if (!current) void loadRequest();
        return current;
      });
    }, 4000);
    return () => window.clearInterval(interval);
  }, [userId, status, loadRequest]);

  /* ── countdown ── */
  useEffect(() => {
    if (!request) return;
    if (secondsLeft <= 0) { setRequest(null); stopRingtone(); return; }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [request, secondsLeft]);

  /* ── stop ringtone when dismissed ── */
  useEffect(() => { if (!request) stopRingtone(); }, [request]);

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
        action === "accept" ? router.push(payload.redirectTo) : router.replace(payload.redirectTo);
      }
    } catch {
      didRespondRef.current = false;
      setResponding(false);
    }
  }

  if (!request) return null;

  const offset = CIRC * (1 - secondsLeft / WINDOW_SECS);

  return (
    <>
      <style>{css}</style>
      {/* backdrop dims the page so receiver can't miss it */}
      <div className="icl-backdrop" onClick={() => {}} />
      <div className="icl-overlay" role="alertdialog" aria-modal="true" aria-label="Incoming call">
        <div className="icl-card">
          <div className="icl-top">
            <div className="icl-avatar">{initials(request.caller)}</div>
            <div className="icl-info">
              <div className="icl-eyebrow"><span className="icl-dot" />Incoming call</div>
              <div className="icl-caller">@{request.caller}</div>
              <div className="icl-meta">
                <span className="icl-rate">{request.ratePerMinute}</span>
                <span className="icl-mode">{request.mode === "video" ? "Video" : "Voice"}</span>
              </div>
            </div>
            <div className="icl-timer">
              <div className="icl-ring">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle className="icl-ring-track" cx="24" cy="24" r="20" />
                  <circle className="icl-ring-fill" cx="24" cy="24" r="20"
                    strokeDasharray={CIRC} strokeDashoffset={offset} />
                </svg>
                <div className="icl-ring-num">{secondsLeft}</div>
              </div>
              <div className="icl-timer-label">secs</div>
            </div>
          </div>
          <div className="icl-divider" />
          <div className="icl-actions">
            <button className="icl-accept" onClick={() => respond("accept")} disabled={responding}>
              {responding ? "Connecting…" : "✓ Accept"}
            </button>
            <button className="icl-decline" onClick={() => respond("decline")} disabled={responding}>
              Decline
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
