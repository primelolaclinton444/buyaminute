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

    const handleUpdate = () => updateTracks();

    participant.on(ParticipantEvent.TrackPublished, handleUpdate);
    participant.on(ParticipantEvent.TrackUnpublished, handleUpdate);
    participant.on(ParticipantEvent.TrackSubscribed, handleUpdate);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleUpdate);
    participant.on(ParticipantEvent.TrackMuted, handleUpdate);
    participant.on(ParticipantEvent.TrackUnmuted, handleUpdate);

    return () => {
      participant.off(ParticipantEvent.TrackPublished, handleUpdate);
      participant.off(ParticipantEvent.TrackUnpublished, handleUpdate);
      participant.off(ParticipantEvent.TrackSubscribed, handleUpdate);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleUpdate);
      participant.off(ParticipantEvent.TrackMuted, handleUpdate);
      participant.off(ParticipantEvent.TrackUnmuted, handleUpdate);
    };
  }, [participant]);

  useEffect(() => {
    const track = tracks.video[0];
    const element = videoRef.current;
    if (!track || !element) return;

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [tracks.video]);

  useEffect(() => {
    if (isLocal) return;
    const track = tracks.audio[0];
    const element = audioRef.current;
    if (!track || !element) return;

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [isLocal, tracks.audio]);

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
      setSummary(data.call ?? null);
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
    if (!summary) return;

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    setRoom(room);
    setConnectionState("connecting");
    setError(null);

    const updateParticipants = () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    };

    const handleConnectionState = (state: ConnectionState) => {
      setConnectionState(mapConnectionState(state));
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionState);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);

    const connectToRoom = async () => {
      const res = await fetch(`/api/livekit/token?callId=${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error?.message || "Failed to fetch LiveKit token");
      }

      const livekitUrl = String(payload.url);
      const livekitToken = String(payload.token);

      // Guard against object coercion and wrong shapes
      if (!livekitToken || livekitToken === "[object Object]" || !livekitToken.startsWith("eyJ")) {
        throw new Error(`Invalid LiveKit token shape: ${livekitToken}`);
      }

      setRoomName(payload.roomName);
      await room.connect(livekitUrl, livekitToken);
      updateParticipants();

      const enableCamera = summary.mode === "video";
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(enableCamera);
      setMuted(false);
      setCameraOn(enableCamera);
    };

    connectToRoom().catch((connectError) => {
      console.error(connectError);
      setError("Unable to connect to LiveKit.");
      setConnectionState("disconnected");
    });

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionState);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.localParticipant.trackPublications.forEach((publication) => {
        publication.track?.stop();
      });
      room.disconnect();
      room.removeAllListeners();
      roomRef.current = null;
      setRoom(null);
    };
  }, [id, summary]);

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
    };
    const interval = window.setInterval(() => {
      void poll();
    }, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [id, pathname, router]);

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

  async function handleToggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
  }

  async function handleToggleCamera() {
    if (isReceiverVideo || summary?.mode !== "video") return;
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
              <div className={styles.status} data-tone="success">
                <strong>Preview status</strong>
                <span>30s free preview remaining</span>
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
                disabled={isReceiverVideo || summary?.mode !== "video"}
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
