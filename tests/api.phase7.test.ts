// ================================
// BuyAMinute — Phase 7 API Tests
// ================================

import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { MIN_CALL_BALANCE_SECONDS } from "../lib/constants";

// Import the route handlers directly
import { POST as createCallPOST } from "../app/api/calls/create/route";
import { POST as upsertProfilePOST } from "../app/api/receiver/profile/upsert/route";

const prisma = new PrismaClient();

const callerId = "caller-test";
const receiverId = "receiver-test";

function makePostRequest(url: string, body: any) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 7 API invariants", () => {
  beforeAll(async () => {
    // Create users (simple seed)
    await prisma.user.createMany({
      data: [{ id: callerId }, { id: receiverId }],
      skipDuplicates: true,
    });
  });

  beforeEach(async () => {
    await prisma.receiverProfile.deleteMany({
      where: { userId: receiverId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks call creation if receiver is not available", async () => {
    // Set receiver profile unavailable
    const req1 = makePostRequest("http://localhost/api/receiver/profile/upsert", {
      userId: receiverId,
      ratePerSecondTokens: 10,
      isAvailable: false,
      isVideoEnabled: true,
    });
    await upsertProfilePOST(req1);

    // Fund caller enough (so the only failure is availability)
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 999999,
      source: "crypto_deposit",
      txHash: "seed-availability",
      idempotencyKey: "seed-availability",
    });

    const req2 = makePostRequest("http://localhost/api/calls/create", {
      callerId,
      receiverId,
      minIntendedSeconds: 60,
    });

    const res = await createCallPOST(req2);
    expect(res.status).toBe(400);
  });

  it("blocks call creation if caller cannot afford 1 minute", async () => {
    // Make receiver available at a high rate
    const req1 = makePostRequest("http://localhost/api/receiver/profile/upsert", {
      userId: receiverId,
      ratePerSecondTokens: 1000,
      isAvailable: true,
      isVideoEnabled: true,
    });
    await upsertProfilePOST(req1);

    // Ensure caller balance is low
    const current = await getWalletBalance(callerId);
    if (current > 0) {
      await appendLedgerEntry({
        userId: callerId,
        type: "debit",
        amountTokens: current,
        source: "withdrawal",
        idempotencyKey: `seed-clear-${callerId}-1`,
      });
    }

    // Fund caller with less than 60s worth at 1000 tokens/sec
    // required = 60,000 tokens
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 1000,
      source: "crypto_deposit",
      txHash: "seed-insufficient-minute",
      idempotencyKey: "seed-insufficient-minute",
    });

    const req2 = makePostRequest("http://localhost/api/calls/create", {
      callerId,
      receiverId,
    });

    const res = await createCallPOST(req2);
    expect(res.status).toBe(400);
  });

  it("blocks call creation if declared minIntendedSeconds is not covered", async () => {
    // Rate = 10 tokens/sec
    const req1 = makePostRequest("http://localhost/api/receiver/profile/upsert", {
      userId: receiverId,
      ratePerSecondTokens: 10,
      isAvailable: true,
      isVideoEnabled: true,
    });
    await upsertProfilePOST(req1);

    // Required for declared 300s = 3000 tokens
    // Fund caller with enough for 60s (600 tokens) but not for 300s
    const requiredFor60 = MIN_CALL_BALANCE_SECONDS * 10; // 600

    const current = await getWalletBalance(callerId);
    if (current > 0) {
      await appendLedgerEntry({
        userId: callerId,
        type: "debit",
        amountTokens: current,
        source: "withdrawal",
        idempotencyKey: `seed-clear-${callerId}-2`,
      });
    }

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: requiredFor60,
      source: "crypto_deposit",
      txHash: "seed-minintended",
      idempotencyKey: "seed-minintended",
    });

    const req2 = makePostRequest("http://localhost/api/calls/create", {
      callerId,
      receiverId,
      minIntendedSeconds: 300,
    });

    const res = await createCallPOST(req2);
    expect(res.status).toBe(400);
  });

  it("creates call and locks server-side rate into the call record", async () => {
    // Rate = 10 tokens/sec
    const req1 = makePostRequest("http://localhost/api/receiver/profile/upsert", {
      userId: receiverId,
      ratePerSecondTokens: 10,
      isAvailable: true,
      isVideoEnabled: true,
    });
    await upsertProfilePOST(req1);

    // Fund enough for at least 60s at 10 tokens/sec = 600 tokens
    const current = await getWalletBalance(callerId);
    if (current < 600) {
      await appendLedgerEntry({
        userId: callerId,
        type: "credit",
        amountTokens: 600 - current,
        source: "crypto_deposit",
        txHash: "seed-success",
        idempotencyKey: "seed-success",
      });
    }

    const req2 = makePostRequest("http://localhost/api/calls/create", {
      callerId,
      receiverId,
      minIntendedSeconds: 60,
    });

    const res = await createCallPOST(req2);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.callId).toBe("string");

    const call = await prisma.call.findUnique({
      where: { id: json.callId },
    });

    expect(call).toBeTruthy();
    expect(call?.ratePerSecondTokens).toBe(10);
    expect(call?.status).toBe("ringing");
  });
});
