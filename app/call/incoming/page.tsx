"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
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
  const [requests, setRequests] = useState<IncomingRequest[]>([]);

  useEffect(() => {
    async function loadRequests() {
      const res = await fetch("/api/calls/mock/incoming");
      const data = await res.json();
      setRequests(data.requests ?? []);
    }
    loadRequests();
  }, []);

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

  async function handleRespond(id: string, action: "accept" | "decline") {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? { ...request, status: action === "accept" ? "accepted" : "declined" }
          : request
      )
    );
    await fetch("/api/calls/mock/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
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
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Live queue</h2>
              <span className={styles.pill}>{requests.length} active</span>
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
