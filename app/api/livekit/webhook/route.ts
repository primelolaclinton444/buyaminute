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
 */
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
 * THE PROBLEM THIS SOLVES:
 * Two participant_joined webhooks fire near-simultaneously (normal —
 * both clients connect to LiveKit during "ringing"/"accepted"). Without
 * coordination, both webhooks read the same stale CallParticipant row
 * (all nulls), each writes only its own timestamp, each re-reads and
 * only sees its own timestamp, neither writes bothConnectedAt.
 * Settlement computes duration = 0 and issues a full refund.
 *
 * APPROACH: SELECT FOR UPDATE inside a READ COMMITTED transaction.
 *
 * SELECT FOR UPDATE acquires an exclusive row-level lock on the
 * CallParticipant row. The second concurrent webhook blocks at this
 * statement until the first transaction commits. When it proceeds,
 * it reads the fully committed post-first-transaction state — both
 * individual timestamps are visible, bothConnectedAt is written.
 *
 * This is the standard Postgres pattern for concurrent read-modify-write
 * on the same row. No SERIALIZABLE isolation (which caused P2034 aborts
 * and deadlocks with nested prisma client calls). No $queryRaw (which
 * has column-name casing issues and fragile timestamp comparisons).
 * Plain READ COMMITTED + row lock. The wait time is microseconds.
 *
 * hasActivePreviewLock and consumePreview MUST stay outside the
 * transaction — they use the global prisma client and touching a
 * second table inside a locked transaction risks deadlock if another
 * request locks that table first.
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  const now = new Date();

  // Pre-check outside transaction — fast exit for already-ended calls.
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { status: true, callerId: true, receiverId: true },
  });

  // "accepted" is a valid in-flight state set by respondToCall(accept).
  if (!call || call.status === "ended") return;

  // Idempotency: skip if billing already settled.
  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId,
  );
  if (alreadySettled) return;

  // ── Locked read-modify-write ──────────────────────────────────────────
  // The SELECT FOR UPDATE on CallParticipant serializes concurrent webhook
  // invocations for the same call. The second blocks until the first
  // commits, then reads the updated row with both timestamps present.
  const bothJustBecameConnected = await prisma.$transaction(async (tx) => {
    // Acquire exclusive lock on this row.
    // If another webhook invocation holds this lock, we wait here (microseconds).
    await tx.$queryRaw`
      SELECT 1 FROM "CallParticipant" WHERE "callId" = ${callId} FOR UPDATE
    `;

    // Ensure the row exists (defensive — created with the call).
    let row = await tx.callParticipant.findUnique({ where: { callId } });
    if (!row) {
      row = await tx.callParticipant.create({ data: { callId } });
    }

    // Build the update — only set timestamps that aren't already set.
    const updateData: {
      callerConnectedAt?: Date;
      receiverConnectedAt?: Date;
      bothConnectedAt?: Date;
    } = {};

    if (participantRole === "caller" && !row.callerConnectedAt) {
      updateData.callerConnectedAt = now;
    }
    if (participantRole === "receiver" && !row.receiverConnectedAt) {
      updateData.receiverConnectedAt = now;
    }

    // Compute what the timestamps will be after this update.
    const effectiveCaller = updateData.callerConnectedAt ?? row.callerConnectedAt;
    const effectiveReceiver = updateData.receiverConnectedAt ?? row.receiverConnectedAt;

    // Write bothConnectedAt if both sides are now present and it isn't set yet.
    // The row lock guarantees no concurrent writer can have set either
    // individual timestamp between our SELECT and this point.
    const willSetBoth = Boolean(effectiveCaller) && Boolean(effectiveReceiver) && !row.bothConnectedAt;
    if (willSetBoth) {
      updateData.bothConnectedAt = now;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.callParticipant.update({
        where: { callId },
        data: updateData,
      });
    }

    return willSetBoth;
  });
  // ── End locked transaction ────────────────────────────────────────────

  if (bothJustBecameConnected) {
    // Preview check and consumePreview are outside the transaction —
    // they use the global prisma client and must not run inside a locked tx.
    const hasLock = await hasActivePreviewLock({
      callerId: call.callerId,
      receiverId: call.receiverId,
    });
    const previewApplied = !hasLock;

    await prisma.call.update({
      where: { id: callId },
      data: { status: "connected", previewApplied },
    });

    if (previewApplied) {
      await consumePreview({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
    }

    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${call.receiverId}`, "call_connected", { callId });

    return;
  }

  // Only one side connected so far (or duplicate event for a side already recorded).
  // Ensure call.status is "connected" so the token endpoint allows joining.
  // Re-read status from DB here — don't use the cached pre-transaction value.
  const fresh = await prisma.call.findUnique({
    where: { id: callId },
    select: { status: true },
  });
  if (fresh && fresh.status !== "connected" && fresh.status !== "ended") {
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
      return Response.json({ ok: true, skipped: true });
    }

    // Deduplicate: LiveKit guarantees at-least-once delivery.
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

    // room_finished fires when the last participant leaves — same as left.
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
