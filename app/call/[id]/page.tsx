"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ConnectionState,
  Participant,
  ParticipantEvent,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import AuthGuard from "@/components/auth/AuthGuard";
import { TOKEN_UNIT_USD } from "@/lib/constants";
import styles from "../call.module.css";

const PREVIEW_SECONDS = 30;
const CONTROLS_HIDE_MS = 4000;

type ConnectionStateLabel = "connecting" | "connected" | "reconnecting" | "disconnected" | "ended";

type CallSummary = {
  id: string;
  caller: string;
  receiver: string;
  mode: "voice" | "video";
  status: "ringing" | "connected" | "ended";
  joinable: boolean;
  viewerRole: "caller" | "receiver";
  ratePerSecondTokens: number;
};

type CallStateResponse = {
  call?: CallSummary;
  redirectTo?: string | null;
};

function mapConnectionState(state: ConnectionState): ConnectionStateLabel {
  if (state === ConnectionState.Connected) return "connected";
  if (state === ConnectionState.Reconnecting) return "reconnecting";
  if (state === ConnectionState.Disconnected) return "disconnected";
  return "connecting";
}

/* ── Icons ───────────────────────────────────────────────── */
function IconMic({ crossed }: { crossed?: boolean }) {
  if (crossed) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconCamera({ crossed }: { crossed?: boolean }) {
  if (crossed) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h2a2 2 0 0 1 2 2v9.34" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7L16 12 23 17V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconSpeaker({ muted }: { muted?: boolean }) {
  if (muted) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconEndCall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 9.9" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconFullscreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function IconExitFullscreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

/* ── Voice visualiser ────────────────────────────────────── */
function VoiceVisualiser({ participant, active }: { participant: Participant | null; active: boolean }) {
  const bars = 5;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 5, height: 48,
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 4, borderRadius: 2,
          background: active ? "rgba(90,110,255,0.8)" : "rgba(255,255,255,0.15)",
          height: active ? `${20 + Math.sin(Date.now() / 200 + i) * 20}%` : "15%",
          transition: "height 0.15s ease, background 0.3s ease",
          animation: active ? `voiceBar${i} 0.8s ease-in-out infinite alternate` : "none",
          animationDelay: `${i * 0.12}s`,
        }} />
      ))}
      <style>{`
        @keyframes voiceBar0 { from{height:20%} to{height:70%} }
        @keyframes voiceBar1 { from{height:30%} to{height:90%} }
        @keyframes voiceBar2 { from{height:50%} to{height:100%} }
        @keyframes voiceBar3 { from{height:25%} to{height:80%} }
        @keyframes voiceBar4 { from{height:15%} to{height:65%} }
      `}</style>
    </div>
  );
}

/* ── ParticipantMedia ────────────────────────────────────── */
function ParticipantMedia({
  participant, isLocal, speakerOn, onVideoRef, showVideo,
}: {
  participant: Participant;
  isLocal: boolean;
  speakerOn: boolean;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  showVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<{ video: Track[]; audio: Track[] }>(() => ({ video: [], audio: [] }));
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const update = () => {
      const video: Track[] = [];
      const audio: Track[] = [];
      participant.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.kind === Track.Kind.Video) video.push(pub.track);
        if (pub.kind === Track.Kind.Audio) audio.push(pub.track);
      });
      setTracks({ video, audio });
    };
    update();
    participant.on(ParticipantEvent.TrackPublished, update);
    participant.on(ParticipantEvent.TrackUnpublished, update);
    participant.on(ParticipantEvent.TrackSubscribed, update);
    participant.on(ParticipantEvent.TrackUnsubscribed, update);
    participant.on(ParticipantEvent.TrackMuted, update);
    participant.on(ParticipantEvent.TrackUnmuted, update);
    participant.on(ParticipantEvent.LocalTrackPublished, update);
    participant.on(ParticipantEvent.LocalTrackUnpublished, update);

    // Speaking indicator
    const onSpeaking = () => setIsSpeaking(true);
    const onSilent = () => setIsSpeaking(false);
    participant.on(ParticipantEvent.IsSpeakingChanged, (speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      participant.off(ParticipantEvent.TrackPublished, update);
      participant.off(ParticipantEvent.TrackUnpublished, update);
      participant.off(ParticipantEvent.TrackSubscribed, update);
      participant.off(ParticipantEvent.TrackUnsubscribed, update);
      participant.off(ParticipantEvent.TrackMuted, update);
      participant.off(ParticipantEvent.TrackUnmuted, update);
      participant.off(ParticipantEvent.LocalTrackPublished, update);
      participant.off(ParticipantEvent.LocalTrackUnpublished, update);
    };
  }, [participant]);

  const videoTrack = tracks.video[0] ?? null;
  const audioTrack = tracks.audio[0] ?? null;

  useEffect(() => {
    const el = videoRef.current;
    if (!videoTrack || !el) return;
    videoTrack.attach(el);
    onVideoRef?.(el);
    return () => { try { videoTrack.detach(el); } catch {} };
  }, [videoTrack, onVideoRef]);

  useEffect(() => {
    if (isLocal) return;
    const el = audioRef.current;
    if (!audioTrack || !el) return;
    audioTrack.attach(el);
    return () => { try { audioTrack.detach(el); } catch {} };
  }, [isLocal, audioTrack]);

  useEffect(() => {
    if (isLocal || !audioRef.current) return;
    audioRef.current.muted = !speakerOn;
  }, [isLocal, speakerOn]);

  const hasVideo = tracks.video.length > 0;

  return (
    <>
      {showVideo && hasVideo ? (
        <video
          ref={(el) => { videoRef.current = el; onVideoRef?.(el); }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          autoPlay playsInline muted={isLocal}
        />
      ) : null}
      {!isLocal ? <audio ref={audioRef} autoPlay playsInline muted={!speakerOn} /> : null}
      {/* Speaking indicator ring — shown on remote participant */}
      {!isLocal && isSpeaking ? (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          border: "2px solid rgba(90,200,90,0.7)",
          animation: "speakingRing 1s ease-in-out infinite",
          pointerEvents: "none",
        }}>
          <style>{`@keyframes speakingRing { 0%,100%{opacity:0.7} 50%{opacity:0.3} }`}</style>
        </div>
      ) : null}
    </>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function ActiveCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [summaryRevision, setSummaryRevision] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionStateLabel>("connecting");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [walletTokens, setWalletTokens] = useState<number | null>(null);

  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const didRedirectRef = useRef(false);
  const didConnectRef = useRef(false);
  const connectingRef = useRef(false);
  const allowConnectRef = useRef(true);
  const lastConnectAttemptRevisionRef = useRef<number | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const updateSummary = (next: CallSummary | null) => {
    setSummary(next);
    setSummaryRevision((p) => p + 1);
  };

  /* ── reset on id change ── */
  useEffect(() => {
    didConnectRef.current = false;
    connectingRef.current = false;
    allowConnectRef.current = true;
    lastConnectAttemptRevisionRef.current = null;
    setRoom(null);
  }, [id]);

  /* ── load call summary ── */
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/calls/active?id=${id}`);
      if (!res.ok) {
        const p = await res.json().catch(() => null);
        setError(p?.error?.message ?? "Unable to load call state.");
        return;
      }
      const data = await res.json() as CallStateResponse;
      if (data.redirectTo && !didRedirectRef.current && pathname !== data.redirectTo) {
        didRedirectRef.current = true;
        router.replace(data.redirectTo);
        return;
      }
      updateSummary(data.call ?? null);
    }
    void load();
  }, [id, pathname, router]);

  /* ── load wallet balance for low-balance warning ── */
  useEffect(() => {
    if (!summary || summary.viewerRole !== "caller") return;
    void fetch("/api/wallet").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json() as { availableTokens?: number };
      setWalletTokens(d.availableTokens ?? null);
    });
  }, [summary?.viewerRole]);

  /* ── set camera based on mode ── */
  const isReceiverVideo = summary?.mode === "video" && summary?.viewerRole === "receiver";
  useEffect(() => {
    if (summary?.mode !== "video") { setCameraOn(false); return; }
    if (isReceiverVideo) setCameraOn(true);
  }, [isReceiverVideo, summary?.mode]);

  useEffect(() => {
    if (!isReceiverVideo) return;
    if (!cameraOn) setCameraPromptOpen(true);
    else setCameraPromptOpen(false);
  }, [cameraOn, isReceiverVideo]);

  /* ── call timer ── */
  useEffect(() => {
    if (connectionState !== "connected") return;
    const t = window.setInterval(() => setSecondsElapsed((p) => p + 1), 1000);
    return () => window.clearInterval(t);
  }, [connectionState]);

  /* ── room event handlers ── */
  useEffect(() => {
    if (!room) return;
    const updateParticipants = () => setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    const handleState = (state: ConnectionState) => setConnectionState(mapConnectionState(state));
    room.on(RoomEvent.ConnectionStateChanged, handleState);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    updateParticipants();
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleState);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
      room.localParticipant.trackPublications.forEach((pub) => pub.track?.stop());
      room.disconnect();
      room.removeAllListeners();
      roomRef.current = null;
    };
  }, [room]);

  /* ── connect to LiveKit ── */
  useEffect(() => {
    if (!summary?.joinable || !allowConnectRef.current) return;
    if (didConnectRef.current || connectingRef.current) return;
    if (lastConnectAttemptRevisionRef.current === summaryRevision) return;
    lastConnectAttemptRevisionRef.current = summaryRevision;
    setConnectionState("connecting");
    setError(null);
    let activeRoom = roomRef.current;
    if (!activeRoom) {
      activeRoom = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = activeRoom;
      setRoom(activeRoom);
    }
    const capturedSummary = summary;
    connectingRef.current = true;
    const connect = async () => {
      const res = await fetch(`/api/livekit/token?callId=${id}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const code = payload?.error?.code;
        if (res.status === 403 && code === "call_not_joinable") {
          const e = new Error("Call not joinable yet") as Error & { code?: string };
          e.code = "call_not_joinable"; throw e;
        }
        throw new Error(payload?.error?.message || "Failed to fetch token");
      }
      const livekitUrl = String(payload.url);
      const livekitToken = typeof payload.token === "string" ? payload.token
        : typeof payload.token?.token === "string" ? payload.token.token : String(payload.token ?? "");
      if (!livekitToken || livekitToken === "[object Object]" || !livekitToken.startsWith("eyJ"))
        throw new Error(`Invalid token: ${JSON.stringify(payload.token ?? null)}`);
      await activeRoom!.connect(livekitUrl, livekitToken);
      setRemoteParticipants(Array.from(activeRoom!.remoteParticipants.values()));
      const enableCamera = capturedSummary.mode === "video";
      await activeRoom!.localParticipant.setMicrophoneEnabled(true);
      await activeRoom!.localParticipant.setCameraEnabled(enableCamera);
      setMuted(false);
      setCameraOn(enableCamera);
    };
    connect().then(() => { didConnectRef.current = true; })
      .catch((err: unknown) => {
        const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : undefined;
        if (code === "call_not_joinable") { connectingRef.current = false; return; }
        const msg = err instanceof Error ? err.message : "Unable to connect.";
        setError(msg);
        setConnectionState("disconnected");
        if (msg.includes("Invalid") || msg.includes("Unauthorized") || msg.includes("403")) allowConnectRef.current = false;
        setRoom(null);
      })
      .finally(() => { connectingRef.current = false; });
  }, [id, summary, summaryRevision]);

  /* ── poll for state changes ── */
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const res = await fetch(`/api/calls/active?id=${id}`);
      if (!res.ok || !mounted) return;
      const data = await res.json() as CallStateResponse;
      if (data.redirectTo && !didRedirectRef.current && pathname !== data.redirectTo) {
        didRedirectRef.current = true;
        router.replace(data.redirectTo);
      }
      if (data.call) updateSummary(data.call);
    };
    const ms = summary?.joinable ? (connectionState === "connected" ? 5000 : 3000) : 1000;
    const t = window.setInterval(() => void poll(), ms);
    return () => { mounted = false; window.clearInterval(t); };
  }, [connectionState, id, pathname, router, summary?.joinable]);

  /* ── controls auto-hide on video ── */
  const resetControlsTimer = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    if (summary?.mode === "video") {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    }
  };

  useEffect(() => {
    if (summary?.mode !== "video") { setControlsVisible(true); return; }
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current); };
  }, [summary?.mode]);

  /* ── computed values ── */
  const billedSeconds = Math.max(0, secondsElapsed - PREVIEW_SECONDS);
  const ratePerSec = summary?.ratePerSecondTokens ?? 0;

  const liveCost = useMemo(() => {
    if (!billedSeconds || !ratePerSec) return null;
    return (billedSeconds * ratePerSec * TOKEN_UNIT_USD).toFixed(2);
  }, [billedSeconds, ratePerSec]);

  const liveEarnings = useMemo(() => {
    if (!billedSeconds || !ratePerSec) return null;
    // Receiver gets ~85% after platform fee — adjust if you have the exact rate
    return (billedSeconds * ratePerSec * TOKEN_UNIT_USD * 0.85).toFixed(2);
  }, [billedSeconds, ratePerSec]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
    const s = (secondsElapsed % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsElapsed]);

  const isBillingActive = connectionState === "connected" && secondsElapsed >= PREVIEW_SECONDS;
  const previewRemaining = Math.max(0, PREVIEW_SECONDS - secondsElapsed);

  // Low balance warning: remaining balance covers less than 60s at current rate
  const lowBalance = useMemo(() => {
    if (!walletTokens || !ratePerSec || summary?.viewerRole !== "caller") return false;
    const remainingTokens = walletTokens - billedSeconds * ratePerSec;
    return remainingTokens < ratePerSec * 60;
  }, [walletTokens, ratePerSec, billedSeconds, summary?.viewerRole]);

  const counterparty = summary
    ? summary.viewerRole === "caller" ? summary.receiver : summary.caller
    : "...";

  const projectedCost = useMemo(() => {
    if (!liveCost) return null;
    return `$${liveCost}`;
  }, [liveCost]);

  /* ── handlers ── */
  async function handleToggleMic() {
    const r = roomRef.current; if (!r) return;
    const next = !muted; setMuted(next);
    await r.localParticipant.setMicrophoneEnabled(!next);
  }

  async function handleToggleCamera() {
    if (summary?.mode !== "video") return;
    const r = roomRef.current; if (!r) return;
    const next = !cameraOn; setCameraOn(next);
    await r.localParticipant.setCameraEnabled(next);
  }

  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function handleEndCall() {
    setConfirmOpen(false);
    setConnectionState("ended");
    const r = roomRef.current;
    if (r) {
      r.localParticipant.trackPublications.forEach((pub) => pub.track?.stop());
      await Promise.resolve(r.disconnect());
      r.removeAllListeners();
      roomRef.current = null; setRoom(null);
    }
    const res = await fetch("/api/calls/end", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId: id }),
    });
    if (!res.ok) {
      const p = await res.json().catch(() => null);
      setError(p?.error?.message ?? "Unable to end call."); return;
    }
    router.push(`/call/${id}/receipt`);
  }

  const isVideo = summary?.mode === "video";
  const micState = muted ? "muted" : undefined;
  const camState = !isVideo ? "cam-off" : cameraOn ? undefined : "cam-off";
  const remoteParticipant = remoteParticipants[0] ?? null;
  const remoteHasVideo = remoteParticipant
    ? Array.from(remoteParticipant.trackPublications.values()).some(p => p.kind === Track.Kind.Video && p.track)
    : false;

  return (
    <AuthGuard>
      <style>{`
        .bam-call-page {
          position: relative; min-height: 100vh; background: #02040c;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .bam-call-page:fullscreen { background: #000; }
        /* ── fullscreen video bg ── */
        .bam-call-video-bg {
          position: absolute; inset: 0; z-index: 0;
        }
        .bam-call-video-bg video {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .bam-call-video-bg-placeholder {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; background: #060810;
          color: rgba(245,247,255,0.2); font-size: 0.95rem;
          font-family: -apple-system, system-ui, sans-serif;
        }
        /* ── HUD overlay ── */
        .bam-call-hud {
          position: absolute; top: 0; left: 0; right: 0; z-index: 10;
          padding: 20px 24px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          transition: opacity 0.35s ease;
        }
        .bam-call-hud-hidden { opacity: 0; pointer-events: none; }
        .bam-call-hud-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bam-call-hud-right { display: flex; align-items: center; gap: 8px; }
        /* HUD pills */
        .bam-hud-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px; font-size: 0.78rem;
          font-weight: 600; font-family: -apple-system, system-ui, sans-serif;
          backdrop-filter: blur(8px);
        }
        .bam-hud-timer {
          background: rgba(0,0,0,0.5); color: #f5f7ff;
          border: 1px solid rgba(255,255,255,0.15);
          font-variant-numeric: tabular-nums;
        }
        .bam-hud-preview {
          background: rgba(90,110,255,0.25); color: #c4b5fd;
          border: 1px solid rgba(90,110,255,0.4);
        }
        .bam-hud-cost {
          background: rgba(220,38,38,0.35); color: #fca5a5;
          border: 1px solid rgba(220,38,38,0.5);
        }
        .bam-hud-earn {
          background: rgba(22,163,74,0.35); color: #86efac;
          border: 1px solid rgba(22,163,74,0.5);
        }
        .bam-hud-warn {
          background: rgba(234,179,8,0.3); color: #fde047;
          border: 1px solid rgba(234,179,8,0.5);
          animation: bam-warn-pulse 1.5s ease-in-out infinite;
        }
        @keyframes bam-warn-pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .bam-hud-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        /* ── self-view PiP ── */
        .bam-call-pip {
          position: absolute; bottom: 100px; right: 20px; z-index: 10;
          width: 120px; height: 80px; border-radius: 12px; overflow: hidden;
          border: 1.5px solid rgba(255,255,255,0.2);
          background: #0a0c18;
          cursor: move;
          transition: opacity 0.35s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }
        .bam-call-pip video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bam-call-pip-hidden { opacity: 0; pointer-events: none; }
        /* ── voice call view ── */
        .bam-call-voice-view {
          position: absolute; inset: 0; z-index: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 20px; padding: 48px 24px;
          font-family: -apple-system, system-ui, sans-serif;
        }
        .bam-call-voice-avatar {
          width: 96px; height: 96px; border-radius: 50%;
          background: rgba(90,110,255,0.2); border: 2px solid rgba(90,110,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 700; color: #a5b4ff;
        }
        .bam-call-voice-name {
          font-size: 1.4rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em;
        }
        .bam-call-voice-status {
          font-size: 0.88rem; color: rgba(245,247,255,0.5);
        }
        /* ── controls bar ── */
        .bam-call-controls-wrap {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
          padding: 16px 24px 28px;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
          transition: opacity 0.35s ease;
        }
        .bam-call-controls-wrap-hidden { opacity: 0; pointer-events: none; }
        /* ── voice non-video fallback layout ── */
        .bam-call-fallback {
          position: relative; min-height: 100vh; background: #05070f;
          display: flex; flex-direction: column;
          font-family: -apple-system, system-ui, sans-serif;
        }
        .bam-call-fallback-inner {
          flex: 1; display: flex; flex-direction: column;
          padding: 80px 24px 140px; align-items: center; justify-content: center;
          gap: 28px;
        }
      `}</style>

      {isVideo ? (
        /* ── VIDEO CALL: fullscreen layout ── */
        <div
          ref={pageRef}
          className="bam-call-page"
          onMouseMove={resetControlsTimer}
          onClick={resetControlsTimer}
          onTouchStart={resetControlsTimer}
        >
          {/* Remote video — full bg */}
          <div className="bam-call-video-bg">
            {remoteParticipant && remoteHasVideo ? (
              <ParticipantMedia
                participant={remoteParticipant}
                isLocal={false}
                speakerOn={speakerOn}
                showVideo={true}
              />
            ) : (
              <div className="bam-call-video-bg-placeholder">
                {connectionState === "connected" ? `@${counterparty} has no video` : "Connecting…"}
              </div>
            )}
          </div>

          {/* HUD — top overlay */}
          <div className={`bam-call-hud${!controlsVisible ? " bam-call-hud-hidden" : ""}`}>
            <div className="bam-call-hud-left">
              <span className="bam-hud-pill bam-hud-timer">
                <span className="bam-hud-dot" style={{ background: "#82f0b4" }} />
                {formattedTime}
              </span>
              {!isBillingActive && connectionState === "connected" ? (
                <span className="bam-hud-pill bam-hud-preview">
                  Free preview: {previewRemaining}s
                </span>
              ) : null}
              {isBillingActive && summary.viewerRole === "caller" && liveCost ? (
                <span className="bam-hud-pill bam-hud-cost">
                  ${liveCost} spent
                </span>
              ) : null}
              {isBillingActive && summary.viewerRole === "receiver" && liveEarnings ? (
                <span className="bam-hud-pill bam-hud-earn">
                  +${liveEarnings} earned
                </span>
              ) : null}
              {lowBalance ? (
                <span className="bam-hud-pill bam-hud-warn">
                  ⚠ Low balance
                </span>
              ) : null}
            </div>
            <div className="bam-call-hud-right">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                style={{
                  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50%", width: 36, height: 36, display: "flex",
                  alignItems: "center", justifyContent: "center", cursor: "pointer",
                  color: "rgba(245,247,255,0.7)",
                }}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <span style={{ width: 18, height: 18, display: "flex" }}>
                  {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
                </span>
              </button>
            </div>
          </div>

          {/* Self-view PiP */}
          <div className={`bam-call-pip${!controlsVisible ? " bam-call-pip-hidden" : ""}`}>
            {room && cameraOn ? (
              <ParticipantMedia
                participant={room.localParticipant}
                isLocal={true}
                speakerOn={speakerOn}
                showVideo={true}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "rgba(245,247,255,0.3)", fontSize: "0.65rem",
              }}>
                Camera off
              </div>
            )}
          </div>

          {/* Controls bar — bottom overlay */}
          <div className={`bam-call-controls-wrap${!controlsVisible ? " bam-call-controls-wrap-hidden" : ""}`}>
            <div className={styles.controls}>
              <div className={styles.controlsGroup}>
                <button className={styles.iconButton} type="button"
                  data-active={!muted ? "true" : undefined} data-state={micState}
                  data-ctrl="mic" data-tip={muted ? "Unmute" : "Mute"}
                  aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted}
                  onClick={handleToggleMic}>
                  <div className={styles.iconButtonFace}><IconMic crossed={muted} /></div>
                  <span className={styles.iconButtonLabel}>{muted ? "Muted" : "Mic"}</span>
                </button>
                <button className={styles.iconButton} type="button"
                  data-active={cameraOn ? "true" : undefined} data-state={camState}
                  data-tip={cameraOn ? "Camera off" : "Camera on"}
                  aria-label={cameraOn ? "Turn off camera" : "Turn on camera"} aria-pressed={cameraOn}
                  onClick={handleToggleCamera}>
                  <div className={styles.iconButtonFace}><IconCamera crossed={!cameraOn} /></div>
                  <span className={styles.iconButtonLabel}>{cameraOn ? "Camera" : "Cam off"}</span>
                </button>
                <button className={styles.iconButton} type="button"
                  data-active={speakerOn ? "true" : undefined}
                  data-tip={speakerOn ? "Mute speaker" : "Unmute speaker"}
                  aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"} aria-pressed={speakerOn}
                  onClick={() => setSpeakerOn((p) => !p)}>
                  <div className={styles.iconButtonFace}><IconSpeaker muted={!speakerOn} /></div>
                  <span className={styles.iconButtonLabel}>{speakerOn ? "Speaker" : "Muted"}</span>
                </button>
              </div>
              <div className={styles.controlsDivider} />
              <div className={styles.controlsGroup}>
                <button className={`${styles.iconButton} ${styles.iconButtonEnd}`} type="button"
                  data-tip="End call" aria-label="End call"
                  onClick={() => setConfirmOpen(true)}>
                  <div className={styles.iconButtonFace}><IconEndCall /></div>
                  <span className={styles.iconButtonLabel}>End</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error ? (
            <div style={{
              position: "absolute", top: 80, left: 24, right: 24, zIndex: 20,
              background: "rgba(45,10,20,0.9)", border: "1px solid rgba(255,120,160,0.4)",
              borderRadius: 12, padding: "12px 16px",
              color: "rgba(255,180,180,0.95)", fontSize: "0.88rem",
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}>
              {error}
            </div>
          ) : null}
        </div>
      ) : (
        /* ── VOICE CALL: dark card layout ── */
        <AuthGuard>
          <div className="bam-call-fallback">
            {/* HUD strip at top */}
            <div style={{
              padding: "16px 24px",
              background: "rgba(5,7,15,0.95)",
              borderBottom: "1px solid rgba(90,110,255,0.15)",
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}>
              <span className="bam-hud-pill bam-hud-timer" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 999, fontSize: "0.78rem",
                fontWeight: 600, background: "rgba(0,0,0,0.4)",
                color: "#f5f7ff", border: "1px solid rgba(255,255,255,0.15)",
                fontVariantNumeric: "tabular-nums",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#82f0b4", display: "inline-block" }} />
                {formattedTime}
              </span>
              {!isBillingActive && connectionState === "connected" ? (
                <span style={{
                  display: "inline-flex", padding: "5px 12px", borderRadius: 999,
                  fontSize: "0.78rem", fontWeight: 600,
                  background: "rgba(90,110,255,0.2)", color: "#c4b5fd",
                  border: "1px solid rgba(90,110,255,0.35)",
                }}>
                  Free preview: {previewRemaining}s remaining
                </span>
              ) : null}
              {isBillingActive && summary?.viewerRole === "caller" && liveCost ? (
                <span style={{
                  display: "inline-flex", padding: "5px 12px", borderRadius: 999,
                  fontSize: "0.78rem", fontWeight: 600,
                  background: "rgba(220,38,38,0.25)", color: "#fca5a5",
                  border: "1px solid rgba(220,38,38,0.4)",
                }}>
                  ${liveCost} spent
                </span>
              ) : null}
              {isBillingActive && summary?.viewerRole === "receiver" && liveEarnings ? (
                <span style={{
                  display: "inline-flex", padding: "5px 12px", borderRadius: 999,
                  fontSize: "0.78rem", fontWeight: 600,
                  background: "rgba(22,163,74,0.2)", color: "#86efac",
                  border: "1px solid rgba(22,163,74,0.35)",
                }}>
                  +${liveEarnings} earned
                </span>
              ) : null}
              {lowBalance ? (
                <span style={{
                  display: "inline-flex", padding: "5px 12px", borderRadius: 999,
                  fontSize: "0.78rem", fontWeight: 600,
                  background: "rgba(234,179,8,0.2)", color: "#fde047",
                  border: "1px solid rgba(234,179,8,0.35)",
                  animation: "bam-warn-pulse 1.5s ease-in-out infinite",
                }}>
                  ⚠ Low balance — less than 60s remaining
                </span>
              ) : null}
            </div>

            {/* Voice call centre */}
            <div className="bam-call-fallback-inner">
              <div className="bam-call-voice-avatar">
                {counterparty.slice(0, 2).toUpperCase()}
              </div>
              <div className="bam-call-voice-name">@{counterparty}</div>
              <div className="bam-call-voice-status">
                {connectionState === "connected" ? "Voice call in progress" : "Connecting…"}
              </div>
              <VoiceVisualiser
                participant={remoteParticipant}
                active={connectionState === "connected"}
              />
              {/* Hidden audio elements */}
              {room ? (
                <ParticipantMedia
                  participant={room.localParticipant}
                  isLocal={true}
                  speakerOn={speakerOn}
                  showVideo={false}
                />
              ) : null}
              {remoteParticipant ? (
                <ParticipantMedia
                  participant={remoteParticipant}
                  isLocal={false}
                  speakerOn={speakerOn}
                  showVideo={false}
                />
              ) : null}
              {error ? (
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(45,10,20,0.9)", border: "1px solid rgba(255,120,160,0.4)",
                  color: "rgba(255,180,180,0.95)", fontSize: "0.88rem", maxWidth: 400, textAlign: "center",
                }}>
                  {error}
                </div>
              ) : null}
            </div>

            {/* Controls */}
            <div style={{
              padding: "16px 24px 32px",
              background: "rgba(5,7,15,0.95)",
              borderTop: "1px solid rgba(90,110,255,0.15)",
            }}>
              <div className={styles.controls}>
                <div className={styles.controlsGroup}>
                  <button className={styles.iconButton} type="button"
                    data-active={!muted ? "true" : undefined} data-state={micState}
                    data-ctrl="mic" data-tip={muted ? "Unmute" : "Mute"}
                    aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted}
                    onClick={handleToggleMic}>
                    <div className={styles.iconButtonFace}><IconMic crossed={muted} /></div>
                    <span className={styles.iconButtonLabel}>{muted ? "Muted" : "Mic"}</span>
                  </button>
                  <button className={styles.iconButton} type="button"
                    data-active={speakerOn ? "true" : undefined}
                    data-tip={speakerOn ? "Mute speaker" : "Unmute speaker"}
                    aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"} aria-pressed={speakerOn}
                    onClick={() => setSpeakerOn((p) => !p)}>
                    <div className={styles.iconButtonFace}><IconSpeaker muted={!speakerOn} /></div>
                    <span className={styles.iconButtonLabel}>{speakerOn ? "Speaker" : "Muted"}</span>
                  </button>
                </div>
                <div className={styles.controlsDivider} />
                <div className={styles.controlsGroup}>
                  <button className={`${styles.iconButton} ${styles.iconButtonEnd}`} type="button"
                    data-tip="End call" aria-label="End call"
                    onClick={() => setConfirmOpen(true)}>
                    <div className={styles.iconButtonFace}><IconEndCall /></div>
                    <span className={styles.iconButtonLabel}>End</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AuthGuard>
      )}

      {/* End call confirmation modal */}
      {confirmOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setConfirmOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true"
            aria-labelledby="end-call-title"
            onKeyDown={(e) => e.key === "Escape" && setConfirmOpen(false)}
            onClick={(e) => e.stopPropagation()}>
            <h2 id="end-call-title" style={{ color: "#f5f7ff", fontSize: "1.1rem", fontWeight: 700 }}>
              End this call?
            </h2>
            {projectedCost ? (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: summary?.viewerRole === "caller"
                  ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)",
                border: `1px solid ${summary?.viewerRole === "caller"
                  ? "rgba(220,38,38,0.3)" : "rgba(22,163,74,0.3)"}`,
                fontSize: "0.9rem",
                color: summary?.viewerRole === "caller" ? "#fca5a5" : "#86efac",
                fontWeight: 600,
              }}>
                {summary?.viewerRole === "caller"
                  ? `You'll be charged approximately ${projectedCost}`
                  : `You've earned approximately ${projectedCost} this call`}
              </div>
            ) : (
              <p style={{ color: "rgba(245,247,255,0.6)", fontSize: "0.88rem" }}>
                The call will end immediately and a receipt will be generated.
              </p>
            )}
            <div className={styles.row}>
              <button ref={confirmRef}
                className={`${styles.button} ${styles.buttonDanger}`}
                type="button" onClick={handleEndCall}>
                End call
              </button>
              <button className={`${styles.button} ${styles.buttonSecondary}`}
                type="button" onClick={() => setConfirmOpen(false)}>
                Keep talking
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Camera required modal */}
      {cameraPromptOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cam-title">
            <h2 id="cam-title" style={{ color: "#f5f7ff", fontSize: "1.1rem", fontWeight: 700 }}>
              Camera required
            </h2>
            <p style={{ color: "rgba(245,247,255,0.6)", fontSize: "0.88rem" }}>
              Video calls require your camera to stay on. Please enable camera access to continue.
            </p>
            <div className={styles.row}>
              <button className={styles.button} type="button" onClick={() => {
                setCameraOn(true); setCameraPromptOpen(false);
                roomRef.current?.localParticipant.setCameraEnabled(true);
              }}>
                Enable camera
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthGuard>
  );
}
