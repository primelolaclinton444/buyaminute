"use client";

import { useEffect, useState } from "react";

export default function WalletPage() {
  const [userId, setUserId] = useState("caller-test");
  const [balanceTokens, setBalanceTokens] = useState<number>(0);

  const [withdrawTokens, setWithdrawTokens] = useState<number>(100);
  const [destinationTronAddress, setDestinationTronAddress] = useState<string>("");
  const [depositAddress, setDepositAddress] = useState<string>("");

  const [status, setStatus] = useState<string>("");

  async function refreshBalance() {
    setStatus("Refreshing...");
    const res = await fetch(`/api/ui/wallet/balance?userId=${encodeURIComponent(userId)}`);
    const text = await res.text();

    if (!res.ok) {
      setStatus(`Failed: ${res.status} — ${text}`);
      return;
    }

    const json = JSON.parse(text);
    setBalanceTokens(json.balanceTokens);
    setStatus("Ready ✅");
  }

  async function refreshDepositAddress() {
    const res = await fetch(
      `/api/ui/wallet/deposit-address?userId=${encodeURIComponent(userId)}`
    );
    const text = await res.text();

    if (!res.ok) {
      setDepositAddress("");
      return;
    }

    const json = JSON.parse(text);
    setDepositAddress(json.tronAddress || "");
  }

  async function assignDepositAddress() {
    const res = await fetch("/api/ui/wallet/deposit-address", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        tronAddress: destinationTronAddress,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      setStatus(`Failed: ${res.status} — ${text}`);
      return;
    }

    const json = JSON.parse(text);
    setDepositAddress(json.tronAddress || "");
    setStatus("Deposit address saved ✅");
  }

  async function requestWithdrawal() {
    setStatus("Requesting withdrawal...");
    const res = await fetch("/api/ui/wallet/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        amountTokens: Number(withdrawTokens),
        destinationTronAddress,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      setStatus(`Failed: ${res.status} — ${text}`);
      return;
    }

    setStatus(`Withdrawal requested ✅ ${text}`);
    await refreshBalance();
  }

  useEffect(() => {
    refreshBalance();
    refreshDepositAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 720 }}>
      <h1>Wallet (MVP)</h1>

      <label>
        User ID
        <input
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </label>

      <button onClick={refreshBalance}>Refresh Balance</button>

      <h2 style={{ marginTop: 16 }}>Balance</h2>
      <p>
        <b>{balanceTokens}</b> tokens
      </p>

      <hr style={{ margin: "16px 0" }} />

      <h2>Deposit (USDT-TRC20)</h2>
      <p style={{ lineHeight: 1.4 }}>
        Send <b>USDT (TRC20)</b> on the <b>TRON</b> network to your assigned deposit
        address. After confirmations, your wallet will be credited in tokens.
      </p>
      <p style={{ marginTop: 8 }}>
        <b>Deposit address:</b>{" "}
        {depositAddress ? depositAddress : "(not assigned yet)"}
      </p>
      <button onClick={refreshDepositAddress}>Refresh Deposit Address</button>
      <p style={{ marginTop: 8, color: "#555" }}>
        Admin set (MVP): Use the destination address field below to assign your
        deposit address.
      </p>

      <hr style={{ margin: "16px 0" }} />

      <h2>Withdraw</h2>

      <label>
        Amount (tokens)
        <input
          type="number"
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={withdrawTokens}
          onChange={(e) => setWithdrawTokens(Number(e.target.value))}
          min={1}
        />
      </label>

      <label>
        Destination TRON Address
        <input
          style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12 }}
          value={destinationTronAddress}
          onChange={(e) => setDestinationTronAddress(e.target.value)}
          placeholder="T..."
        />
      </label>

      <button onClick={assignDepositAddress}>Save Deposit Address</button>

      <button onClick={requestWithdrawal}>Request Withdrawal</button>

      <p style={{ marginTop: 12 }}>{status}</p>
    </main>
  );
}
