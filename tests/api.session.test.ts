// ================================
// BuyAMinute — Session + UI API Tests
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { createSessionToken, resetCookieReaderForTests, setCookieReaderForTests } from "../lib/auth";
import { appendLedgerEntry } from "../lib/ledger";
import { CALL_REQUEST_WINDOW_MS, MIN_CALL_BALANCE_SECONDS } from "../lib/constants";
import { GET as sessionGET } from "../app/api/auth/session/route";
import { GET as ledgerGET } from "../app/api/wallet/ledger/route";
import { POST as withdrawPOST } from "../app/api/wallet/withdraw/route";
import { POST as requestCallPOST } from "../app/api/calls/request/route";
import { GET as incomingGET } from "../app/api/calls/incoming/route";
import { POST as respondPOST } from "../app/api/calls/respond/route";
import { GET as activeGET } from "../app/api/calls/active/route";
import { GET as receiptGET } from "../app/api/calls/receipt/route";
import { POST as endCallPOST } from "../app/api/calls/end/route";

let sessionToken: string | null = null;

const prisma = new PrismaClient();

function setSession(userId: string | null) {
  sessionToken = userId ? createSessionToken(userId) : null;
}

setCookieReaderForTests(() => ({
  get: (name: string) =>
    name === "bam_session" && sessionToken ? { value: sessionToken } : undefined,
  set: () => {},
}));

describe("Session auth behavior", () => {
  const userId = `user-${randomUUID()}`;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.dev` } });
  });

  it("returns null when no session is set", async () => {
    setSession(null);
    const res = await sessionGET();
    const json = await res.json();
    expect(json.user).toBeNull();
  });

  it("returns session user when cookie is valid", async () => {
    setSession(userId);
    const res = await sessionGET();
    const json = await res.json();
    expect(json.user?.id).toBe(userId);
  });
});

describe("Wallet ledger and withdrawal", () => {
  const userId = `wallet-${randomUUID()}`;
  const destination = "TQwqPq2NqvZQdALAJh8V75Hgm3odB8nE2p";

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.dev` } });
    await prisma.depositAddress.upsert({
      where: { userId },
      update: { tronAddress: destination },
      create: { userId, tronAddress: destination },
    });

    await appendLedgerEntry({
      userId,
      type: "credit",
      amountTokens: 500,
      source: "crypto_deposit",
      txHash: `seed-${userId}`,
      idempotencyKey: `seed-${userId}`,
    });
  });


  it("lists ledger entries for the session user", async () => {
    setSession(userId);
    const res = await ledgerGET(
      new Request("http://localhost/api/wallet/ledger?limit=10")
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.entries.length).toBeGreaterThan(0);
  });

  it("creates a withdrawal and is idempotent", async () => {
    setSession(userId);
    const idempotencyKey = `withdraw-${randomUUID()}`;
    const makeRequest = () =>
      new Request("http://localhost/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ amount: 200 }),
      });

    const res = await withdrawPOST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.withdrawalId).toBeTruthy();

    const lockedWallet = await prisma.wallet.findUnique({
      where: { userId },
    });
    expect(lockedWallet?.lockedTokens).toBe(200);

    const debitEntry = await prisma.ledgerEntry.findFirst({
      where: { withdrawalRequestId: json.withdrawalId, type: "debit" },
    });
    expect(debitEntry).toBeNull();

    const secondRes = await withdrawPOST(makeRequest());
    const secondJson = await secondRes.json();
    expect(secondRes.status).toBe(200);
    expect(secondJson.withdrawalId).toBe(json.withdrawalId);
  });
});

describe("UI call lifecycle", () => {
  const callerId = `caller-ui-${randomUUID()}`;
  const receiverId = `receiver-ui-${randomUUID()}`;
  const otherUserId = `other-ui-${randomUUID()}`;
  const ratePerSecondTokens = 2;

  beforeAll(async () => {
    await Promise.all(
      [callerId, receiverId, otherUserId].map((id) =>
        prisma.user.upsert({
          where: { id },
          update: { email: `${id}@test.dev` },
          create: { id, email: `${id}@test.dev` },
        })
      )
    );

    await prisma.receiverProfile.upsert({
      where: { userId: receiverId },
      update: {
        ratePerSecondTokens,
        isAvailable: true,
        isVideoEnabled: true,
      },
      create: {
        userId: receiverId,
        ratePerSecondTokens,
        isAvailable: true,
        isVideoEnabled: true,
      },
    });

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens * 2,
      source: "crypto_deposit",
      txHash: `seed-${callerId}`,
      idempotencyKey: `seed-${callerId}`,
    });
  });


  it("creates, accepts, and settles a call with per-second billing", async () => {
    setSession(callerId);
    const requestRes = await requestCallPOST(
      new Request("http://localhost/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: receiverId,
          mode: "voice",
          minIntendedSeconds: 120,
        }),
      })
    );

    const requestJson = await requestRes.json();
    expect(requestRes.status).toBe(200);
    expect(requestJson.status).toBe("pending");
    const callId = requestJson.requestId as string;

    const preauth = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:preauth:debit:${callerId}` },
    });
    expect(preauth?.amountTokens).toBe(MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens);

    setSession(receiverId);
    const incomingRes = await incomingGET();
    const incomingJson = await incomingRes.json();
    expect(incomingJson.requests.map((request: any) => request.id)).toContain(callId);

    const acceptRes = await respondPOST(
      new Request("http://localhost/api/calls/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: callId, action: "accept" }),
      })
    );
    const acceptJson = await acceptRes.json();
    expect(acceptJson.status).toBe("accepted");

    const bothConnectedAt = new Date(Date.now() - 90_000);
    await prisma.callParticipant.update({
      where: { callId },
      data: {
        callerConnectedAt: bothConnectedAt,
        receiverConnectedAt: bothConnectedAt,
        bothConnectedAt,
      },
    });

    setSession(otherUserId);
    const activeRes = await activeGET(
      new Request(`http://localhost/api/calls/active?id=${callId}`)
    );
    expect(activeRes.status).toBe(403);

    setSession(callerId);
    const endRes = await endCallPOST(
      new Request("http://localhost/api/calls/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callId }),
      })
    );
    expect(endRes.status).toBe(200);

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { callId, source: "call_billing" },
    });

    const credit = ledgerEntries.find(
      (entry) => entry.idempotencyKey === `call:${callId}:credit:${receiverId}`
    );
    const extraDebit = ledgerEntries.find(
      (entry) => entry.idempotencyKey === `call:${callId}:debit:extra:${callerId}`
    );

    const endedCall = await prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });
    const endedAt = endedCall?.endedAt?.getTime() ?? Date.now();
    const connectedAt = endedCall?.participants?.bothConnectedAt?.getTime() ?? endedAt;
    const billedSeconds = Math.max(0, Math.floor((endedAt - connectedAt) / 1000));
    const billedTokens = billedSeconds * ratePerSecondTokens;
    const preauthTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;

    expect(credit?.amountTokens).toBe(billedTokens);
    expect(extraDebit?.amountTokens).toBe(Math.max(0, billedTokens - preauthTokens));

    const receiptRes = await receiptGET(
      new Request(`http://localhost/api/calls/receipt?id=${callId}`)
    );
    const receiptJson = await receiptRes.json();
    expect(receiptJson.receipt?.id).toBe(callId);
  });

  it("rejects accept responses after the request window expires", async () => {
    setSession(callerId);
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens * 2,
      source: "crypto_deposit",
      txHash: `seed-expire-${randomUUID()}`,
      idempotencyKey: `seed-expire-${randomUUID()}`,
    });
    const requestRes = await requestCallPOST(
      new Request("http://localhost/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: receiverId,
          mode: "voice",
        }),
      })
    );
    const requestJson = await requestRes.json();
    expect(requestRes.status).toBe(200);
    const callId = requestJson.requestId as string;

    await prisma.call.update({
      where: { id: callId },
      data: {
        createdAt: new Date(Date.now() - CALL_REQUEST_WINDOW_MS - 1_000),
      },
    });

    setSession(receiverId);
    const acceptRes = await respondPOST(
      new Request("http://localhost/api/calls/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: callId, action: "accept" }),
      })
    );
    const acceptJson = await acceptRes.json();
    expect(acceptRes.status).toBe(410);
    expect(acceptJson.error?.code).toBe("request_expired");
  });

  it("refunds preauth when a receiver declines", async () => {
    setSession(callerId);
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens * 2,
      source: "crypto_deposit",
      txHash: `seed-decline-${randomUUID()}`,
      idempotencyKey: `seed-decline-${randomUUID()}`,
    });
    const requestRes = await requestCallPOST(
      new Request("http://localhost/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: receiverId, mode: "voice" }),
      })
    );
    const requestJson = await requestRes.json();
    const callId = requestJson.requestId as string;

    setSession(receiverId);
    await respondPOST(
      new Request("http://localhost/api/calls/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: callId, action: "decline" }),
      })
    );

    const refund = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:refund:${callerId}` },
    });
    expect(refund).toBeTruthy();
  });
});

afterAll(async () => {
  resetCookieReaderForTests();
  await prisma.$disconnect();
});
