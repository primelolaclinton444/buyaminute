// ================================
// BuyAMinute — Phase 9 Wiring Verification
// ================================

import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";

// Import the LiveKit webhook handler directly
import { POST as livekitWebhookPOST } from "../app/api/livekit/webhook/route";

const prisma = new PrismaClient();

const callerId = "wire-caller";
const receiverId = "wire-receiver";

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
      data: [{ id: callerId }, { id: receiverId }],
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
      });
    }
    const rb = await getWalletBalance(receiverId);
    if (rb > 0) {
      await appendLedgerEntry({
        userId: receiverId,
        type: "debit",
        amountTokens: rb,
        source: "withdrawal",
      });
    }

    // Fund caller so debit can occur
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 100000,
      source: "crypto_deposit",
      txHash: "wire-seed",
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
});
