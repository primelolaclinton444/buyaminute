import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { ensureLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { hasActivePreviewLock } from "@/lib/previewLock";
import { settleEndedCall } from "@/lib/settlement";
import {
  CALL_REQUEST_WINDOW_MS,
  MIN_CALL_BALANCE_SECONDS,
  PREVIEW_SECONDS,
  TOKEN_UNIT_USD,
} from "@/lib/constants";

type CallAction = "accept" | "decline";
type ViewerRole = "caller" | "receiver";

function getCallId(idempotencyKey: string, callerId: string) {
  const digest = createHash("sha256")
    .update(`${callerId}:${idempotencyKey}`)
    .digest("hex");
  return `call_${digest}`;
}

function formatRatePerMinute(ratePerSecondTokens: number) {
  const perMinuteUsd = ratePerSecondTokens * 60 * TOKEN_UNIT_USD;
  return `$${perMinuteUsd.toFixed(2)} / min`;
}

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

export async function requestCall({
  userId,
  username,
  mode,
  minIntendedSeconds,
  idempotencyKey,
}: {
  userId: string;
  username?: string;
  mode?: "voice" | "video";
  minIntendedSeconds?: number;
  idempotencyKey?: string | null;
}) {
  const trimmedUsername = username?.trim();
  const resolvedMode = mode === "video" ? "video" : "voice";

  if (!trimmedUsername) {
    return jsonError("Missing username", 400, "invalid_payload");
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return jsonError("Invalid minIntendedSeconds", 400, "invalid_payload");
  }

  const receiver = await prisma.user.findFirst({
    where: {
      OR: [
        { id: trimmedUsername },
        { email: trimmedUsername },
        { name: trimmedUsername },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  if (!receiver) {
    return Response.json({
      requestId: null,
      status: "offline",
      username: trimmedUsername,
      mode: resolvedMode,
      expiresAt: null,
    });
  }

  const receiverProfile = await prisma.receiverProfile.findUnique({
    where: { userId: receiver.id },
  });

  if (!receiverProfile?.isAvailable) {
    return Response.json({
      requestId: null,
      status: "offline",
      username: trimmedUsername,
      mode: resolvedMode,
      expiresAt: null,
    });
  }

  if (resolvedMode === "video" && !receiverProfile.isVideoEnabled) {
    return jsonError(
      "Receiver does not allow video calls.",
      400,
      "VIDEO_NOT_ALLOWED"
    );
  }

  const ratePerSecondTokens = receiverProfile.ratePerSecondTokens;
  if (!ratePerSecondTokens || ratePerSecondTokens <= 0) {
    return jsonError("Receiver rate not set", 400, "invalid_rate");
  }

  const minRequiredTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;
  const callerBalance = await getWalletBalance(userId);

  if (callerBalance < minRequiredTokens) {
    return Response.json({
      requestId: null,
      status: "insufficient",
      username: trimmedUsername,
      mode: resolvedMode,
      expiresAt: null,
    });
  }

  if (minIntendedSeconds !== undefined) {
    const declaredRequired = minIntendedSeconds * ratePerSecondTokens;
    if (callerBalance < declaredRequired) {
      return Response.json({
        requestId: null,
        status: "insufficient",
        username: trimmedUsername,
        mode: resolvedMode,
        expiresAt: null,
      });
    }
  }

  const idempotency = idempotencyKey?.trim();
  const callId = idempotency ? getCallId(idempotency, userId) : null;

  if (callId) {
    const existing = await prisma.call.findUnique({ where: { id: callId } });
    if (existing) {
      if (existing.callerId !== userId) {
        return jsonError("Unauthorized", 403, "forbidden");
      }
      const expiresAt = new Date(
        existing.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
      ).toISOString();
      return Response.json({
        requestId: existing.id,
        status: "pending",
        username: receiver.name ?? receiver.email ?? receiver.id,
        mode: resolvedMode,
        expiresAt,
      });
    }
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: {
        id: callId ?? undefined,
        callerId: userId,
        receiverId: receiver.id,
        mode: resolvedMode,
        status: "ringing",
        ratePerSecondTokens,
        previewApplied: false,
        participants: { create: {} },
      },
    });

    await ensureLedgerEntryWithClient(tx, {
      userId,
      type: "debit",
      amountTokens: minRequiredTokens,
      source: "call_billing",
      callId: created.id,
      idempotencyKey: `call:${created.id}:preauth:debit:${userId}`,
    });

    return created;
  });

  const expiresAt = new Date(
    call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
  ).toISOString();

  return Response.json({
    requestId: call.id,
    status: "pending",
    username: receiver.name ?? receiver.email ?? receiver.id,
    mode: resolvedMode,
    expiresAt,
  });
}

export async function createCall({
  callerId,
  receiverId,
  mode,
  minIntendedSeconds,
}: {
  callerId?: string;
  receiverId?: string;
  mode?: "voice" | "video";
  minIntendedSeconds?: number;
}) {
  const resolvedMode = mode === "video" ? "video" : "voice";

  if (!callerId || !receiverId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return jsonError("Invalid minIntendedSeconds", 400, "invalid_payload");
  }

  const receiverProfile = await prisma.receiverProfile.findUnique({
    where: { userId: receiverId },
  });

  if (!receiverProfile) {
    return jsonError("Receiver profile not found", 404, "not_found");
  }

  if (!receiverProfile.isAvailable) {
    return jsonError("Receiver is not available", 400, "receiver_unavailable");
  }

  if (resolvedMode === "video" && !receiverProfile.isVideoEnabled) {
    return jsonError(
      "Receiver does not allow video calls.",
      400,
      "VIDEO_NOT_ALLOWED"
    );
  }

  const ratePerSecondTokens = receiverProfile.ratePerSecondTokens;

  if (!ratePerSecondTokens || ratePerSecondTokens <= 0) {
    return jsonError("Receiver rate not set", 400, "invalid_rate");
  }

  const callerBalance = await getWalletBalance(callerId);

  const minRequiredTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;

  if (callerBalance < minRequiredTokens) {
    return jsonError(
      "Insufficient balance for 1-minute minimum",
      400,
      "insufficient_balance"
    );
  }

  if (minIntendedSeconds !== undefined) {
    const declaredRequired = minIntendedSeconds * ratePerSecondTokens;
    if (callerBalance < declaredRequired) {
      return jsonError(
        "Insufficient balance for declared minimum",
        400,
        "insufficient_balance"
      );
    }
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: {
        callerId,
        receiverId,
        mode: resolvedMode,
        status: "ringing",
        ratePerSecondTokens,
        previewApplied: false,
        participants: { create: {} },
      },
    });

    await ensureLedgerEntryWithClient(tx, {
      userId: callerId,
      type: "debit",
      amountTokens: minRequiredTokens,
      source: "call_billing",
      callId: created.id,
      idempotencyKey: `call:${created.id}:preauth:debit:${callerId}`,
    });

    return created;
  });

  return Response.json({ ok: true, callId: call.id });
}

export async function acceptCall({
  callId,
}: {
  callId?: string;
}) {
  if (!callId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.status === "ended") {
    return jsonError("Call already ended", 400, "call_ended");
  }

  if (call.mode === "video") {
    const receiverProfile = await prisma.receiverProfile.findUnique({
      where: { userId: call.receiverId },
      select: { isVideoEnabled: true },
    });
    if (!receiverProfile?.isVideoEnabled) {
      return jsonError(
        "Receiver does not allow video calls.",
        400,
        "VIDEO_NOT_ALLOWED"
      );
    }
  }

  await prisma.call.update({
    where: { id: callId },
    data: { status: "connected" },
  });

  return Response.json({ ok: true });
}

export async function getIncomingCalls({ userId }: { userId: string }) {
  const now = Date.now();
  const earliest = new Date(now - CALL_REQUEST_WINDOW_MS);

  const calls = await prisma.call.findMany({
    where: {
      receiverId: userId,
      status: "ringing",
      createdAt: { gte: earliest },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (calls.length === 0) {
    return Response.json({ requests: [] });
  }

  const callerIds = Array.from(new Set(calls.map((call) => call.callerId)));
  const callers = await prisma.user.findMany({
    where: { id: { in: callerIds } },
    select: { id: true, name: true, email: true },
  });
  const callerMap = new Map(
    callers.map((caller) => [
      caller.id,
      caller.name ?? caller.email ?? caller.id,
    ])
  );

  const requests = await Promise.all(
    calls.map(async (call) => {
      const expiresAt = new Date(
        call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
      ).toISOString();
      const hasPreview = await hasActivePreviewLock({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
      const summary = hasPreview
        ? "Repeat caller · Preview already used"
        : "First-time caller · Preview available";

      return {
        id: call.id,
        caller: callerMap.get(call.callerId) ?? call.callerId,
        mode: call.mode === "video" ? "video" : "voice",
        ratePerMinute: formatRatePerMinute(call.ratePerSecondTokens),
        expiresAt,
        status: "pending",
        summary,
      };
    })
  );

  return Response.json({ requests });
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

  const expiresAtMs = call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS;
  if (Date.now() > expiresAtMs) {
    return jsonError("Request expired", 410, "request_expired");
  }

  if (action === "accept") {
    if (call.mode === "video") {
      const receiverProfile = await prisma.receiverProfile.findUnique({
        where: { userId: call.receiverId },
        select: { isVideoEnabled: true },
      });
      if (!receiverProfile?.isVideoEnabled) {
        return jsonError(
          "Receiver does not allow video calls.",
          400,
          "VIDEO_NOT_ALLOWED"
        );
      }
    }
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

  const viewerRole: ViewerRole =
    call.callerId === userId ? "caller" : "receiver";

  return Response.json({
    call: {
      id: call.id,
      caller: userMap.get(call.callerId) ?? call.callerId,
      receiver: userMap.get(call.receiverId) ?? call.receiverId,
      mode: call.mode === "video" ? "video" : "voice",
      viewerRole,
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
  const viewerRole: ViewerRole =
    call.callerId === userId ? "caller" : "receiver";

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
  const receiverEarningsTokens = receiverEntries
    .filter((entry) => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);

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
      durationSeconds,
      previewApplied: formatDuration(previewSeconds),
      totalCharged: formatUsd(totalChargedTokens),
      refunded: formatUsd(refundedTokens),
      earned: formatUsd(receiverEarningsTokens),
      viewerRole,
    },
  });
}
