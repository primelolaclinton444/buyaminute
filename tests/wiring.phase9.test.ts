// ================================
// BuyAMinute — Phase 9 Wiring Verification
// ================================

import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { randomUUID } from "crypto";

// Import the LiveKit webhook handler directly
import { POST as livekitWebhookPOST } from "../app/api/livekit/webhook/route";

const prisma = new PrismaClient();

const callerId = "wire-caller";
const receiverId = "wire-receiver";
const duplicateCallerId = "wire-dup-caller";
const duplicateReceiverId = "wire-dup-receiver";

function makeWebhookReq(body: any) {
  return new Request("http://localhost/api/livekit/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 9 — Wiring verification (LiveKit → Preview → End → Settlement)", () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: callerId },
        { id: receiverId },
        { id: duplicateCallerId },
        { id: duplicateReceiverId },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sets previewApplied on connect, then settles on disconnect", async () => {
    // Ensure clean preview lock state
    await prisma.callerReceiverPreviewLock.deleteMany({
      where: { callerId, receiverId },
    });

    // Ensure balances are clean
    const cb = await getWalletBalance(callerId);
    if (cb > 0) {
      await appendLedgerEntry({
        userId: callerId,
        type: "debit",
        amountTokens: cb,
        source: "withdrawal",
        idempotencyKey: `wire-clear-${callerId}-${cb}`,
      });
    }
    const rb = await getWalletBalance(receiverId);
    if (rb > 0) {
      await appendLedgerEntry({
        userId: receiverId,
        type: "debit",
        amountTokens: rb,
        source: "withdrawal",
        idempotencyKey: `wire-clear-${receiverId}-${rb}`,
      });
    }

    // Fund caller so debit can occur
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "wire-seed",
      idempotencyKey: "wire-seed",
    });

    // Create a call (as /calls/create would)
    const call = await prisma.call.create({
      data: {
        callerId,
        receiverId,
        status: "ringing",
        ratePerSecondTokens: 10,
        previewApplied: false,
        participants: { create: {} },
      },
      include: { participants: true },
    });

    // Simulate caller connected
    let res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_connected",
        callId: call.id,
        participantRole: "caller",
      })
    );
    expect(res.status).toBe(200);

    // Simulate receiver connected → should set bothConnectedAt + previewApplied + consume preview
    res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_connected",
        callId: call.id,
        participantRole: "receiver",
      })
    );
    expect(res.status).toBe(200);

    // Verify bothConnectedAt set
    const afterConnect = await prisma.call.findUnique({
      where: { id: call.id },
      include: { participants: true },
    });

    expect(afterConnect?.participants?.bothConnectedAt).toBeTruthy();

    // For first-time pair, previewApplied must be true
    expect(afterConnect?.previewApplied).toBe(true);

    // To make settlement deterministic, force bothConnectedAt to 31s ago
    await prisma.callParticipant.update({
      where: { callId: call.id },
      data: { bothConnectedAt: new Date(Date.now() - 31_000) },
    });

    // Disconnect event ends call and triggers settlement
    res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_disconnected",
        callId: call.id,
        participantRole: "caller",
      })
    );
    expect(res.status).toBe(200);

    // Call should be ended
    const ended = await prisma.call.findUnique({
      where: { id: call.id },
    });
    expect(ended?.status).toBe("ended");
    expect(ended?.endedAt).toBeTruthy();

    // With 31s overlap and previewApplied=true, billable=1s
    // rate=10 tokens/sec → receiver earns 10 tokens
    const receiverBalance = await getWalletBalance(receiverId);
    expect(receiverBalance).toBe(10);
  });

  it("ignores duplicate connect/disconnect events (no double billing)", async () => {
    await prisma.callerReceiverPreviewLock.deleteMany({
      where: { callerId: duplicateCallerId, receiverId: duplicateReceiverId },
    });

    const cb = await getWalletBalance(duplicateCallerId);
    if (cb > 0) {
      await appendLedgerEntry({
        userId: duplicateCallerId,
        type: "debit",
        amountTokens: cb,
        source: "withdrawal",
        idempotencyKey: `wire-dup-clear-${duplicateCallerId}-${randomUUID()}`,
      });
    }
    const rb = await getWalletBalance(duplicateReceiverId);
    if (rb > 0) {
      await appendLedgerEntry({
        userId: duplicateReceiverId,
        type: "debit",
        amountTokens: rb,
        source: "withdrawal",
        idempotencyKey: `wire-dup-clear-${duplicateReceiverId}-${randomUUID()}`,
      });
    }

    await appendLedgerEntry({
      userId: duplicateCallerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "wire-dup-seed",
      idempotencyKey: "wire-dup-seed",
    });

    const call = await prisma.call.create({
      data: {
        callerId: duplicateCallerId,
        receiverId: duplicateReceiverId,
        status: "ringing",
        ratePerSecondTokens: 10,
        previewApplied: false,
        participants: { create: {} },
      },
      include: { participants: true },
    });

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_connected",
        callId: call.id,
        participantRole: "caller",
      })
    );

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_connected",
        callId: call.id,
        participantRole: "receiver",
      })
    );

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_connected",
        callId: call.id,
        participantRole: "receiver",
      })
    );

    await prisma.callParticipant.update({
      where: { callId: call.id },
      data: { bothConnectedAt: new Date(Date.now() - 31_000) },
    });

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_disconnected",
        callId: call.id,
        participantRole: "caller",
      })
    );

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_disconnected",
        callId: call.id,
        participantRole: "caller",
      })
    );

    const receiverBalance = await getWalletBalance(duplicateReceiverId);
    expect(receiverBalance).toBe(10);

    const creditEntries = await prisma.ledgerEntry.findMany({
      where: {
        userId: duplicateReceiverId,
        source: "call_billing",
        type: "credit",
        callId: call.id,
      },
    });
    expect(creditEntries.length).toBe(1);
  });
});
