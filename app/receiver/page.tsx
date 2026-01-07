"use client";

import { useState } from "react";

export default function ReceiverPage() {
  const [userId, setUserId] = useState("receiver-test");
  const [ratePerSecondTokens, setRatePerSecondTokens] = useState(10);
  const [isAvailable, setIsAvailable] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function save() {
    setStatus("Saving...");
    const res = await fetch("/api/ui/receiver/profile/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        ratePerSecondTokens: Number(ratePerSecondTokens),
        isAvailable,
      }),
    });

    if (!res.ok) {
      setStatus("Failed to save");
      return;
    }
    setStatus("Saved ✅");
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
          onChange={(e) => setIsAvailable(e.target.checked)}
        />
        Available
      </label>

      <button onClick={save}>Save</button>

      <p style={{ marginTop: 12 }}>{status}</p>
    </main>
  );
}
