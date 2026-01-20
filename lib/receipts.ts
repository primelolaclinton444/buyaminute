import { prisma } from "@/lib/prisma";
import { PREVIEW_SECONDS } from "@/lib/constants";

export type ReceiptSnapshot = {
  callId: string;
  callerId: string;
  receiverId: string;
  durationSeconds: number;
  previewSeconds: number;
  totalChargedTokens: number;
  refundedTokens: number;
  earnedTokens: number;
};

export async function computeReceiptSnapshot(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call) throw new Error("Call not found");

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      callId: call.id,
      userId: call.callerId,
      source: "call_billing",
    },
  });

  const debits = ledgerEntries
    .filter((entry) => entry.type === "debit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);
  const credits = ledgerEntries
    .filter((entry) => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);

  const totalChargedTokens = Math.max(0, debits - credits);
  const refundedTokens = Math.max(0, credits);

  const receiverEntries = await prisma.ledgerEntry.findMany({
    where: {
      callId: call.id,
      userId: call.receiverId,
      source: "call_billing",
    },
  });
  const earnedTokens = receiverEntries
    .filter((entry) => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);

  const durationSeconds =
    call.participants?.bothConnectedAt && call.endedAt
      ? Math.max(
          0,
          Math.floor(
            (call.endedAt.getTime() -
              call.participants.bothConnectedAt.getTime()) /
              1000
          )
        )
      : 0;

  const previewSeconds = call.previewApplied
    ? Math.min(PREVIEW_SECONDS, durationSeconds)
    : 0;

  return {
    callId: call.id,
    callerId: call.callerId,
    receiverId: call.receiverId,
    durationSeconds,
    previewSeconds,
    totalChargedTokens,
    refundedTokens,
    earnedTokens,
  } satisfies ReceiptSnapshot;
}

export async function upsertCallReceipt(callId: string) {
  const snapshot = await computeReceiptSnapshot(callId);
  return prisma.callReceipt.upsert({
    where: { callId: snapshot.callId },
    create: snapshot,
    update: snapshot,
  });
}
