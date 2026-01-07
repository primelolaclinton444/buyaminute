"use client";

import { useState } from "react";

export default function CallerCallPage() {
  const [callerId, setCallerId] = useState("caller-test");
  const [receiverId, setReceiverId] = useState("receiver-test");
  const [minIntendedSeconds, setMinIntendedSeconds] = useState(60);
  const [result, setResult] = useState<string>("");

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

  return (
    <main style={{ padding: 20, maxWidth: 520 }}>
      <h1>Caller (MVP)</h1>

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
    </main>
  );
}
