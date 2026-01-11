import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { settleEndedCall } from "@/lib/settlement";
import { PREVIEW_SECONDS, TOKEN_UNIT_USD } from "@/lib/constants";

type CallAction = "accept" | "decline";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatUsd(tokens: number) {
  const usd = tokens * TOKEN_UNIT_USD;
  return `$${usd.toFixed(2)}`;
}

export async function respondToCall({
  requestId,
  action,
  userId,
}: {
  requestId: string;
  action: CallAction;
  userId: string;
}) {
  const call = await prisma.call.findUnique({ where: { id: requestId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.receiverId !== userId) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  if (action === "accept") {
    if (call.status !== "ended") {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: "connected" },
      });
    }

    return Response.json({
      requestId: call.id,
      status: "accepted",
      updatedAt: new Date().toISOString(),
    });
  }

  const updated = await prisma.call.update({
    where: { id: call.id },
    data: { status: "ended", endedAt: new Date() },
  });

  await settleEndedCall(updated.id);

  return Response.json({
    requestId: call.id,
    status: "declined",
    updatedAt: updated.endedAt?.toISOString() ?? new Date().toISOString(),
  });
}

export async function getCallState({
  callId,
  userId,
}: {
  callId: string;
  userId: string;
}) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
  });

  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.callerId !== userId && call.receiverId !== userId) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [call.callerId, call.receiverId] } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(
    users.map((user) => [user.id, user.name ?? user.email ?? user.id])
  );

  return Response.json({
    call: {
      id: call.id,
      caller: userMap.get(call.callerId) ?? call.callerId,
      receiver: userMap.get(call.receiverId) ?? call.receiverId,
      mode: "voice",
    },
  });
}

export async function endCall({
  callId,
  userId,
}: {
  callId: string;
  userId?: string;
}) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (userId && call.callerId !== userId && call.receiverId !== userId) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  if (call.status === "ended") {
    return Response.json({ ok: true });
  }

  await prisma.call.update({
    where: { id: callId },
    data: {
      status: "ended",
      endedAt: new Date(),
    },
  });

  await settleEndedCall(callId);

  return Response.json({ ok: true });
}

export async function getCallReceipt({
  callId,
  userId,
}: {
  callId: string;
  userId: string;
}) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.callerId !== userId && call.receiverId !== userId) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [call.callerId, call.receiverId] } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(
    users.map((user) => [user.id, user.name ?? user.email ?? user.id])
  );

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

  const durationSeconds =
    call.participants?.bothConnectedAt && call.endedAt
      ? Math.max(
          0,
          Math.floor(
            (call.endedAt.getTime() - call.participants.bothConnectedAt.getTime()) /
              1000
          )
        )
      : 0;

  const previewSeconds = call.previewApplied
    ? Math.min(PREVIEW_SECONDS, durationSeconds)
    : 0;

  return Response.json({
    receipt: {
      id: call.id,
      caller: userMap.get(call.callerId) ?? call.callerId,
      receiver: userMap.get(call.receiverId) ?? call.receiverId,
      duration: formatDuration(durationSeconds),
      previewApplied: formatDuration(previewSeconds),
      totalCharged: formatUsd(totalChargedTokens),
      refunded: formatUsd(refundedTokens),
    },
  });
}
