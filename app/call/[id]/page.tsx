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
import styles from "../call.module.css";

const PREVIEW_SECONDS = 30;

type ConnectionStateLabel =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "ended";

type CallSummary = {
  id: string;
  caller: string;
  receiver: string;
  mode: "voice" | "video";
  status: "ringing" | "connected" | "ended";
  joinable: boolean;
  viewerRole: "caller" | "receiver";
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

function ParticipantMedia({
  participant,
  label,
  isLocal,
  speakerOn,
}: {
  participant: Participant;
  label: string;
  isLocal: boolean;
  speakerOn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<{ video: Track[]; audio: Track[] }>(
    () => ({ video: [], audio: [] })
  );

  useEffect(() => {
    const updateTracks = () => {
      const video: Track[] = [];
      const audio: Track[] = [];
      participant.trackPublications.forEach((publication) => {
        if (!publication.track) return;
        if (publication.kind === Track.Kind.Video) {
          video.push(publication.track);
        }
        if (publication.kind === Track.Kind.Audio) {
          audio.push(publication.track);
        }
      });
      setTracks({ video, audio });
    };

    updateTracks();

    participant.on(ParticipantEvent.TrackPublished, updateTracks);
    participant.on(ParticipantEvent.TrackUnpublished, updateTracks);
    participant.on(ParticipantEvent.TrackSubscribed, updateTracks);
    participant.on(ParticipantEvent.TrackUnsubscribed, updateTracks);
    participant.on(ParticipantEvent.TrackMuted, updateTracks);
    participant.on(ParticipantEvent.TrackUnmuted, updateTracks);
    participant.on(ParticipantEvent.LocalTrackPublished, updateTracks);
    participant.on(ParticipantEvent.LocalTrackUnpublished, updateTracks);

    return () => {
      participant.off(ParticipantEvent.TrackPublished, updateTracks);
      participant.off(ParticipantEvent.TrackUnpublished, updateTracks);
      participant.off(ParticipantEvent.TrackSubscribed, updateTracks);
      participant.off(ParticipantEvent.TrackUnsubscribed, updateTracks);
      participant.off(ParticipantEvent.TrackMuted, updateTracks);
      participant.off(ParticipantEvent.TrackUnmuted, updateTracks);
      participant.off(ParticipantEvent.LocalTrackPublished, updateTracks);
      participant.off(ParticipantEvent.LocalTrackUnpublished, updateTracks);
    };
  }, [participant]);

  const videoTrack = tracks.video[0] ?? null;
  const audioTrack = tracks.audio[0] ?? null;

  useEffect(() => {
    const track = videoTrack;
    const element = videoRef.current;
    if (!track || !element) return;
    track.attach(element);
    return () => {
      try {
        track.detach(element);
      } catch {}
    };
  }, [videoTrack]);

  useEffect(() => {
    if (isLocal) return;
    const track = audioTrack;
    const element = audioRef.current;
    if (!track || !element) return;
    track.attach(element);
    return () => {
      try {
        track.detach(element);
      } catch {}
    };
  }, [isLocal, audioTrack]);

  useEffect(() => {
    if (isLocal) return;
    if (audioRef.current) {
      audioRef.current.muted = !speakerOn;
    }
  }, [isLocal, speakerOn]);

  const hasVideo = tracks.video.length > 0;

  return (
    <div className={styles.mediaTile}>
      <p className={styles.subtitle}>{label}</p>
      {hasVideo ? (
        <video
          ref={videoRef}
          className={styles.mediaVideo}
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className={styles.mediaPlaceholder}>
          <span>No video</span>
        </div>
      )}
      {!isLocal ? (
        <audio ref={audioRef} autoPlay playsInline muted={!speakerOn} />
      ) : null}
    </div>
  );
}

/* ─── SVG icon components ─────────────────────────────────── */

function IconMic({ crossed }: { crossed?: boolean }) {
  if (crossed) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconCamera({ crossed }: { crossed?: boolean }) {
  if (crossed) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h2a2 2 0 0 1 2 2v9.34" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7L16 12 23 17V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconSpeaker({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconCaptions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="5" y1="10" x2="11" y2="10" />
      <line x1="5" y1="14" x2="19" y2="14" />
      <line x1="13" y1="10" x2="19" y2="10" />
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

/* ─── Main page ───────────────────────────────────────────── */

export default function ActiveCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [summaryRevision, setSummaryRevision] = useState(0);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionStateLabel>(
    "connecting"
  );
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const didRedirectRef = useRef(false);
  const didStartConnectRef = useRef(false);
  const didConnectRef = useRef(false);
  const connectingRef = useRef(false);
  const allowConnectRef = useRef(true);
  const lastConnectAttemptRevisionRef = useRef<number | null>(null);

  const updateSummary = (nextSummary: CallSummary | null) => {
    setSummary(nextSummary);
    setSummaryRevision((prev) => prev + 1);
  };

  useEffect(() => {
    didStartConnectRef.current = false;
    didConnectRef.current = false;
    connectingRef.current = false;
    allowConnectRef.current = true;
    lastConnectAttemptRevisionRef.current = null;
    setRoom(null);
  }, [id]);

  useEffect(() => {
    async function loadCall() {
      const res = await fetch(`/api/calls/active?id=${id}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error?.message ?? "Unable to load call state.");
        return;
      }
      const data = (await res.json()) as CallStateResponse;
      if (data.redirectTo && !didRedirectRef.current) {
        if (pathname !== data.redirectTo) {
          didRedirectRef.current = true;
          router.replace(data.redirectTo);
        }
        return;
      }
      updateSummary(data.call ?? null);
    }
    loadCall();
  }, [id, pathname, router]);

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
    if (summary?.mode !== "video") {
      setCameraOn(false);
      return;
    }
    if (isReceiverVideo) {
      setCameraOn(true);
    }
  }, [isReceiverVideo, summary?.mode]);

  useEffect(() => {
    if (!isReceiverVideo) return;
    if (!cameraOn) {
      setCameraPromptOpen(true);
      return;
    }
    setCameraPromptOpen(false);
  }, [cameraOn, isReceiverVideo]);

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    };

    const handleConnectionState = (state: ConnectionState) => {
      setConnectionState(mapConnectionState(state));
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionState);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);

    updateParticipants();

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionState);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
      room.localParticipant.trackPublications.forEach((publication) => {
        publication.track?.stop();
      });
      room.disconnect();
      room.removeAllListeners();
      roomRef.current = null;
    };
  }, [room]);

  useEffect(() => {
    if (!summary) return;
    if (!summary.joinable) {
      setConnectionState("connecting");
      setError(null);
      return;
    }
    if (!allowConnectRef.current) return;
    if (didConnectRef.current || connectingRef.current) return;
    if (lastConnectAttemptRevisionRef.current === summaryRevision) return;

    lastConnectAttemptRevisionRef.current = summaryRevision;
    setConnectionState("connecting");
    setError(null);

    let activeRoom = roomRef.current;
    if (!activeRoom) {
      activeRoom = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = activeRoom;
      didStartConnectRef.current = true;
      setRoom(activeRoom);
    }

    const capturedSummary = summary;

    const connectToRoom = async () => {
      const res = await fetch(`/api/livekit/token?callId=${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const errorCode = payload?.error?.code;
        if (res.status === 403 && errorCode === "call_not_joinable") {
          const joinableError = new Error("Call not joinable yet");
          (joinableError as Error & { code?: string }).code = "call_not_joinable";
          throw joinableError;
        }
        throw new Error(payload?.error?.message || "Failed to fetch LiveKit token");
      }

      const livekitUrl = String(payload.url);
      const livekitToken =
        typeof payload.token === "string"
          ? payload.token
          : typeof payload.token?.token === "string"
          ? payload.token.token
          : String(payload.token ?? "");

      if (
        !livekitToken ||
        livekitToken === "[object Object]" ||
        !livekitToken.startsWith("eyJ")
      ) {
        throw new Error(
          `Invalid LiveKit token shape: ${JSON.stringify(payload.token ?? null)}`
        );
      }

      setRoomName(payload.roomName);
      await activeRoom.connect(livekitUrl, livekitToken);

      setRemoteParticipants(Array.from(activeRoom.remoteParticipants.values()));

      const enableCamera = capturedSummary.mode === "video";
      await activeRoom.localParticipant.setMicrophoneEnabled(true);
      await activeRoom.localParticipant.setCameraEnabled(enableCamera);
      setMuted(false);
      setCameraOn(enableCamera);
    };

    connectingRef.current = true;
    connectToRoom()
      .then(() => {
        didConnectRef.current = true;
      })
      .catch((connectError: unknown) => {
        const errorCode =
          typeof connectError === "object" &&
          connectError &&
          "code" in connectError
            ? (connectError as { code?: string }).code
            : undefined;
        if (errorCode === "call_not_joinable") {
          connectingRef.current = false;
          return;
        }
        console.error(connectError);
        const message =
          connectError instanceof Error
            ? connectError.message
            : "Unable to connect to LiveKit.";
        setError(message);
        setConnectionState("disconnected");
        const isUnrecoverable =
          message.includes("Invalid LiveKit token") ||
          message.includes("Unauthorized") ||
          message.includes("403");
        if (isUnrecoverable) {
          allowConnectRef.current = false;
        }
        setRoom(null);
      })
      .finally(() => {
        connectingRef.current = false;
      });
  }, [id, summary, summaryRevision]);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      const res = await fetch(`/api/calls/active?id=${id}`);
      if (!res.ok || !isMounted) return;
      const data = (await res.json()) as CallStateResponse;
      if (data.redirectTo && !didRedirectRef.current) {
        if (pathname !== data.redirectTo) {
          didRedirectRef.current = true;
          router.replace(data.redirectTo);
        }
      }
      if (data.call) {
        updateSummary(data.call);
      }
    };
    const intervalMs = summary?.joinable
      ? connectionState === "connected"
        ? 5000
        : 3000
      : 1000;
    const interval = window.setInterval(() => {
      void poll();
    }, intervalMs);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [connectionState, id, pathname, router, summary?.joinable]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsElapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsElapsed % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsElapsed]);

  const previewStatus = useMemo(() => {
    if (connectionState !== "connected") return "Waiting to connect…";
    const remaining = Math.max(0, PREVIEW_SECONDS - secondsElapsed);
    if (remaining > 0) {
      return `Free preview: ${remaining}s remaining`;
    }
    return "Billing active";
  }, [connectionState, secondsElapsed]);

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

  async function handleToggleMic() {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    await currentRoom.localParticipant.setMicrophoneEnabled(!nextMuted);
  }

  async function handleToggleCamera() {
    if (summary?.mode !== "video") return;
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    const nextCamera = !cameraOn;
    setCameraOn(nextCamera);
    await currentRoom.localParticipant.setCameraEnabled(nextCamera);
  }

  async function handleEndCall() {
    setConfirmOpen(false);
    setConnectionState("ended");

    const currentRoom = roomRef.current;
    if (currentRoom) {
      currentRoom.localParticipant.trackPublications.forEach((publication) => {
        publication.track?.stop();
      });
      await Promise.resolve(currentRoom.disconnect());
      currentRoom.removeAllListeners();
      roomRef.current = null;
      setRoom(null);
    }

    const res = await fetch("/api/calls/end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId: id }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error?.message ?? "Unable to end call.");
      return;
    }

    router.push(`/call/${id}/receipt`);
  }

  /* derive button states */
  const micState = muted ? "muted" : undefined;
  const camState = (summary?.mode !== "video")
    ? "cam-off"
    : cameraOn
    ? undefined
    : "cam-off";

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>In call</p>
            <h1>Call with {summary ? `@${counterparty}` : "your host"}</h1>
            <p className={styles.subtitle}>
              Track the LiveKit connection state, preview timer, and billing
              controls.
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
              <div
                className={styles.status}
                data-tone={
                  connectionState === "connected" && secondsElapsed >= PREVIEW_SECONDS
                    ? "warning"
                    : "success"
                }
              >
                <strong>Preview status</strong>
                <span>{previewStatus}</span>
              </div>
              <div className={styles.status} data-tone="warning">
                <strong>LiveKit room</strong>
                <span>{roomName ?? "Connecting…"}</span>
              </div>
            </div>

            {error ? (
              <div className={styles.status} data-tone="danger">
                <strong>Connection error</strong>
                <span>{error}</span>
              </div>
            ) : null}
          </section>

          <section className={styles.card}>
            <h2>Live media</h2>
            <div className={styles.mediaGrid}>
              {room ? (
                <ParticipantMedia
                  participant={room.localParticipant}
                  label="You"
                  isLocal
                  speakerOn={speakerOn}
                />
              ) : (
                <div className={styles.mediaTile}>
                  <p className={styles.subtitle}>You</p>
                  <div className={styles.mediaPlaceholder}>
                    <span>Connecting…</span>
                  </div>
                </div>
              )}
              {remoteParticipants.length > 0 ? (
                remoteParticipants.map((participant) => (
                  <ParticipantMedia
                    key={participant.identity}
                    participant={participant}
                    label={`@${counterparty}`}
                    isLocal={false}
                    speakerOn={speakerOn}
                  />
                ))
              ) : (
                <div className={styles.mediaTile}>
                  <p className={styles.subtitle}>@{counterparty}</p>
                  <div className={styles.mediaPlaceholder}>
                    <span>Waiting for participant…</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── CALL CONTROLS ─────────────────────────────── */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Call controls</h2>
              {connectionState === "connected" && (
                <span className={styles.pill} style={{ background: "rgba(130,240,180,0.12)", color: "rgba(130,240,180,0.9)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#82f0b4", display: "inline-block" }} />
                  {formattedTime}
                </span>
              )}
            </div>

            <div className={styles.controls}>

              {/* Group 1: mic / camera / speaker */}
              <div className={styles.controlsGroup}>

                {/* Mic */}
                <button
                  className={styles.iconButton}
                  type="button"
                  data-active={!muted ? "true" : undefined}
                  data-state={micState}
                  data-ctrl="mic"
                  data-tip={muted ? "Unmute microphone" : "Mute microphone"}
                  aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                  aria-pressed={!muted}
                  onClick={handleToggleMic}
                >
                  <div className={styles.iconButtonFace}>
                    <IconMic crossed={muted} />
                  </div>
                  <span className={styles.iconButtonLabel}>
                    {muted ? "Muted" : "Mic on"}
                  </span>
                </button>

                {/* Camera */}
                <button
                  className={styles.iconButton}
                  type="button"
                  data-active={cameraOn && summary?.mode === "video" ? "true" : undefined}
                  data-state={camState}
                  data-tip={
                    summary?.mode !== "video"
                      ? "Voice call — no camera"
                      : cameraOn
                      ? "Turn off camera"
                      : "Turn on camera"
                  }
                  aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                  aria-pressed={cameraOn}
                  onClick={handleToggleCamera}
                  disabled={summary?.mode !== "video"}
                >
                  <div className={styles.iconButtonFace}>
                    <IconCamera crossed={!cameraOn || summary?.mode !== "video"} />
                  </div>
                  <span className={styles.iconButtonLabel}>
                    {summary?.mode !== "video"
                      ? "Voice only"
                      : cameraOn
                      ? "Camera on"
                      : "Camera off"}
                  </span>
                </button>

                {/* Speaker */}
                <button
                  className={styles.iconButton}
                  type="button"
                  data-active={speakerOn ? "true" : undefined}
                  data-tip={speakerOn ? "Mute speaker" : "Unmute speaker"}
                  aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"}
                  aria-pressed={speakerOn}
                  onClick={() => setSpeakerOn((prev) => !prev)}
                >
                  <div className={styles.iconButtonFace}>
                    <IconSpeaker muted={!speakerOn} />
                  </div>
                  <span className={styles.iconButtonLabel}>
                    {speakerOn ? "Speaker on" : "Speaker off"}
                  </span>
                </button>

              </div>

              {/* Divider */}
              <div className={styles.controlsDivider} aria-hidden="true" />

              {/* Group 2: captions */}
              <div className={styles.controlsGroup} style={{ flex: "0 0 auto" }}>
                <button
                  className={styles.iconButton}
                  type="button"
                  data-active={captionsOn ? "true" : undefined}
                  data-tip={captionsOn ? "Hide live captions" : "Show live captions"}
                  aria-label={captionsOn ? "Hide captions" : "Show captions"}
                  aria-pressed={captionsOn}
                  onClick={() => setCaptionsOn((prev) => !prev)}
                >
                  <div className={styles.iconButtonFace}>
                    <IconCaptions />
                  </div>
                  <span className={styles.iconButtonLabel}>
                    {captionsOn ? "Captions on" : "Captions"}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className={styles.controlsDivider} aria-hidden="true" />

              {/* Group 3: end call */}
              <div className={styles.controlsGroup} style={{ flex: "0 0 auto" }}>
                <button
                  className={`${styles.iconButton} ${styles.iconButtonEnd}`}
                  type="button"
                  data-tip="End call and see receipt"
                  aria-label="End call"
                  onClick={() => setConfirmOpen(true)}
                >
                  <div className={styles.iconButtonFace}>
                    <IconEndCall />
                  </div>
                  <span className={styles.iconButtonLabel}>End call</span>
                </button>
              </div>

            </div>
          </section>
          {/* ── END CALL CONTROLS ─────────────────────────── */}

        </div>

        {/* End call confirm modal */}
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

        {/* Camera required modal */}
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
                    roomRef.current?.localParticipant.setCameraEnabled(true);
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
