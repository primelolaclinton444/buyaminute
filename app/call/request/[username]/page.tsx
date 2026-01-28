"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAbly } from "@/components/realtime/AblyRealtimeProvider";
import styles from "../../call.module.css";

const modeOptions = [
  { id: "voice", label: "Voice" },
  { id: "video", label: "Video" },
] as const;

type Mode = (typeof modeOptions)[number]["id"];

type RequestState =
  | "idle"
  | "pending"
  | "declined"
  | "timeout"
  | "insufficient"
  | "offline"
  | "video_not_allowed"
  | "accepted";

type CallStateResponse = {
  call?: {
    status?: "ringing" | "connected" | "ended";
  };
  redirectTo?: string | null;
};

export default function CallRequestPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const didRedirectRef = useRef(false);
  const normalizedUsername = useMemo(
    () => (username ? username.replace(/^@/, "") : ""),
    [username]
  );
  const [mode, setMode] = useState<Mode>("voice");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [intendedMinutes, setIntendedMinutes] = useState<number>(5);
  const [profileRate, setProfileRate] = useState<number | null>(null);
  const [videoAllowed, setVideoAllowed] = useState(true);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const { client } = useAbly();

  const statusTone = useMemo(() => {
    if (requestState === "accepted") return "success";
    if (
      requestState === "insufficient" ||
      requestState === "offline" ||
      requestState === "video_not_allowed"
    ) {
      return "danger";
    }
    if (requestState === "pending" || requestState === "timeout") return "warning";
    return undefined;
  }, [requestState]);

  const statusCopy = useMemo(() => {
    switch (requestState) {
      case "pending":
        return {
          title: "Request sent",
          body: `Waiting for @${normalizedUsername} to accept. ${secondsLeft}s left in the window.`,
        };
      case "timeout":
        return {
          title: "Request expired",
          body: "No response in time. Try again or send an availability ping.",
        };
      case "declined":
        return {
          title: "Request declined",
          body: "The receiver declined this call. Try again later.",
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
      case "video_not_allowed":
        return {
          title: "Video unavailable",
          body: "This receiver only accepts voice calls right now.",
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
  }, [normalizedUsername, requestState, secondsLeft]);

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

  useEffect(() => {
    if (!requestId || !client) return;
    const channel = client.channels.get(`call:${requestId}`);
    const handleAccepted = () => {
      setRequestState("accepted");
      router.push(`/call/${requestId}`);
    };
    const handleDeclined = () => {
      setRequestState("declined");
      router.replace(`/call/${requestId}/receipt`);
    };
    channel.subscribe("call_accepted", handleAccepted);
    channel.subscribe("call_declined", handleDeclined);
    return () => {
      channel.unsubscribe("call_accepted", handleAccepted);
      channel.unsubscribe("call_declined", handleDeclined);
    };
  }, [client, requestId, router]);

  useEffect(() => {
    if (!requestId) return;
    let isMounted = true;
    const loadState = async () => {
      try {
        const res = await fetch(`/api/calls/active?id=${requestId}`);
        if (!res.ok) return;
        const payload = (await res.json()) as CallStateResponse;
        if (payload.redirectTo && !didRedirectRef.current) {
          if (pathname !== payload.redirectTo) {
            didRedirectRef.current = true;
            router.replace(payload.redirectTo);
          }
          return;
        }
        const status = payload?.call?.status;
        if (!isMounted || !status) return;
        if (status === "connected") {
          setRequestState("accepted");
          router.push(`/call/${requestId}`);
          return;
        }
        if (status === "ended") {
          setRequestState("declined");
          router.replace(`/call/${requestId}/receipt`);
        }
      } catch {
        // ignore transient load failures
      }
    };
    void loadState();
    return () => {
      isMounted = false;
    };
  }, [pathname, requestId, router]);

  useEffect(() => {
    if (!requestId || (requestState !== "pending" && requestState !== "timeout")) {
      return;
    }
    let isMounted = true;
    const poll = async () => {
      const res = await fetch(`/api/calls/active?id=${requestId}`);
      if (!res.ok || !isMounted) return;
      const payload = (await res.json()) as CallStateResponse;
      if (payload.redirectTo && !didRedirectRef.current) {
        if (pathname !== payload.redirectTo) {
          didRedirectRef.current = true;
          router.replace(payload.redirectTo);
        }
      }
    };
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [pathname, requestId, requestState, router]);

  useEffect(() => {
    async function loadProfile() {
      setProfileStatus("loading");
      try {
        const res = await fetch(
          `/api/profile?username=${encodeURIComponent(normalizedUsername)}`
        );
        if (!res.ok) {
          setProfileStatus("error");
          return;
        }
        const data = (await res.json()) as {
          profile?: { rate?: number; videoAllowed?: boolean };
        };
        setProfileRate(data.profile?.rate ?? null);
        setVideoAllowed(data.profile?.videoAllowed ?? true);
        setProfileStatus("idle");
      } catch {
        setProfileStatus("error");
      }
    }
    loadProfile();
  }, [normalizedUsername]);

  useEffect(() => {
    if (!videoAllowed && mode === "video") {
      setMode("voice");
    }
  }, [videoAllowed, mode]);

  const availableModes = useMemo(
    () => (videoAllowed ? modeOptions : modeOptions.filter((option) => option.id === "voice")),
    [videoAllowed]
  );

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
        body: JSON.stringify({ username: normalizedUsername, mode, minIntendedSeconds }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload?.error?.code === "VIDEO_NOT_ALLOWED") {
          setRequestState("video_not_allowed");
        } else {
          setRequestState("offline");
        }
        setRequestId(null);
        return;
      }
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
    const currentIndex = availableModes.findIndex((option) => option.id === mode);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % availableModes.length
        : (currentIndex - 1 + availableModes.length) % availableModes.length;
    setMode(availableModes[nextIndex].id);
  }

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Request</p>
            <h1>Request a call with @{normalizedUsername}</h1>
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
              <span className={styles.pill}>
                Rate:{" "}
                {profileStatus === "loading"
                  ? "Loading…"
                  : profileRate !== null
                    ? `$${profileRate.toFixed(2)} / min`
                    : "—"}
              </span>
            </div>

            <div
              className={styles.modeTabs}
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
                <span className={styles.subtitle}>
                  Minimum to start: 1 minute worth of credits. Billing is per-second
                  after any free preview.
                </span>
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
