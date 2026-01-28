"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAbly } from "@/components/realtime/AblyRealtimeProvider";
import styles from "../call.module.css";

type IncomingRequest = {
  id: string;
  caller: string;
  mode: "voice" | "video";
  ratePerMinute: string;
  expiresAt: string;
  status: "pending" | "accepted" | "declined" | "expired";
  summary: string;
};

export default function IncomingRequestsPage() {
  const DEBUG_ABLY = true;
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const previousCountRef = useRef(0);
  const titleResetRef = useRef<number | null>(null);
  const didRedirectRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { client } = useAbly();

  const activeCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/calls/incoming");
    const data = await res.json();
    setRequests(data.requests ?? []);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!userId || !client) return;
    const channel = client.channels.get(`user:${userId}`);
    const handleIncoming = () => {
      void loadRequests();
    };
    const handleConnected = () => console.log("[ably] connected");
    const handleFailed = (stateChange: unknown) =>
      console.log("[ably] failed", stateChange);
    if (DEBUG_ABLY) {
      console.log("[ably] incoming subscribe userId", userId);
      console.log("[ably] subscribed", `user:${userId}`);
      client.connection.on("connected", handleConnected);
      client.connection.on("failed", handleFailed);
    }
    channel.subscribe("incoming_call", handleIncoming);
    return () => {
      channel.unsubscribe("incoming_call", handleIncoming);
      if (DEBUG_ABLY) {
        client.connection.off("connected", handleConnected);
        client.connection.off("failed", handleFailed);
      }
    };
  }, [client, loadRequests, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRequests((prev) =>
        prev.map((request) => {
          if (request.status !== "pending") return request;
          if (new Date(request.expiresAt).getTime() <= Date.now()) {
            return { ...request, status: "expired" };
          }
          return request;
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (
      notificationPermission !== "granted" ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      previousCountRef.current = activeCount;
      return;
    }
    if (activeCount > previousCountRef.current) {
      new Notification("Incoming call request", {
        body:
          activeCount === 1
            ? "You have 1 incoming call request."
            : `You have ${activeCount} incoming call requests.`,
      });
    }
    previousCountRef.current = activeCount;
  }, [activeCount, notificationPermission]);

  useEffect(() => {
    if (activeCount <= previousCountRef.current) return;
    if (typeof document === "undefined") return;
    if (titleResetRef.current) {
      window.clearTimeout(titleResetRef.current);
    }
    const originalTitle = document.title;
    document.title = `Incoming calls (${activeCount})`;
    titleResetRef.current = window.setTimeout(() => {
      document.title = originalTitle;
      titleResetRef.current = null;
    }, 10000);
  }, [activeCount]);

  async function handleEnableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function handleRespond(id: string, action: "accept" | "decline") {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? { ...request, status: action === "accept" ? "accepted" : "declined" }
          : request
      )
    );
    const response = await fetch("/api/calls/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { redirectTo?: string | null }
      | null;
    if (!response.ok) {
      if (payload?.redirectTo && !didRedirectRef.current) {
        if (pathname !== payload.redirectTo) {
          didRedirectRef.current = true;
          router.replace(payload.redirectTo);
        }
      }
      return;
    }
    if (payload?.redirectTo && !didRedirectRef.current) {
      if (pathname !== payload.redirectTo) {
        didRedirectRef.current = true;
        router.replace(payload.redirectTo);
      }
    }
  }

  function formatSeconds(expiresAt: string) {
    const diff = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (diff % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Incoming</p>
            <h1>Incoming call requests</h1>
            <p className={styles.subtitle}>
              Accept within the countdown to connect. Declined requests disappear
              from the caller immediately.
            </p>
            {notificationPermission === "default" ? (
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={handleEnableNotifications}
              >
                Enable desktop alerts
              </button>
            ) : null}
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Live queue</h2>
              <span className={styles.pill}>{activeCount} active</span>
            </div>

            <div className={styles.list} aria-live="polite">
              {requests.map((request) => (
                <div key={request.id} className={styles.listItem}>
                  <div className={styles.listItemHeader}>
                    <div>
                      <h3>@{request.caller}</h3>
                      <p className={styles.subtitle}>{request.summary}</p>
                    </div>
                    <div className={styles.timer}>
                      {request.status === "pending" ? (
                        <span aria-label="Time remaining">
                          {formatSeconds(request.expiresAt)}
                        </span>
                      ) : (
                        <span>{request.status.toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.grid}>
                    <div>
                      <p className={styles.subtitle}>Mode</p>
                      <strong>{request.mode === "video" ? "Video" : "Voice"}</strong>
                    </div>
                    <div>
                      <p className={styles.subtitle}>Rate</p>
                      <strong>{request.ratePerMinute}</strong>
                    </div>
                    <div>
                      <p className={styles.subtitle}>Status</p>
                      <strong>{request.status}</strong>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <button
                      className={styles.button}
                      type="button"
                      onClick={() => handleRespond(request.id, "accept")}
                      disabled={request.status !== "pending"}
                      aria-label={`Accept request from ${request.caller}`}
                    >
                      Accept
                    </button>
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      type="button"
                      onClick={() => handleRespond(request.id, "decline")}
                      disabled={request.status !== "pending"}
                      aria-label={`Decline request from ${request.caller}`}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}

              {requests.length === 0 ? (
                <div className={styles.status}>
                  <strong>No requests yet</strong>
                  <span>Stay available to receive paid calls.</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Quick tips</h2>
            <div className={styles.grid}>
              <div>
                <h3>Review the caller</h3>
                <p className={styles.subtitle}>
                  Tap into profile details to confirm their intent before accepting.
                </p>
              </div>
              <div>
                <h3>Stay on time</h3>
                <p className={styles.subtitle}>
                  When the timer hits zero the request auto-expires.
                </p>
              </div>
              <div>
                <h3>Accepted calls</h3>
                <p className={styles.subtitle}>
                  Once accepted you can jump directly into the in-call shell.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
