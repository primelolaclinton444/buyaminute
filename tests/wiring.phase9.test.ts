// ================================
// BuyAMinute — Phase 9 Wiring Verification
// ================================
// NOTE: Updated to use correct LiveKit v2 event names:
//   "participant_joined"  (was "participant_connected")
//   "participant_left"    (was "participant_disconnected")

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { randomUUID } from "crypto";

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

async function seedBalancesForCall(caller: string, receiver: string) {
  const callerBalance = await getWalletBalance(caller);
  if (callerBalance > 0) {
    await appendLedgerEntry({
      userId: caller,
      type: "debit",
      amountTokens: callerBalance,
      source: "withdrawal",
      idempotencyKey: `wire-clear-${caller}-${randomUUID()}`,
    });
  }
  const receiverBalance = await getWalletBalance(receiver);
  if (receiverBalance > 0) {
    await appendLedgerEntry({
      userId: receiver,
      type: "debit",
      amountTokens: receiverBalance,
      source: "withdrawal",
      idempotencyKey: `wire-clear-${receiver}-${randomUUID()}`,
    });
  }

  await appendLedgerEntry({
    userId: caller,
    type: "credit",
    amountTokens: 100000,
    source: "crypto_deposit",
    txHash: `wire-seed-${caller}`,
    idempotencyKey: `wire-seed-${caller}`,
  });
}

async function createCallFixture(
  caller: string,
  receiver: string,
  options: { clearPreviewLock?: boolean } = {}
) {
  if (options.clearPreviewLock ?? true) {
    await prisma.callerReceiverPreviewLock.deleteMany({
      where: { callerId: caller, receiverId: receiver },
    });
  }

  return prisma.call.create({
    data: {
      callerId: caller,
      receiverId: receiver,
      status: "ringing",
      ratePerSecondTokens: 10,
      previewApplied: false,
      participants: { create: {} },
    },
    include: { participants: true },
  });
}

describe("Phase 9 — Wiring verification (LiveKit → Preview → End → Settlement)", () => {
  beforeAll(async () => {
    const ids = [callerId, receiverId, duplicateCallerId, duplicateReceiverId];
    await Promise.all(
      ids.map((id) =>
        prisma.user.upsert({
          where: { id },
          update: {},
          create: { id },
        })
      )
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sets previewApplied on connect, consumes preview, then settles on disconnect", async () => {
    await seedBalancesForCall(callerId, receiverId);

    const call = await createCallFixture(callerId, receiverId);

    // participant_joined (correct LiveKit v2 event name)
    let res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${call.id}` },
        participant: { identity: "caller:test" },
      })
    );
    expect(res.status).toBe(200);

    res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${call.id}` },
        participant: { identity: "receiver:test" },
      })
    );
    expect(res.status).toBe(200);

    const afterConnect = await prisma.call.findUnique({
      where: { id: call.id },
      include: { participants: true },
    });

    expect(afterConnect?.participants?.bothConnectedAt).toBeTruthy();
    expect(afterConnect?.previewApplied).toBe(true);

    const previewLock = await prisma.callerReceiverPreviewLock.findUnique({
      where: { callerId_receiverId: { callerId, receiverId } },
    });
    expect(previewLock).toBeTruthy();

    // Backdate bothConnectedAt to 31s ago for deterministic billing
    await prisma.callParticipant.update({
      where: { callId: call.id },
      data: { bothConnectedAt: new Date(Date.now() - 31_000) },
    });

    // participant_left triggers settlement
    res = await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_left",
        room: { name: `call_${call.id}` },
        participant: { identity: "caller:test" },
      })
    );
    expect(res.status).toBe(200);

    const ended = await prisma.call.findUnique({
      where: { id: call.id },
    });
    expect(ended?.status).toBe("ended");
    expect(ended?.endedAt).toBeTruthy();

    // 31s overlap, preview=30s → billable=1s, rate=10 → receiver earns 10 tokens
    const receiverBalance = await getWalletBalance(receiverId);
    expect(receiverBalance).toBe(10);

    const callLedger = await prisma.ledgerEntry.findMany({
      where: {
        callId: call.id,
        source: "call_billing",
      },
    });
    expect(callLedger.filter((entry) => entry.type === "debit")).toHaveLength(1);
    expect(callLedger.filter((entry) => entry.type === "credit")).toHaveLength(1);
  });

  it("skips preview on repeat pair and ignores duplicate connect/disconnect events", async () => {
    await seedBalancesForCall(duplicateCallerId, duplicateReceiverId);

    const call = await createCallFixture(duplicateCallerId, duplicateReceiverId);

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${call.id}` },
        participant: { identity: "caller:test" },
      })
    );

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${call.id}` },
        participant: { identity: "receiver:test" },
      })
    );

    const firstConnect = await prisma.call.findUnique({
      where: { id: call.id },
      include: { participants: true },
    });
    expect(firstConnect?.participants?.bothConnectedAt).toBeTruthy();
    expect(firstConnect?.previewApplied).toBe(true);

    await prisma.callParticipant.update({
      where: { callId: call.id },
      data: { bothConnectedAt: new Date(Date.now() - 31_000) },
    });

    // Duplicate join events — should be harmless
    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${call.id}` },
        participant: { identity: "receiver:test" },
      })
    );

    await prisma.callParticipant.update({
      where: { callId: call.id },
      data: { bothConnectedAt: new Date(Date.now() - 31_000) },
    });

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_left",
        room: { name: `call_${call.id}` },
        participant: { identity: "caller:test" },
      })
    );

    // Duplicate left — should be idempotent
    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_left",
        room: { name: `call_${call.id}` },
        participant: { identity: "caller:test" },
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

    const debitEntries = await prisma.ledgerEntry.findMany({
      where: {
        userId: duplicateCallerId,
        source: "call_billing",
        type: "debit",
        callId: call.id,
      },
    });
    expect(debitEntries.length).toBe(1);

    const followUpCall = await createCallFixture(
      duplicateCallerId,
      duplicateReceiverId,
      { clearPreviewLock: false }
    );

    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${followUpCall.id}` },
        participant: { identity: "caller:test" },
      })
    );
    await livekitWebhookPOST(
      makeWebhookReq({
        event: "participant_joined",
        room: { name: `call_${followUpCall.id}` },
        participant: { identity: "receiver:test" },
      })
    );

    const secondConnect = await prisma.call.findUnique({
      where: { id: followUpCall.id },
      include: { participants: true },
    });

    expect(secondConnect?.participants?.bothConnectedAt).toBeTruthy();
    expect(secondConnect?.previewApplied).toBe(false);
  });
});
