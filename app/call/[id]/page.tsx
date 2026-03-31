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

      // Immediately snapshot anyone already in the room when we connect.
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

  // Compute preview status based on actual elapsed connected time.
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
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
  }

  async function handleToggleCamera() {
    if (summary?.mode !== "video") return;
    const room = roomRef.current;
    if (!room) return;
    const nextCamera = !cameraOn;
    setCameraOn(nextCamera);
    await room.localParticipant.setCameraEnabled(nextCamera);
  }

  async function handleEndCall() {
    setConfirmOpen(false);
    setConnectionState("ended");

    const room = roomRef.current;
    if (room) {
      room.localParticipant.trackPublications.forEach((publication) => {
        publication.track?.stop();
      });
      await Promise.resolve(room.disconnect());
      room.removeAllListeners();
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

          <section className={styles.card}>
            <h2>Call controls</h2>
            <div className={styles.controls}>
              <button
                className={styles.iconButton}
                data-active={!muted}
                type="button"
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                onClick={handleToggleMic}
              >
                {muted ? "🔇" : "🎙️"}
              </button>
              <button
                className={styles.iconButton}
                data-active={cameraOn}
                type="button"
                aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                onClick={handleToggleCamera}
                disabled={summary?.mode !== "video"}
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
