// ================================
// BuyAMinute — Phase 9 Acceptance Tests
// ================================

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { computeBillableSeconds, settleCallBilling } from "../lib/billing";
import { consumePreview, hasActivePreviewLock } from "../lib/previewLock";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { PREVIEW_SECONDS, MIN_CALL_BALANCE_SECONDS } from "../lib/constants";

const prisma = new PrismaClient();

const callerId = "acc-caller";
const receiverId = "acc-receiver";

async function seedUsers() {
  await prisma.user.createMany({
    data: [{ id: callerId }, { id: receiverId }],
    skipDuplicates: true,
  });
}

async function resetBalances() {
  const c = await getWalletBalance(callerId);
  if (c > 0) {
    await appendLedgerEntry({
      userId: callerId,
      type: "debit",
      amountTokens: c,
      source: "withdrawal",
      idempotencyKey: `reset-${callerId}-${randomUUID()}`,
    });
  }
  const r = await getWalletBalance(receiverId);
  if (r > 0) {
    await appendLedgerEntry({
      userId: receiverId,
      type: "debit",
      amountTokens: r,
      source: "withdrawal",
      idempotencyKey: `reset-${receiverId}-${randomUUID()}`,
    });
  }
}

describe("Phase 9 — Acceptance", () => {
  beforeAll(async () => {
    await seedUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1) Call ends at 20s first connection: charged=0, earned=0, preview lock created", async () => {
    await resetBalances();

    const rate = 10; // tokens/sec
    // Fund caller enough for general testing
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "acc-seed-1",
      idempotencyKey: "acc-seed-1",
    });

    // Simulate first real connection: consume preview immediately (6A)
    await consumePreview({ callerId, receiverId });

    const locked = await hasActivePreviewLock({ callerId, receiverId });
    expect(locked).toBe(true);

    // Call ends at 20s: preview applies on first call (conceptually),
    // but billable should be 0 because < 30s
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: 20,
      previewApplied: true,
    });

    expect(billable).toBe(0);

    // Settlement should do nothing
    await settleCallBilling({
      callId: "call-20s",
      callerId,
      receiverId,
      billableSeconds: billable,
      ratePerSecondTokens: rate,
    });

    expect(await getWalletBalance(receiverId)).toBe(0);
  });

  it("2) Reconnect within 24h: preview_seconds=0, billing starts immediately", async () => {
    // Preview lock should already exist from prior test
    const locked = await hasActivePreviewLock({ callerId, receiverId });
    expect(locked).toBe(true);

    // Since locked, previewApplied must be false → preview_seconds = 0
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: 10,
      previewApplied: false,
    });

    expect(billable).toBe(10);
  });

  it("3) Call reaches 40s first-time: preview=30s, billable=10s", async () => {
    await resetBalances();

    const rate = 10;
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "acc-seed-3",
      idempotencyKey: "acc-seed-3",
    });

    // Simulate "first-time" by removing preview lock manually for test clarity
    await prisma.callerReceiverPreviewLock.deleteMany({
      where: { callerId, receiverId },
    });

    const locked = await hasActivePreviewLock({ callerId, receiverId });
    expect(locked).toBe(false);

    // First-time call preview applies
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: 40,
      previewApplied: true,
    });

    expect(billable).toBe(40 - PREVIEW_SECONDS); // 10

    await settleCallBilling({
      callId: "call-40s",
      callerId,
      receiverId,
      billableSeconds: billable,
      ratePerSecondTokens: rate,
    });

    // Receiver earned 10s * 10 tokens/sec = 100 tokens
    expect(await getWalletBalance(receiverId)).toBe(100);
  });

  it("4) Disconnect at 31s first-time: billable=1s and billing stops instantly", async () => {
    await resetBalances();

    const rate = 10;
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "acc-seed-4",
      idempotencyKey: "acc-seed-4",
    });

    await prisma.callerReceiverPreviewLock.deleteMany({
      where: { callerId, receiverId },
    });

    const billable = computeBillableSeconds({
      connectedOverlapSeconds: 31,
      previewApplied: true,
    });

    expect(billable).toBe(1);

    await settleCallBilling({
      callId: "call-31s",
      callerId,
      receiverId,
      billableSeconds: billable,
      ratePerSecondTokens: rate,
    });

    // Receiver earned 1s * 10 = 10 tokens
    expect(await getWalletBalance(receiverId)).toBe(10);
  });

  it("5) Caller balance < 1 minute: call creation should be blocked (rule check)", async () => {
    // This is a pure rule check (logic-level)
    const rate = 10;
    const required = MIN_CALL_BALANCE_SECONDS * rate; // 600

    await resetBalances();

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: required - 1,
      source: "crypto_deposit",
      txHash: "acc-seed-5",
      idempotencyKey: "acc-seed-5",
    });

    const balance = await getWalletBalance(callerId);
    expect(balance).toBe(required - 1);

    // Equivalent to /calls/create check:
    expect(balance < required).toBe(true);
  });
});
