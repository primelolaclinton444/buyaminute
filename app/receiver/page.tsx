"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_RATE_PER_SECOND_TOKENS,
  SECONDS_IN_MINUTE,
  TOKEN_UNIT_USD,
} from "@/lib/constants";

export default function ReceiverPage() {
  const [userId, setUserId] = useState("receiver-test");
  const [ratePerSecondTokens, setRatePerSecondTokens] = useState(
    DEFAULT_RATE_PER_SECOND_TOKENS
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [status, setStatus] = useState<string>("");

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
