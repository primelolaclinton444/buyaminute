import { randomBytes } from "crypto";
import { WebhookReceiver } from "livekit-server-sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { consumePreview, hasActivePreviewLock } from "@/lib/previewLock";
import { settleEndedCall } from "@/lib/settlement";
import { ablyRest } from "@/lib/ably/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PARTICIPANT_JOINED = "participant_joined";
const PARTICIPANT_LEFT = "participant_left";

function normalizeCallId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("call_")) return value.slice("call_".length);
  return value;
}

function normalizePayload(payload: any): {
  eventName: string;
  callId: string | null;
  participantRole: string;
} {
  const eventName: string =
    payload?.event ??
    payload?.name ??
    "unknown";

  const rawCallId: unknown =
    payload?.room?.name ??
    payload?.callId ??
    null;

  const callId = normalizeCallId(rawCallId);

  const identity: string = payload?.participant?.identity ?? "";
  const participantRole: string =
    payload?.participantRole ??
    (identity.startsWith("caller")
      ? "caller"
      : identity.startsWith("receiver")
      ? "receiver"
      : "unknown");

  return { eventName, callId, participantRole };
}

async function publishCallEvent(
  channelName: string,
  eventName: string,
  data: { callId: string }
) {
  try {
    const channel = ablyRest.channels.get(channelName);
    await channel.publish(eventName, data);
  } catch (error) {
    console.error(`Failed to publish Ably event ${eventName} on ${channelName}`, error);
  }
}

async function hasSettledLedgerEntries(
  callId: string,
  callerId: string,
  receiverId: string
) {
  const settled = await prisma.ledgerEntry.findFirst({
    where: {
      callId,
      source: "call_billing",
      idempotencyKey: {
        in: [
          `call:${callId}:credit:${receiverId}`,
          `call:${callId}:refund:${callerId}`,
          `call:${callId}:debit:${callerId}`,
          `call:${callId}:debit:extra:${callerId}`,
        ],
      },
    },
    select: { id: true },
  });
  return Boolean(settled);
}

/**
 * Handle participant_joined.
 *
 * Uses a single SERIALIZABLE transaction to atomically write individual
 * connection timestamps and detect when both participants have joined,
 * eliminating the race condition where two near-simultaneous webhooks
 * both read a stale participants row and neither writes bothConnectedAt.
 *
 * Also handles the new "accepted" status introduced in respondToCall —
 * calls in "accepted" state are treated identically to "ringing" for
 * the purposes of participant tracking and status transitions.
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  const callPreCheck = await prisma.call.findUnique({
    where: { id: callId },
    select: { status: true, callerId: true, receiverId: true },
  });

  // "accepted" is a valid joinable state — do not skip it.
  if (!callPreCheck || callPreCheck.status === "ended") return;

  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    callPreCheck.callerId,
    callPreCheck.receiverId,
  );
  if (alreadySettled) return;

  const now = new Date();

  const { bothJustBecameConnected, previewApplied, callerId, receiverId } =
    await prisma.$transaction(
      async (tx) => {
        await tx.callParticipant.upsert({
          where: { callId },
          create: { callId },
          update: {},
        });

        // null-guard updateMany — no-op if another concurrent tx already wrote
        if (participantRole === "caller") {
          await tx.callParticipant.updateMany({
            where: { callId, callerConnectedAt: null },
            data: { callerConnectedAt: now },
          });
        } else if (participantRole === "receiver") {
          await tx.callParticipant.updateMany({
            where: { callId, receiverConnectedAt: null },
            data: { receiverConnectedAt: now },
          });
        }

        // Re-read inside the transaction — sees sibling tx's committed writes
        const latest = await tx.callParticipant.findUnique({
          where: { callId },
        });

        const bothTimestampsPresent =
          Boolean(latest?.callerConnectedAt) &&
          Boolean(latest?.receiverConnectedAt);

        const bothJustBecameConnected =
          bothTimestampsPresent && !latest?.bothConnectedAt;

        const call = await tx.call.findUnique({
          where: { id: callId },
          select: { callerId: true, receiverId: true, status: true },
        });

        if (!call) {
          return { bothJustBecameConnected: false, previewApplied: false, callerId: "", receiverId: "" };
        }

        if (bothJustBecameConnected) {
          const hasLock = await hasActivePreviewLock({
            callerId: call.callerId,
            receiverId: call.receiverId,
          });
          const preview = !hasLock;

          await tx.callParticipant.updateMany({
            where: { callId, bothConnectedAt: null },
            data: { bothConnectedAt: now },
          });

          await tx.call.update({
            where: { id: callId },
            data: { status: "connected", previewApplied: preview },
          });

          return { bothJustBecameConnected: true, previewApplied: preview, callerId: call.callerId, receiverId: call.receiverId };
        }

        // Single participant so far — set to "connected" if not already.
        // Handles "ringing", "accepted", and idempotently "connected".
        if (call.status !== "connected") {
          await tx.call.update({
            where: { id: callId },
            data: { status: "connected" },
          });
        }

        return { bothJustBecameConnected: false, previewApplied: false, callerId: call.callerId, receiverId: call.receiverId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  if (bothJustBecameConnected) {
    if (previewApplied) {
      await consumePreview({ callerId, receiverId });
    }
  }

  // Notify both parties regardless — single or both connected
  if (callerId) {
    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${receiverId}`, "call_connected", { callId });
  }
}

/**
 * Handle participant_left / room_finished.
 */
async function handleParticipantLeft(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
  });

  if (!call || call.status === "ended") return;

  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId
  );

  await prisma.call.update({
    where: { id: callId },
    data: { status: "ended", endedAt: new Date() },
  });

  if (!alreadySettled) {
    await settleEndedCall(callId);
  }

  void publishCallEvent(`call:${callId}`, "call_ended", { callId });
  void publishCallEvent(`user:${call.callerId}`, "call_ended", { callId });
  void publishCallEvent(`user:${call.receiverId}`, "call_ended", { callId });
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  try {
    const rawBody = await req.text();
    let payload: any = null;

    if (apiKey && apiSecret) {
      const receiver = new WebhookReceiver(apiKey, apiSecret);

      const auth =
        req.headers.get("authorization") ||
        req.headers.get("x-livekit-signature") ||
        req.headers.get("x-livekit-webhook-signature") ||
        "";

      if (!auth) {
        return jsonError("Missing signature", 401, "missing_signature");
      }

      payload = receiver.receive(rawBody, auth);
    } else {
      payload = JSON.parse(rawBody);
    }

    const { eventName, callId, participantRole } = normalizePayload(payload);

    console.log("[livekit] verified:", { eventName, callId, participantRole });

    if (!callId) {
      return Response.json({ ok: true, skipped: true });
    }

    const livekitEventId =
      payload?.event?.id ??
      payload?.eventId ??
      payload?.id ??
      null;

    const eventKey = livekitEventId
      ? `evt_${livekitEventId}`
      : `evt_${callId}_${eventName}_${participantRole}_${randomBytes(8).toString("hex")}`;

    try {
      await prisma.livekitWebhookEvent.create({
        data: { id: eventKey, callId, eventName, participantRole },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return Response.json({ ok: true, deduped: true });
      }
      throw err;
    }

    if (eventName === PARTICIPANT_JOINED) {
      await handleParticipantJoined(callId, participantRole);
    }

    if (eventName === PARTICIPANT_LEFT) {
      await handleParticipantLeft(callId);
    }

    if (eventName === "room_finished") {
      await handleParticipantLeft(callId);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    // Serializable tx conflict — LiveKit retries on 503
    if (err?.code === "P2034") {
      console.warn("[livekit] serialization conflict, signalling retry", err?.message);
      return new Response(JSON.stringify({ ok: false, retry: true }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }

    console.error("[livekit] invalid signature or payload:", err?.message || err);
    return jsonError("Invalid signature", 401, "invalid_signature");
  }
}
