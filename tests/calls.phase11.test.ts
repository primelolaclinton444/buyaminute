// ================================
// BuyAMinute — Calls Settlement Tests
// Phase 11
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { settleEndedCall } from "../lib/settlement";
import { MIN_CALL_BALANCE_SECONDS } from "../lib/constants";
import { POST as createCallPOST } from "../app/api/calls/create/route";
import { POST as acceptCallPOST } from "../app/api/calls/accept/route";
import { POST as endCallPOST } from "../app/api/calls/end/route";

const prisma = new PrismaClient();

const callerId = "caller-phase11";
const receiverId = "receiver-phase11";

async function seedUsers() {
  await Promise.all(
    [callerId, receiverId].map((id) =>
      prisma.user.upsert({
        where: { id },
        update: {},
        create: { id },
      })
    )
  );
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

async function seedPreauth(callId: string, ratePerSecondTokens: number) {
  const amountTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;
  await appendLedgerEntry({
    userId: callerId,
    type: "debit",
    amountTokens,
    source: "call_billing",
    callId,
    idempotencyKey: `call:${callId}:preauth:debit:${callerId}`,
  });
  return amountTokens;
}

describe("Call settlement with preauth", () => {
  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = "test-internal-key";
    await seedUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refunds preauth when a call never connects", async () => {
    const callId = `call-${randomUUID()}`;
    const ratePerSecondTokens = 2;

    await prisma.call.create({
      data: {
        id: callId,
        callerId,
        receiverId,
        status: "ended",
        ratePerSecondTokens,
        previewApplied: false,
        endedAt: new Date(),
      },
    });

    const preauthTokens = await seedPreauth(callId, ratePerSecondTokens);

    await settleEndedCall(callId);

    const refund = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:refund:${callerId}` },
    });

    expect(refund?.amountTokens).toBe(preauthTokens);
  });

  it("settles once when called repeatedly", async () => {
    const callId = `call-${randomUUID()}`;
    const ratePerSecondTokens = 1;
    const endedAt = new Date();
    const bothConnectedAt = new Date(endedAt.getTime() - 90_000);

    await prisma.call.create({
      data: {
        id: callId,
        callerId,
        receiverId,
        status: "ended",
        ratePerSecondTokens,
        previewApplied: false,
        endedAt,
        participants: {
          create: {
            callerConnectedAt: bothConnectedAt,
            receiverConnectedAt: bothConnectedAt,
            bothConnectedAt,
          },
        },
      },
    });

    await seedPreauth(callId, ratePerSecondTokens);

    await settleEndedCall(callId);
    await settleEndedCall(callId);

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        callId,
        source: "call_billing",
      },
    });

    const idempotencyKeys = entries.map((entry) => entry.idempotencyKey);
    expect(idempotencyKeys).toContain(`call:${callId}:preauth:debit:${callerId}`);
    expect(idempotencyKeys).toContain(`call:${callId}:credit:${receiverId}`);
    expect(idempotencyKeys).toContain(`call:${callId}:debit:extra:${callerId}`);
  });
});

describe("Internal call flow", () => {
  beforeAll(async () => {
    await seedUsers();
  });

  it("creates, accepts, and ends a call with preauth refund", async () => {
    const ratePerSecondTokens = 3;
    const txHash = `seed-${randomUUID()}`;
    const balance = await getWalletBalance(callerId);
    if (balance < 0) {
      await appendLedgerEntry({
        userId: callerId,
        type: "credit",
        amountTokens: Math.abs(balance),
        source: "crypto_deposit",
        txHash: `seed-reset-${randomUUID()}`,
        idempotencyKey: `seed-reset-${randomUUID()}`,
      });
    }

    await prisma.receiverProfile.upsert({
      where: { userId: receiverId },
      create: {
        userId: receiverId,
        ratePerSecondTokens,
        isAvailable: true,
        isVideoEnabled: true,
      },
      update: {
        ratePerSecondTokens,
        isAvailable: true,
        isVideoEnabled: true,
      },
    });

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens,
      source: "crypto_deposit",
      txHash,
      idempotencyKey: txHash,
    });

    const createRes = await createCallPOST(
      makeInternalRequest("http://localhost/api/calls/create", {
        callerId,
        receiverId,
      })
    );
    const createJson = (await createRes.json()) as { ok?: boolean; callId?: string };
    expect(createRes.status).toBe(200);
    expect(createJson.ok).toBe(true);
    expect(createJson.callId).toBeTruthy();

    const callId = createJson.callId as string;

    const preauth = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:preauth:debit:${callerId}` },
    });
    expect(preauth).toBeTruthy();

    const acceptRes = await acceptCallPOST(
      makeInternalRequest("http://localhost/api/calls/accept", { callId })
    );
    expect(acceptRes.status).toBe(200);

    const endRes = await endCallPOST(
      makeInternalRequest("http://localhost/api/calls/end", {
        callId,
        endedBy: "system",
      })
    );
    expect(endRes.status).toBe(200);

    const refund = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:refund:${callerId}` },
    });
    expect(refund).toBeTruthy();
  });
});
