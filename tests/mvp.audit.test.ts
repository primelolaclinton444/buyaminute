// ================================
// BuyAMinute — MVP Audit Gap Tests
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  appendLedgerEntry,
  getWalletBalanceFromLedger,
} from "../lib/ledger";
import {
  AVAILABILITY_PING_FEE_TOKENS,
  MIN_CALL_BALANCE_SECONDS,
} from "../lib/constants";
import {
  createSessionToken,
  resetCookieReaderForTests,
  setCookieReaderForTests,
} from "../lib/auth";
import { POST as livekitPOST } from "../app/api/livekit/webhook/route";
import { POST as createCallPOST } from "../app/api/calls/create/route";
import { POST as requestCallPOST } from "../app/api/calls/request/route";
import { POST as createPingPOST } from "../app/api/pings/route";
import { GET as inboxPingGET } from "../app/api/pings/inbox/route";
import { GET as outboxPingGET } from "../app/api/pings/outbox/route";
import { POST as replyPingPOST } from "../app/api/pings/[id]/reply/route";
import { POST as withdrawPOST } from "../app/api/wallet/withdraw/route";
import { POST as processWithdrawalPOST } from "../app/api/admin/withdrawals/process/route";
import { PING_QUESTION_OPTIONS } from "../lib/pings";

const prisma = new PrismaClient();

let sessionToken: string | null = null;

setCookieReaderForTests(() => ({
  get: (name: string) =>
    name === "bam_session" && sessionToken ? { value: sessionToken } : undefined,
  set: () => {},
}));

function setSession(userId: string | null) {
  sessionToken = userId ? createSessionToken(userId) : null;
}

function makeInternalRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
}

function makeLivekitRequest(body: string) {
  return new Request("http://localhost/api/livekit/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

async function seedUsers(callerId: string, receiverId: string, ratePerSecondTokens = 2) {
  await Promise.all(
    [callerId, receiverId].map((id) =>
      prisma.user.upsert({
        where: { id },
        update: {},
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
    txHash: `seed-${callerId}-${randomUUID()}`,
    idempotencyKey: `seed-${callerId}-${randomUUID()}`,
  });
}

async function connectCall(callId: string) {
  const callerBody = JSON.stringify({
    event: "participant_connected",
    room: { name: callId },
    participant: { identity: "caller" },
  });
  const receiverBody = JSON.stringify({
    event: "participant_connected",
    room: { name: callId },
    participant: { identity: "receiver" },
  });
  await livekitPOST(makeLivekitRequest(callerBody));
  await livekitPOST(makeLivekitRequest(receiverBody));
}

async function disconnectCall(callId: string) {
  const body = JSON.stringify({
    event: "participant_disconnected",
    room: { name: callId },
    participant: { identity: "caller" },
  });
  await livekitPOST(makeLivekitRequest(body));
}

async function setConnectedDuration(callId: string, seconds: number) {
  const connectedAt = new Date(Date.now() - seconds * 1000);
  await prisma.callParticipant.update({
    where: { callId },
    data: {
      callerConnectedAt: connectedAt,
      receiverConnectedAt: connectedAt,
      bothConnectedAt: connectedAt,
    },
  });
}

describe("MVP audit gaps", () => {
  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = "test-internal-key";
  });

  afterAll(async () => {
    resetCookieReaderForTests();
    await prisma.$disconnect();
  });

  it("ends at 20s: charged 0, earned 0, preview lock created", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    await seedUsers(callerId, receiverId, 2);

    const createRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const createJson = (await createRes.json()) as { callId?: string };
    const callId = createJson.callId as string;

    await connectCall(callId);
    await setConnectedDuration(callId, 20);
    await disconnectCall(callId);

    const credit = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:credit:${receiverId}` },
    });
    const refund = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:refund:${callerId}` },
    });

    expect(credit).toBeNull();
    expect(refund).toBeTruthy();

    const lock = await prisma.callerReceiverPreviewLock.findUnique({
      where: { callerId_receiverId: { callerId, receiverId } },
    });
    expect(lock).toBeTruthy();
  });

  it("reconnect within 24h: preview skipped and billing starts immediately", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    const ratePerSecondTokens = 3;
    await seedUsers(callerId, receiverId, ratePerSecondTokens);

    const firstRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const firstJson = (await firstRes.json()) as { callId?: string };
    const firstCallId = firstJson.callId as string;

    await connectCall(firstCallId);
    await setConnectedDuration(firstCallId, 5);
    await disconnectCall(firstCallId);

    const secondRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const secondJson = (await secondRes.json()) as { callId?: string };
    const secondCallId = secondJson.callId as string;

    await connectCall(secondCallId);
    await setConnectedDuration(secondCallId, 10);
    await disconnectCall(secondCallId);

    const secondCall = await prisma.call.findUnique({
      where: { id: secondCallId },
    });
    expect(secondCall?.previewApplied).toBe(false);

    const credit = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${secondCallId}:credit:${receiverId}` },
    });
    expect(credit?.amountTokens).toBe(10 * ratePerSecondTokens);
  });

  it("reaches 40s first time: preview 30s, billable 10s", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    const ratePerSecondTokens = 4;
    await seedUsers(callerId, receiverId, ratePerSecondTokens);

    const createRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const createJson = (await createRes.json()) as { callId?: string };
    const callId = createJson.callId as string;

    await connectCall(callId);
    await setConnectedDuration(callId, 40);
    await disconnectCall(callId);

    const credit = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:credit:${receiverId}` },
    });
    expect(credit?.amountTokens).toBe(10 * ratePerSecondTokens);
  });

  it("disconnect at 31s: billable 1s, billing stops instantly", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    const ratePerSecondTokens = 5;
    await seedUsers(callerId, receiverId, ratePerSecondTokens);

    const createRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const createJson = (await createRes.json()) as { callId?: string };
    const callId = createJson.callId as string;

    await connectCall(callId);
    await setConnectedDuration(callId, 31);
    await disconnectCall(callId);

    const credit = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:credit:${receiverId}` },
    });
    expect(credit?.amountTokens).toBe(1 * ratePerSecondTokens);
  });

  it("blocks call creation when balance below 1 minute or declared minimum", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;

    await prisma.user.create({ data: { id: callerId } });
    await prisma.user.create({ data: { id: receiverId } });
    await prisma.receiverProfile.create({
      data: {
        userId: receiverId,
        ratePerSecondTokens: 2,
        isAvailable: true,
        isVideoEnabled: true,
      },
    });

    const insufficientRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    expect(insufficientRes.status).toBe(400);

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS * 2,
      source: "crypto_deposit",
      txHash: `seed-${randomUUID()}`,
      idempotencyKey: `seed-${randomUUID()}`,
    });

    const minIntendedRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
        minIntendedSeconds: 400,
      })
    );
    expect(minIntendedRes.status).toBe(400);
  });

  it("ignores duplicate RTC events (no double preview or charge)", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    const ratePerSecondTokens = 2;
    await seedUsers(callerId, receiverId, ratePerSecondTokens);

    const createRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const createJson = (await createRes.json()) as { callId?: string };
    const callId = createJson.callId as string;

    const callerBody = JSON.stringify({
      event: "participant_connected",
      room: { name: callId },
      participant: { identity: "caller" },
    });
    const receiverBody = JSON.stringify({
      event: "participant_connected",
      room: { name: callId },
      participant: { identity: "receiver" },
    });

    await livekitPOST(makeLivekitRequest(callerBody));
    await livekitPOST(makeLivekitRequest(callerBody));
    await livekitPOST(makeLivekitRequest(receiverBody));
    await livekitPOST(makeLivekitRequest(receiverBody));

    await setConnectedDuration(callId, 10);

    const disconnectBody = JSON.stringify({
      event: "participant_disconnected",
      room: { name: callId },
      participant: { identity: "caller" },
    });
    await livekitPOST(makeLivekitRequest(disconnectBody));
    await livekitPOST(makeLivekitRequest(disconnectBody));

    const entries = await prisma.ledgerEntry.findMany({
      where: { callId, source: "call_billing" },
    });
    const receiverCredits = entries.filter(
      (entry) => entry.idempotencyKey === `call:${callId}:credit:${receiverId}`
    );
    expect(receiverCredits).toHaveLength(1);
  });

  it("enforces ping presets, fees, inbox/outbox, and reply flow", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    await prisma.user.create({ data: { id: callerId } });
    await prisma.user.create({ data: { id: receiverId } });

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: AVAILABILITY_PING_FEE_TOKENS * 2,
      source: "crypto_deposit",
      txHash: `seed-${randomUUID()}`,
      idempotencyKey: `seed-${randomUUID()}`,
    });

    setSession(callerId);
    const idempotencyKey = `ping-${randomUUID()}`;
    const topic = PING_QUESTION_OPTIONS[0]?.label ?? "Available now?";
    const pingRes = await createPingPOST(
      new Request("http://localhost/api/pings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ topic, requestedFor: receiverId }),
      })
    );
    expect(pingRes.status).toBe(201);
    const pingJson = await pingRes.json();
    const pingId = pingJson.ping?.id as string;

    const debit = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `availability_ping:${callerId}:${idempotencyKey}` },
    });
    expect(debit?.amountTokens).toBe(AVAILABILITY_PING_FEE_TOKENS);

    const pingResDuplicate = await createPingPOST(
      new Request("http://localhost/api/pings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ topic, requestedFor: receiverId }),
      })
    );
    expect(pingResDuplicate.status).toBe(200);

    const invalidRes = await createPingPOST(
      new Request("http://localhost/api/pings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `ping-${randomUUID()}`,
        },
        body: JSON.stringify({ topic: "Custom question", requestedFor: receiverId }),
      })
    );
    expect(invalidRes.status).toBe(400);

    setSession(receiverId);
    const inboxRes = await inboxPingGET();
    const inboxJson = await inboxRes.json();
    expect(inboxJson.pings.map((ping: any) => ping.id)).toContain(pingId);

    setSession(callerId);
    const outboxRes = await outboxPingGET();
    const outboxJson = await outboxRes.json();
    expect(outboxJson.pings.map((ping: any) => ping.id)).toContain(pingId);

    setSession(receiverId);
    const replyRes = await replyPingPOST(
      new Request(`http://localhost/api/pings/${pingId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "available_now" }),
      }),
      { params: { id: pingId } }
    );
    const replyJson = await replyRes.json();
    expect(replyJson.ping?.status).toBe("replied");
  });

  it("locks withdrawals pending, debits on processing, and prevents over-withdraw", async () => {
    const userId = `user-${randomUUID()}`;
    await prisma.user.create({ data: { id: userId } });
    await prisma.depositAddress.create({
      data: { userId, tronAddress: "TQwqPq2NqvZQdALAJh8V75Hgm3odB8nE2p" },
    });

    await appendLedgerEntry({
      userId,
      type: "credit",
      amountTokens: 500,
      source: "crypto_deposit",
      txHash: `seed-${randomUUID()}`,
      idempotencyKey: `seed-${randomUUID()}`,
    });

    const withdrawRes = await withdrawPOST(
      makeInternalRequest("http://localhost/api/wallet/withdraw", {
        userId,
        amountTokens: 300,
      })
    );
    const withdrawJson = await withdrawRes.json();
    expect(withdrawJson.withdrawalId).toBeTruthy();

    const walletAfterLock = await prisma.wallet.findUnique({
      where: { userId },
    });
    expect(walletAfterLock?.lockedTokens).toBe(300);

    const balanceAfterLock = await getWalletBalanceFromLedger(userId);
    expect(balanceAfterLock).toBe(200);

    const overdrawRes = await withdrawPOST(
      makeInternalRequest("http://localhost/api/wallet/withdraw", {
        userId,
        amountTokens: 250,
      })
    );
    expect(overdrawRes.status).toBe(400);

    const processRes = await processWithdrawalPOST(
      makeInternalRequest("http://localhost/api/admin/withdrawals/process", {
        withdrawalId: withdrawJson.withdrawalId,
        txHash: `tx-${randomUUID()}`,
      })
    );
    expect(processRes.status).toBe(200);

    const debit = await prisma.ledgerEntry.findFirst({
      where: {
        withdrawalRequestId: withdrawJson.withdrawalId,
        type: "debit",
        source: "withdrawal",
      },
    });
    expect(debit?.amountTokens).toBe(300);

    const walletAfterProcess = await prisma.wallet.findUnique({
      where: { userId },
    });
    expect(walletAfterProcess?.lockedTokens).toBe(0);
  });

  it("blocks frontend call requests with insufficient balance and min intended", async () => {
    const callerId = `caller-${randomUUID()}`;
    const receiverId = `receiver-${randomUUID()}`;
    await prisma.user.create({ data: { id: callerId } });
    await prisma.user.create({ data: { id: receiverId } });
    await prisma.receiverProfile.create({
      data: {
        userId: receiverId,
        ratePerSecondTokens: 1,
        isAvailable: true,
        isVideoEnabled: true,
      },
    });

    setSession(callerId);
    const noBalanceRes = await requestCallPOST(
      new Request("http://localhost/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: receiverId, mode: "voice" }),
      })
    );
    const noBalanceJson = await noBalanceRes.json();
    expect(noBalanceJson.status).toBe("insufficient");

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS,
      source: "crypto_deposit",
      txHash: `seed-${randomUUID()}`,
      idempotencyKey: `seed-${randomUUID()}`,
    });

    const minIntendedRes = await requestCallPOST(
      new Request("http://localhost/api/calls/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: receiverId,
          mode: "voice",
          minIntendedSeconds: MIN_CALL_BALANCE_SECONDS * 4,
        }),
      })
    );
    const minIntendedJson = await minIntendedRes.json();
    expect(minIntendedJson.status).toBe("insufficient");
  });
});
