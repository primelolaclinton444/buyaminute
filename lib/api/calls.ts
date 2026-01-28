import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { ensureLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { hasActivePreviewLock } from "@/lib/previewLock";
import { settleEndedCall } from "@/lib/settlement";
import { upsertCallReceipt } from "@/lib/receipts";
import { ablyRest } from "@/lib/ably/server";
import { dlog } from "@/lib/debug";
import {
  CALL_REQUEST_WINDOW_MS,
  MIN_CALL_BALANCE_SECONDS,
  RING_TIMEOUT_SECONDS,
  TOKEN_UNIT_USD,
} from "@/lib/constants";

type CallAction = "accept" | "decline";
type ViewerRole = "caller" | "receiver";
type OutcomeCode =
  | "billed"
  | "expired_refunded"
  | "connect_timeout_refunded"
  | "declined_refunded"
  | "not_connected_refunded";

function getOutcomeCode({
  status,
  endReason,
  bothConnectedAt,
  durationSeconds,
}: {
  status: string;
  endReason: string | null;
  bothConnectedAt: Date | null;
  durationSeconds?: number;
}): OutcomeCode | null {
  if (status !== "ended") return null;
  if (bothConnectedAt || (durationSeconds ?? 0) > 0) return "billed";
  if (endReason === "request_expired") return "expired_refunded";
  if (endReason === "connect_timeout") return "connect_timeout_refunded";
  if (endReason === "declined") return "declined_refunded";
  return "not_connected_refunded";
}

function getOutcomeMessage(code: OutcomeCode | null) {
  if (!code) return null;
  switch (code) {
    case "expired_refunded":
      return "Refunded — request expired before acceptance.";
    case "connect_timeout_refunded":
      return `Refunded — call didn’t connect within ${RING_TIMEOUT_SECONDS} seconds.`;
    case "declined_refunded":
      return "Refunded — the call was declined.";
    case "billed":
      return "Billed — connected time only. Unused returned automatically.";
    default:
      return "Refunded — the call didn’t connect.";
  }
}

async function ensureUserActive(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFrozen: true },
  });
  if (user?.isFrozen) {
    return jsonError("User is frozen", 403, "user_frozen");
  }
  return null;
}

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

async function publishCallEvent(
  channelName: string,
  eventName: string,
  data: { callId: string }
) {
  try {
    const channel = ablyRest.channels.get(channelName);
    await channel.publish(eventName, data);
    dlog("[ably] publish ok", { channelName, eventName, callId: data.callId });
  } catch (error) {
    dlog("[ably] publish failed", {
      channelName,
      eventName,
      callId: data.callId,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`Failed to publish Ably event ${eventName}`, error);
  }
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

  const callerFrozen = await ensureUserActive(userId);
  if (callerFrozen) return callerFrozen;

  const receiver = await prisma.user.findFirst({
    where: {
      OR: [
        { id: { equals: trimmedUsername, mode: "insensitive" } },
        { email: { equals: trimmedUsername, mode: "insensitive" } },
        { name: { equals: trimmedUsername, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, isFrozen: true },
  });

  dlog("[handle] lookup", {
    handle: trimmedUsername,
    matchedUserId: receiver?.id ?? null,
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

  if (receiver.isFrozen) {
    return jsonError("User is frozen", 403, "user_frozen");
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

  dlog("[ably] publish incoming_call", {
    callId: call.id,
    receiverId: receiver.id,
    channel: `user:${receiver.id}`,
  });
  void publishCallEvent(`user:${receiver.id}`, "incoming_call", {
    callId: call.id,
  });

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

  const callerFrozen = await ensureUserActive(callerId);
  if (callerFrozen) return callerFrozen;
  const receiverFrozen = await ensureUserActive(receiverId);
  if (receiverFrozen) return receiverFrozen;

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

  const receiverFrozen = await ensureUserActive(call.receiverId);
  if (receiverFrozen) return receiverFrozen;

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
  dlog("[incoming] user", { userId });
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

  dlog("[incoming] found", {
    count: calls.length,
    ids: calls.slice(0, 5).map((call) => call.id),
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

  const receiverFrozen = await ensureUserActive(userId);
  if (receiverFrozen) return receiverFrozen;

  const expiresAtMs = call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS;
  if (Date.now() > expiresAtMs) {
    if (call.status !== "ended") {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: "ended",
          endedAt: new Date(),
          endReason: "request_expired",
        },
      });
      await settleEndedCall(call.id);
    }
    return Response.json(
      {
        ok: false,
        code: "request_expired_refunded",
        redirectTo: `/call/${call.id}/receipt`,
      },
      { status: 410 }
    );
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
    if (call.status === "ended") {
      return jsonError("Call already ended", 400, "call_ended");
    }

    await prisma.call.update({
      where: { id: call.id },
      data: { status: "connected" },
    });

    dlog("[ably] publish call_accepted", {
      callId: call.id,
      callerId: call.callerId,
      channel: `call:${call.id}`,
    });
    void publishCallEvent(`call:${call.id}`, "call_accepted", { callId: call.id });
    dlog("[ably] publish call_accepted (caller)", {
      callId: call.id,
      callerId: call.callerId,
      channel: `user:${call.callerId}`,
    });
    void publishCallEvent(`user:${call.callerId}`, "call_accepted", {
      callId: call.id,
    });

    return Response.json({
      requestId: call.id,
      status: "accepted",
      updatedAt: new Date().toISOString(),
    });
  }

  const updated = await prisma.call.update({
    where: { id: call.id },
    data: { status: "ended", endedAt: new Date(), endReason: "declined" },
  });

  await settleEndedCall(updated.id);

  dlog("[ably] publish call_declined", {
    callId: call.id,
    callerId: call.callerId,
    channel: `call:${call.id}`,
  });
  void publishCallEvent(`call:${call.id}`, "call_declined", { callId: call.id });
  dlog("[ably] publish call_declined (caller)", {
    callId: call.id,
    callerId: call.callerId,
    channel: `user:${call.callerId}`,
  });
  void publishCallEvent(`user:${call.callerId}`, "call_declined", {
    callId: call.id,
  });

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
    include: { participants: true },
  });

  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.callerId !== userId && call.receiverId !== userId) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  const callerFrozen = await ensureUserActive(call.callerId);
  if (callerFrozen && call.callerId === userId) return callerFrozen;
  const receiverFrozen = await ensureUserActive(call.receiverId);
  if (receiverFrozen && call.receiverId === userId) return receiverFrozen;

  const now = Date.now();
  const expiresAtMs = call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS;
  const ringTimeoutMs = call.createdAt.getTime() + RING_TIMEOUT_SECONDS * 1000;
  let updatedCall = call;
  let outcomeCode: OutcomeCode | null = null;
  const bothConnectedAt = call.participants?.bothConnectedAt ?? null;

  if (call.status !== "ended") {
    if (call.status === "ringing" && now > expiresAtMs) {
      updatedCall = await prisma.call.update({
        where: { id: call.id },
        data: {
          status: "ended",
          endedAt: new Date(),
          endReason: "request_expired",
        },
        include: { participants: true },
      });
      await settleEndedCall(call.id);
      outcomeCode = "expired_refunded";
    } else if (!call.participants?.bothConnectedAt && now > ringTimeoutMs) {
      updatedCall = await prisma.call.update({
        where: { id: call.id },
        data: {
          status: "ended",
          endedAt: new Date(),
          endReason: "connect_timeout",
        },
        include: { participants: true },
      });
      await settleEndedCall(call.id);
      outcomeCode = "connect_timeout_refunded";
    }
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

  if (updatedCall.status === "ended" && !outcomeCode) {
    outcomeCode = getOutcomeCode({
      status: updatedCall.status,
      endReason: updatedCall.endReason ?? null,
      bothConnectedAt,
    });
  }

  return Response.json({
    call: {
      id: updatedCall.id,
      caller: userMap.get(call.callerId) ?? call.callerId,
      receiver: userMap.get(call.receiverId) ?? call.receiverId,
      mode: updatedCall.mode === "video" ? "video" : "voice",
      status: updatedCall.status,
      viewerRole,
    },
    outcomeCode,
    redirectTo:
      updatedCall.status === "ended" ? `/call/${updatedCall.id}/receipt` : null,
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

  if (call.status === "ringing") {
    void publishCallEvent(`call:${callId}`, "call_cancelled", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_cancelled", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_cancelled", { callId });
  }

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

  let receipt = await prisma.callReceipt.findUnique({
    where: { callId: call.id },
  });

  if (!receipt && call.endedAt) {
    receipt = await upsertCallReceipt(call.id);
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

  const durationSeconds = receipt?.durationSeconds ?? 0;
  const previewSeconds = receipt?.previewSeconds ?? 0;
  const totalChargedTokens = receipt?.totalChargedTokens ?? 0;
  const refundedTokens = receipt?.refundedTokens ?? 0;
  const receiverEarningsTokens = receipt?.earnedTokens ?? 0;
  const outcomeCode = getOutcomeCode({
    status: call.status,
    endReason: call.endReason ?? null,
    bothConnectedAt: call.participants?.bothConnectedAt ?? null,
    durationSeconds,
  });
  const outcomeMessage = getOutcomeMessage(outcomeCode);

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
      outcomeCode,
      outcomeMessage,
    },
  });
}
