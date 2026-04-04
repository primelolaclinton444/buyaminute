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
 * Atomically update CallParticipant timestamps and detect when both sides
 * have connected, using a single SQL UPDATE with CASE expressions.
 *
 * THE PROBLEM WITH ALL PREVIOUS APPROACHES:
 *
 * Every multi-statement approach (read → write → read, or separate step1/step2
 * updateMany calls) has a race window where two concurrent webhook invocations
 * can each see stale data between their individual statements. In READ COMMITTED
 * isolation, each statement only sees data committed before THAT STATEMENT began.
 * If webhook A's step-1 commit and webhook B's step-2 read happen concurrently,
 * B's step-2 may not see A's write, leaving bothConnectedAt null forever.
 *
 * THE CORRECT FIX:
 *
 * Collapse everything into ONE SQL UPDATE statement with CASE expressions.
 * Postgres evaluates all CASE expressions against the PRE-UPDATE row state
 * atomically within a single statement execution. No inter-statement gap.
 * No race. No transaction overhead. No deadlock risk.
 *
 * The statement does:
 *   - SET callerConnectedAt = $now  WHERE role='caller' AND col IS NULL
 *   - SET receiverConnectedAt = $now  WHERE role='receiver' AND col IS NULL
 *   - SET bothConnectedAt = $now  WHERE both (including this webhook's write)
 *     would be non-null AND bothConnectedAt IS NULL
 *
 * All three assignments are evaluated against the same pre-update snapshot.
 * The bothConnectedAt CASE uses the post-write values of the individual
 * timestamps inline (via nested CASE) so it correctly accounts for the
 * timestamp being set by THIS statement in the same round.
 *
 * RETURNING gives us the post-update values so we can tell whether
 * bothConnectedAt was written by this invocation (vs already set).
 */
type ParticipantRow = {
  callerConnectedAt: Date | null;
  receiverConnectedAt: Date | null;
  bothConnectedAt: Date | null;
};

async function atomicUpdateParticipant(
  callId: string,
  participantRole: string,
  now: Date
): Promise<ParticipantRow> {
  const isCallerRole = participantRole === "caller";
  const isReceiverRole = participantRole === "receiver";

  const rows = await prisma.$queryRaw<ParticipantRow[]>`
    UPDATE "CallParticipant"
    SET
      "callerConnectedAt" = CASE
        WHEN ${isCallerRole} AND "callerConnectedAt" IS NULL THEN ${now}
        ELSE "callerConnectedAt"
      END,
      "receiverConnectedAt" = CASE
        WHEN ${isReceiverRole} AND "receiverConnectedAt" IS NULL THEN ${now}
        ELSE "receiverConnectedAt"
      END,
      "bothConnectedAt" = CASE
        WHEN "bothConnectedAt" IS NULL
          AND (
            CASE WHEN ${isCallerRole} AND "callerConnectedAt" IS NULL
                 THEN ${now} ELSE "callerConnectedAt" END
          ) IS NOT NULL
          AND (
            CASE WHEN ${isReceiverRole} AND "receiverConnectedAt" IS NULL
                 THEN ${now} ELSE "receiverConnectedAt" END
          ) IS NOT NULL
        THEN ${now}
        ELSE "bothConnectedAt"
      END
    WHERE "callId" = ${callId}
    RETURNING
      "callerConnectedAt",
      "receiverConnectedAt",
      "bothConnectedAt"
  `;

  const row = rows[0];
  if (!row) {
    // Row didn't exist — create it and retry once.
    await prisma.callParticipant.create({ data: { callId } });
    return atomicUpdateParticipant(callId, participantRole, now);
  }
  return row;
}

/**
 * Handle participant_joined.
 *
 * Uses a single atomic SQL UPDATE (via $queryRaw) to write individual
 * connection timestamps and detect when both participants have joined —
 * all in one round-trip with no inter-statement race window.
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  const now = new Date();

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

  // Single atomic UPDATE — no race condition possible.
  const result = await atomicUpdateParticipant(callId, participantRole, now);

  const bothJustBecameConnected =
    result.bothConnectedAt !== null &&
    // Distinguish "written by this invocation" from "was already set":
    // bothConnectedAt equals `now` only if this statement wrote it.
    // Using time equality is safe here because `now` is captured once
    // per webhook invocation and the write is idempotent if re-run.
    result.bothConnectedAt.getTime() === now.getTime();

  if (bothJustBecameConnected) {
    // Preview check must be outside any transaction — uses global prisma.
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

  // Only one side connected so far (or duplicate event).
  // Ensure call status is "connected" so the token endpoint allows joining.
  // Handles "ringing", "accepted", and is idempotent on "connected".
  if (call.status !== "connected") {
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
