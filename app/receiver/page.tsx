"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RATE_PER_SECOND_TOKENS,
  SECONDS_IN_MINUTE,
  TOKEN_UNIT_USD,
} from "@/lib/constants";

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

  const [userId, setUserId] = useState("receiver-test");
  const [ratePerSecondTokens, setRatePerSecondTokens] = useState(
    DEFAULT_RATE_PER_SECOND_TOKENS
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [pingStatus, setPingStatus] = useState<string>("");
  const [pings, setPings] = useState<AvailabilityPing[]>([]);

  const ratePerMinuteUsd = useMemo(() => {
    const tokensPerMinute = ratePerSecondTokens * SECONDS_IN_MINUTE;
    const usd = tokensPerMinute * TOKEN_UNIT_USD;
    return usd.toFixed(2);
  }, [ratePerSecondTokens]);

  async function save() {
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

  async function respondToPing(pingId: string, response: string) {
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
  }, [userId]);

  const questionLabels: Record<string, string> = {
    available_now: "Are you available now?",
    available_later: "Are you available later?",
    when_good_time: "When is a good time?",
  };

  const responseLabels: Record<string, string> = {
    available_now: "Available now",
    available_later: "Available later",
    not_available: "Not available",
  };

  return (
    <main style={{ padding: 20, maxWidth: 520 }}>
      <h1>Receiver Dashboard (MVP)</h1>

      <label>
        Receiver User ID
        <input
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </label>

      <label>
        Rate (tokens per second)
        <input
          type="number"
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={ratePerSecondTokens}
          onChange={(e) => setRatePerSecondTokens(Number(e.target.value))}
          min={1}
        />
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => requestAvailabilityToggle(e.target.checked)}
        />
        Available
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={isVideoEnabled}
          onChange={(e) => setIsVideoEnabled(e.target.checked)}
        />
        Allow Video Requests
      </label>

      <button onClick={save}>Save</button>

      <p style={{ marginTop: 12 }}>{status}</p>

      <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #ddd" }}>
        <h2>Availability Pings</h2>
        <p style={{ marginTop: 6 }}>One-tap responses only.</p>

        <button onClick={() => loadPings()}>Refresh Pings</button>
        <p style={{ marginTop: 8 }}>{pingStatus}</p>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {pings.length === 0 ? (
            <p>No recent pings.</p>
          ) : (
            pings.map((ping) => (
              <div
                key={ping.id}
                style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}
              >
                <div style={{ fontWeight: 600 }}>
                  {questionLabels[ping.question] ?? ping.question}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  From: {ping.callerId} • {new Date(ping.createdAt).toLocaleString()}
                </div>
                <div style={{ marginTop: 8 }}>
                  {ping.response ? (
                    <span>
                      Response: {responseLabels[ping.response] ?? ping.response}
                    </span>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => respondToPing(ping.id, "available_now")}>
                        Available now
                      </button>
                      <button onClick={() => respondToPing(ping.id, "available_later")}>
                        Available later
                      </button>
                      <button onClick={() => respondToPing(ping.id, "not_available")}>
                        Not available
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showAvailabilityModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{ background: "#fff", padding: 20, maxWidth: 420, width: "100%" }}>
            <h2>Go Live</h2>
            <p>Your current rate: ${ratePerMinuteUsd}/min</p>
            <p>You can change this anytime.</p>
            <p>Most users raise their rate as demand grows.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={confirmGoLive}>Go Live at ${ratePerMinuteUsd}</button>
              <button onClick={adjustRate}>Adjust Rate</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
