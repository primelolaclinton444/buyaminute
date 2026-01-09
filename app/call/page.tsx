"use client";

import { useState } from "react";

export default function CallerCallPage() {
  const [callerId, setCallerId] = useState("caller-test");
  const [receiverId, setReceiverId] = useState("receiver-test");
  const [minIntendedSeconds, setMinIntendedSeconds] = useState(60);
  const [result, setResult] = useState<string>("");
  const [availabilityQuestion, setAvailabilityQuestion] = useState(
    "available_now",
  );
  const [pingStatus, setPingStatus] = useState("");

  async function createCall() {
    setResult("Creating call...");
    const res = await fetch("/api/ui/calls/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        callerId,
        receiverId,
        minIntendedSeconds: Number(minIntendedSeconds),
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      setResult(`Failed: ${res.status} — ${text}`);
      return;
    }

    try {
      const json = JSON.parse(text);
      setResult(`Call created ✅ callId=${json.callId}`);
    } catch {
      setResult(`Call created ✅ ${text}`);
    }
  }

  async function createAvailabilityPing() {
    setPingStatus("Sending ping...");
    const res = await fetch("/api/ui/availability/ping", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        callerId,
        receiverId,
        question: availabilityQuestion,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      setPingStatus(`Failed: ${res.status} — ${text}`);
      return;
    }

    try {
      const json = JSON.parse(text);
      setPingStatus(`Ping sent ✅ pingId=${json.pingId}`);
    } catch {
      setPingStatus(`Ping sent ✅ ${text}`);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 520 }}>
      <h1>Caller (MVP)</h1>
      <p style={{ marginTop: 8 }}>
        30s free preview applies once per caller/receiver pair every 24h. Billing
        starts immediately after preview.
      </p>

      <label>
        Caller User ID
        <input
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={callerId}
          onChange={(e) => setCallerId(e.target.value)}
        />
      </label>

      <label>
        Receiver User ID
        <input
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
        />
      </label>

      <label>
        Minimum intended seconds (signal only)
        <input
          type="number"
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={minIntendedSeconds}
          onChange={(e) => setMinIntendedSeconds(Number(e.target.value))}
          min={1}
        />
      </label>

      <button onClick={createCall}>Create Call</button>

      <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{result}</pre>

      <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #ddd" }}>
        <h2>Availability Ping</h2>
        <p style={{ marginTop: 6 }}>
          Send a one-tap availability check. No free chat.
        </p>

        <label>
          Preset question
          <select
            style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
            value={availabilityQuestion}
            onChange={(e) => setAvailabilityQuestion(e.target.value)}
          >
            <option value="available_now">Are you available now?</option>
            <option value="available_later">Are you available later?</option>
            <option value="when_good_time">When is a good time?</option>
          </select>
        </label>

        <button onClick={createAvailabilityPing}>Send Availability Ping</button>

        <p style={{ marginTop: 12 }}>{pingStatus}</p>
      </section>
    </main>
  );
}
