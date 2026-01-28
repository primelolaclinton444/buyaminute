"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RATE_PER_SECOND_TOKENS,
  RING_TIMEOUT_SECONDS,
  SECONDS_IN_MINUTE,
  TOKEN_UNIT_USD,
} from "@/lib/constants";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { PING_QUESTION_LABELS, PING_RESPONSE_LABELS } from "@/lib/pings";
import styles from "../call/call.module.css";

export default function ReceiverPage() {
  type AvailabilityPing = {
    id: string;
    callerId: string;
    receiverId: string;
    question: string;
    response: string | null;
    createdAt: string;
    respondedAt: string | null;
  };

  const { session } = useAuth();
  const userId = session?.user?.id ?? "";
  const [ratePerSecondTokens, setRatePerSecondTokens] = useState(
    DEFAULT_RATE_PER_SECOND_TOKENS
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [pingStatus, setPingStatus] = useState<string>("");
  const [pings, setPings] = useState<AvailabilityPing[]>([]);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const ratePerMinuteUsd = useMemo(() => {
    const tokensPerMinute = ratePerSecondTokens * SECONDS_IN_MINUTE;
    const usd = tokensPerMinute * TOKEN_UNIT_USD;
    return usd.toFixed(2);
  }, [ratePerSecondTokens]);

  const shareHandle = useMemo(() => {
    return (
      session?.user?.name?.trim() ||
      session?.user?.email ||
      session?.user?.id ||
      ""
    );
  }, [session?.user?.email, session?.user?.id, session?.user?.name]);

  const shareUrl = useMemo(() => {
    if (!shareHandle || typeof window === "undefined") return "";
    return `${window.location.origin}/call/request/${encodeURIComponent(shareHandle)}`;
  }, [shareHandle]);

  async function save() {
    if (!userId) {
      setStatus("Missing session user.");
      return;
    }
    setStatus("Saving...");
    const res = await fetch("/api/ui/receiver/profile/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        ratePerSecondTokens: Number(ratePerSecondTokens),
        isAvailable,
        isVideoEnabled,
      }),
    });

    if (!res.ok) {
      setStatus("Failed to save");
      return;
    }
    setStatus("Saved ✅");
  }

  function requestAvailabilityToggle(next: boolean) {
    if (next) {
      setShowAvailabilityModal(true);
      return;
    }
    setIsAvailable(false);
  }

  function confirmGoLive() {
    setIsAvailable(true);
    setShowAvailabilityModal(false);
  }

  function adjustRate() {
    setIsAvailable(false);
    setShowAvailabilityModal(false);
  }

  async function loadPings(nextUserId = userId) {
    if (!nextUserId) return;
    setPingStatus("Loading pings...");
    const res = await fetch(
      `/api/ui/availability/ping?receiverId=${encodeURIComponent(nextUserId)}&limit=5`,
    );

    if (!res.ok) {
      setPingStatus(`Failed to load pings (${res.status})`);
      return;
    }

    const data = (await res.json()) as { pings?: AvailabilityPing[] };
    setPings(data.pings ?? []);
    setPingStatus("Pings loaded ✅");
  }

  async function loadProfile(nextUserId = userId) {
    if (!nextUserId) return;
    setProfileStatus("loading");
    try {
      const res = await fetch(
        `/api/ui/receiver/profile/get?userId=${encodeURIComponent(nextUserId)}`
      );
      if (!res.ok) {
        setProfileStatus("error");
        return;
      }
      const data = (await res.json()) as {
        profile?: {
          ratePerSecondTokens?: number;
          isAvailable?: boolean;
          isVideoEnabled?: boolean;
        };
      };
      if (data.profile) {
        setRatePerSecondTokens(
          data.profile.ratePerSecondTokens ?? DEFAULT_RATE_PER_SECOND_TOKENS
        );
        setIsAvailable(Boolean(data.profile.isAvailable));
        setIsVideoEnabled(data.profile.isVideoEnabled ?? true);
      }
      setProfileStatus("idle");
    } catch {
      setProfileStatus("error");
    }
  }

  async function respondToPing(pingId: string, response: string) {
    if (!userId) {
      setPingStatus("Missing session user.");
      return;
    }
    setPingStatus("Sending response...");
    const res = await fetch("/api/ui/availability/ping/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pingId, userId, response }),
    });

    const text = await res.text();
    if (!res.ok) {
      setPingStatus(`Failed to respond: ${res.status} — ${text}`);
      return;
    }

    setPingStatus("Response sent ✅");
    await loadPings();
  }

  useEffect(() => {
    void loadPings();
    void loadProfile();
  }, [userId]);

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("Link copied ✅");
    } catch {
      setCopyStatus("Copy failed");
    }
    window.setTimeout(() => setCopyStatus(""), 2000);
  }

  function handleTestLink() {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  const questionLabels = PING_QUESTION_LABELS;
  const responseLabels = PING_RESPONSE_LABELS;

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Dashboard</p>
            <h1>Receiver dashboard</h1>
            <p className={styles.subtitle}>
              Manage your availability, rate, and incoming availability pings.
            </p>
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Start earning in 3 steps</h2>
                <p className={styles.subtitle}>
                  Share your link after setting your rate and availability.
                </p>
              </div>
              <span className={styles.pill}>Launch ready</span>
            </div>

            <ol className={styles.stepsList}>
              <li>Set your per-minute rate</li>
              <li>Turn ON availability when ready</li>
              <li>Share your link — you get paid only when connected</li>
            </ol>

            <div className={styles.linkBox}>
              <div className={styles.linkHeader}>
                <strong>Your link</strong>
                <span className={styles.subtitle}>
                  {shareHandle ? `@${shareHandle}` : "Loading handle…"}
                </span>
              </div>
              <div className={styles.linkRow}>
                <input
                  className={styles.input}
                  type="text"
                  value={shareUrl || "Generating link…"}
                  readOnly
                />
                <button className={styles.button} type="button" onClick={handleCopyLink}>
                  Copy
                </button>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button"
                  onClick={handleTestLink}
                >
                  Test it
                </button>
              </div>
              {copyStatus ? <span className={styles.subtitle}>{copyStatus}</span> : null}
            </div>

            <div className={styles.rulesGrid}>
              <div>
                <strong>Preview</strong>
                <p className={styles.subtitle}>First 30s is free.</p>
              </div>
              <div>
                <strong>Billing</strong>
                <p className={styles.subtitle}>Per second after preview.</p>
              </div>
              <div>
                <strong>Auto-refund</strong>
                <p className={styles.subtitle}>
                  If call doesn’t connect within {RING_TIMEOUT_SECONDS}s, caller is refunded automatically.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Profile</h2>
                <p className={styles.subtitle}>
                  Receiver ID: {userId || "Loading session..."}
                </p>
              </div>
              <span className={styles.pill}>
                {profileStatus === "loading"
                  ? "Loading profile…"
                  : profileStatus === "error"
                    ? "Profile unavailable"
                    : "Profile ready"}
              </span>
            </div>

            <div className={styles.grid}>
              <label>
                Rate (tokens per second)
                <input
                  className={styles.input}
                  type="number"
                  value={ratePerSecondTokens}
                  onChange={(event) =>
                    setRatePerSecondTokens(Number(event.target.value))
                  }
                  min={1}
                />
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.subtitle}>
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(event) => requestAvailabilityToggle(event.target.checked)}
                />{" "}
                Available for calls
              </label>
              <label className={styles.subtitle}>
                <input
                  type="checkbox"
                  checked={isVideoEnabled}
                  onChange={(event) => setIsVideoEnabled(event.target.checked)}
                />{" "}
                Allow video calls
              </label>
            </div>

            <div className={styles.row}>
              <button className={styles.button} type="button" onClick={save}>
                Save changes
              </button>
              {status ? <span className={styles.subtitle}>{status}</span> : null}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Availability pings</h2>
                <p className={styles.subtitle}>One-tap responses only.</p>
              </div>
              <button className={styles.button} type="button" onClick={() => loadPings()}>
                Refresh
              </button>
            </div>

            {pingStatus ? (
              <div className={styles.status}>
                <strong>Status</strong>
                <span>{pingStatus}</span>
              </div>
            ) : null}

            <div className={styles.list}>
              {pings.length === 0 ? (
                <div className={styles.status}>
                  <strong>No recent pings</strong>
                  <span>Stay available to receive pings from callers.</span>
                </div>
              ) : (
                pings.map((ping) => (
                  <div key={ping.id} className={styles.listItem}>
                    <div className={styles.listItemHeader}>
                      <div>
                        <h3>{questionLabels[ping.question] ?? ping.question}</h3>
                        <p className={styles.subtitle}>
                          From: {ping.callerId} ·{" "}
                          {new Date(ping.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={styles.pill}>
                        {ping.response
                          ? responseLabels[ping.response] ?? ping.response
                          : "Pending"}
                      </span>
                    </div>

                    {!ping.response ? (
                      <div className={styles.row}>
                        <button
                          className={styles.button}
                          type="button"
                          onClick={() => respondToPing(ping.id, "available_now")}
                        >
                          Available now
                        </button>
                        <button
                          className={styles.button}
                          type="button"
                          onClick={() => respondToPing(ping.id, "available_later")}
                        >
                          Available later
                        </button>
                        <button
                          className={`${styles.button} ${styles.buttonSecondary}`}
                          type="button"
                          onClick={() => respondToPing(ping.id, "not_available")}
                        >
                          Not available
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {showAvailabilityModal ? (
          <div className={styles.modalBackdrop} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true">
              <h2>Go Live</h2>
              <p className={styles.subtitle}>Your current rate: ${ratePerMinuteUsd}/min</p>
              <p className={styles.subtitle}>You can change this anytime.</p>
              <p className={styles.subtitle}>
                Most users raise their rate as demand grows.
              </p>
              <div className={styles.row}>
                <button className={styles.button} type="button" onClick={confirmGoLive}>
                  Go Live at ${ratePerMinuteUsd}
                </button>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button"
                  onClick={adjustRate}
                >
                  Adjust Rate
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
