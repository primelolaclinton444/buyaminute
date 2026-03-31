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

/**
 * LiveKit webhook event names (livekit-server-sdk v2 / @livekit/protocol).
 *
 * The SDK's WebhookReceiver.receive() decodes the protobuf and returns an
 * object whose `.event` field is one of these strings. The old code was
 * checking for "participant_connected" / "participant_disconnected" which
 * do NOT exist — causing every event to fall through as "unknown" and
 * leaving calls stuck in "ringing" forever.
 *
 * Correct event names:
 *   "participant_joined"  — fired when a participant joins the room
 *   "participant_left"    — fired when a participant leaves the room
 *   "room_started"        — room created
 *   "room_finished"       — room destroyed (all participants gone)
 */
const PARTICIPANT_JOINED = "participant_joined";
const PARTICIPANT_LEFT = "participant_left";

function normalizeCallId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // LiveKit room names are "call_<id>" — strip the prefix to get the DB id.
  // But only strip it when it's actually there; plain cuid() ids pass through.
  if (value.startsWith("call_")) return value.slice("call_".length);
  return value;
}

/**
 * Extract the fields we care about from whatever shape LiveKit sends.
 *
 * LiveKit v2 SDK decodes to an object like:
 *   { event: "participant_joined", room: { name: "call_<id>", ... },
 *     participant: { identity: "caller:<userId>", ... } }
 *
 * The old normalizePayload also checked payload?.callId / payload?.participantRole
 * as fallbacks for direct-JSON test payloads (used in tests). We keep those.
 */
function normalizePayload(payload: any): {
  eventName: string;
  callId: string | null;
  participantRole: string;
} {
  // Primary: real LiveKit SDK payload
  const eventName: string =
    payload?.event ??
    payload?.name ??
    "unknown";

  // Room name is in payload.room.name for real webhooks
  const rawCallId: unknown =
    payload?.room?.name ??
    payload?.callId ??
    null;

  const callId = normalizeCallId(rawCallId);

  // Identity is "caller:<userId>" or "receiver:<userId>"
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
 * When BOTH caller and receiver have joined, we:
 *   1. Set bothConnectedAt on CallParticipant
 *   2. Determine whether the free preview applies (first call between this pair)
 *   3. Mark the call as "connected"
 *   4. Publish call_connected via Ably
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  const now = new Date();

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call || call.status === "ended") return;

  // Guard: don't re-process if billing already settled (idempotency)
  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId
  );
  if (alreadySettled) return;

  // Ensure CallParticipant row exists
  let participants = call.participants;
  if (!participants) {
    participants = await prisma.callParticipant.create({
      data: { callId },
    });
  }

  // Record which side connected
  const updatePayload: {
    callerConnectedAt?: Date;
    receiverConnectedAt?: Date;
  } = {};

  if (participantRole === "caller" && !participants.callerConnectedAt) {
    updatePayload.callerConnectedAt = now;
  } else if (participantRole === "receiver" && !participants.receiverConnectedAt) {
    updatePayload.receiverConnectedAt = now;
  } else {
    // Unknown role or already recorded — nothing to do for this side
    // but we still need to check if both are now connected
  }

  if (Object.keys(updatePayload).length > 0) {
    participants = await prisma.callParticipant.update({
      where: { callId },
      data: updatePayload,
    });
  }

  // Re-fetch to get latest state after our update
  const latestParticipants = await prisma.callParticipant.findUnique({
    where: { callId },
  });

  const bothConnected =
    latestParticipants?.callerConnectedAt &&
    latestParticipants?.receiverConnectedAt &&
    !latestParticipants?.bothConnectedAt;

  if (bothConnected) {
    // Determine preview eligibility
    const hasLock = await hasActivePreviewLock({
      callerId: call.callerId,
      receiverId: call.receiverId,
    });
    const previewApplied = !hasLock;

    // Set bothConnectedAt and update call status + previewApplied atomically
    await prisma.$transaction([
      prisma.callParticipant.update({
        where: { callId },
        data: { bothConnectedAt: now },
      }),
      prisma.call.update({
        where: { id: callId },
        data: {
          status: "connected",
          previewApplied,
        },
      }),
    ]);

    // Consume preview lock so the next call between this pair is billed from second 1
    if (previewApplied) {
      await consumePreview({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
    }

    // Notify both parties via Ably
    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_connected", { callId });
  } else if (call.status !== "connected") {
    // Only one side connected so far — still mark as connected so the token
    // endpoint allows the other side to join
    await prisma.call.update({
      where: { id: callId },
      data: { status: "connected" },
    });

    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_connected", { callId });
  }
}

/**
 * Handle participant_left / room_finished.
 *
 * Any departure ends the call and triggers settlement.
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

      // LiveKit sends the signature in the Authorization header
      const auth =
        req.headers.get("authorization") ||
        req.headers.get("x-livekit-signature") ||
        req.headers.get("x-livekit-webhook-signature") ||
        "";

      if (!auth) {
        return jsonError("Missing signature", 401, "missing_signature");
      }

      // receiver.receive() validates the signature AND decodes the protobuf
      payload = receiver.receive(rawBody, auth);
    } else {
      // Dev/test path: no credentials configured, accept raw JSON
      payload = JSON.parse(rawBody);
    }

    const { eventName, callId, participantRole } = normalizePayload(payload);

    console.log("[livekit] verified:", {
      eventName,
      callId,
      participantRole,
    });

    if (!callId) {
      // Events without a room (e.g. room_started before our call is created)
      // are not errors — just ignore them.
      return Response.json({ ok: true, skipped: true });
    }

    // Deduplicate: LiveKit guarantees at-least-once delivery.
    // When we have a real LiveKit event ID use it; otherwise generate a
    // random suffix so duplicate webhook re-deliveries of the same event
    // don't get silently dropped (the old sha256-of-body approach caused
    // two distinct events with the same body to collide).
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
        data: {
          id: eventKey,
          callId,
          eventName,
          participantRole,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Only a genuine LiveKit event ID makes this idempotent; the
        // random-suffix path above never collides.
        return Response.json({ ok: true, deduped: true });
      }
      throw err;
    }

    // Route by correct LiveKit v2 event names
    if (eventName === PARTICIPANT_JOINED) {
      await handleParticipantJoined(callId, participantRole);
    }

    if (eventName === PARTICIPANT_LEFT) {
      await handleParticipantLeft(callId);
    }

    // Also handle "room_finished" — fires when the last participant leaves;
    // treats it the same as a participant departure.
    if (eventName === "room_finished") {
      await handleParticipantLeft(callId);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error(
      "[livekit] invalid signature or payload:",
      err?.message || err
    );
    return jsonError("Invalid signature", 401, "invalid_signature");
  }
}
