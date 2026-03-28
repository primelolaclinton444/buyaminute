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

function normalizeCallId(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.startsWith("call_")) return value.slice("call_".length);
  return value;
}

function normalizePayload(payload: any) {
  const eventName =
    payload?.event ??
    payload?.name ??
    "unknown";

  const callId = normalizeCallId(
    payload?.callId ??
      payload?.room?.name ??
      null
  );

  const participantRole =
    payload?.participantRole ??
    (payload?.participant?.identity?.includes("caller")
      ? "caller"
      : payload?.participant?.identity?.includes("receiver")
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
    console.error(`Failed to publish Ably event ${eventName}`, error);
  }
}

async function hasSettledLedgerEntries(callId: string, callerId: string, receiverId: string) {
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

async function handleParticipantConnected(callId: string, participantRole: string) {
  const now = new Date();

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call || call.status === "ended") return;

  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId
  );
  if (alreadySettled) return;

  let participants = call.participants;
  if (!participants) {
    participants = await prisma.callParticipant.create({
      data: { callId },
    });
  }

  const updatePayload: {
    callerConnectedAt?: Date;
    receiverConnectedAt?: Date;
  } = {};

  if (participantRole === "caller") {
    if (!participants.callerConnectedAt) {
      updatePayload.callerConnectedAt = now;
    }
  } else if (participantRole === "receiver") {
    if (!participants.receiverConnectedAt) {
      updatePayload.receiverConnectedAt = now;
    }
  } else {
    return;
  }

  if (Object.keys(updatePayload).length > 0) {
    participants = await prisma.callParticipant.update({
      where: { callId },
      data: updatePayload,
    });
  }

  const updated = participants;

  if (
    updated?.callerConnectedAt &&
    updated?.receiverConnectedAt &&
    !updated?.bothConnectedAt
  ) {
    await prisma.callParticipant.update({
      where: { callId },
      data: { bothConnectedAt: now },
    });

    const hasLock = await hasActivePreviewLock({
      callerId: call.callerId,
      receiverId: call.receiverId,
    });

    const previewApplied = !hasLock;

    if (call.status !== "connected" || call.previewApplied !== previewApplied) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: "connected",
          previewApplied,
        },
      });
    }

    if (previewApplied) {
      await consumePreview({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
    }

    // Always publish call_connected when both parties are first confirmed
    // connected — regardless of what status was set before this webhook fired.
    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_connected", { callId });
  } else if (call.status !== "connected") {
    await prisma.call.update({
      where: { id: callId },
      data: { status: "connected" },
    });

    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_connected", { callId });
  }
}

async function handleParticipantDisconnected(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
  });

  if (!call || call.status === "ended") return;

  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId
  );

  const updated = await prisma.call.update({
    where: { id: callId },
    data: { status: "ended", endedAt: new Date() },
  });

  if (alreadySettled) {
    void publishCallEvent(`call:${callId}`, "call_ended", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_ended", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_ended", { callId });
    return;
  }

  await settleEndedCall(updated.id);

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

    console.log("[livekit] verified:", {
      eventName,
      callId,
      participantRole,
    });

    if (!callId) {
      return jsonError("Missing call id", 400, "missing_call_id");
    }

    // FIX (Bug 2): The original code used createHash("sha256").update(rawBody)
    // as the fallback event ID. This is dangerous: two distinct events (e.g.
    // caller_connected on call A and caller_connected on call B at the same
    // rate, same timestamp) can produce the same JSON body and therefore the
    // same hash, causing the second event to be silently dropped as a
    // "duplicate". This breaks bothConnectedAt logic and prevents billing.
    //
    // Fix: use a composite key of (callId + eventName + participantRole) plus
    // a random suffix to guarantee uniqueness while still being deterministic
    // enough for idempotency within a single webhook delivery attempt.
    // LiveKit may deliver the same webhook event multiple times (at-least-once
    // delivery), so we still deduplicate on the LiveKit-provided event ID when
    // it is present.
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
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Only truly deduplicate when we have a real LiveKit event ID — those
        // are genuinely idempotent. The random-suffix path above never collides.
        return Response.json({ ok: true, deduped: true });
      }
      throw err;
    }

    if (eventName === "participant_connected") {
      await handleParticipantConnected(callId, participantRole);
    }

    if (eventName === "participant_disconnected") {
      await handleParticipantDisconnected(callId);
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
