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
 * THE ORIGINAL BUG:
 * The old implementation read CallParticipant outside a transaction, built
 * an updatePayload object, wrote it, then re-fetched to check bothConnected.
 * When two participant_joined webhooks arrived simultaneously (normal — both
 * clients pre-connect during "ringing"/"accepted"), both reads returned the
 * same stale row with all nulls. Each wrote only its own timestamp. Each
 * re-fetch only saw its own timestamp. Neither ever wrote bothConnectedAt.
 * Settlement then computed duration = 0 and refunded the caller in full.
 *
 * PREVIOUS ATTEMPTED FIX (WRONG):
 * Wrapped everything in a SERIALIZABLE $transaction. This caused P2034
 * serialization aborts when two concurrent webhooks conflicted on the same
 * row. The P2034 handler returned 503, relying on LiveKit to retry — but
 * retry delays meant calls took much longer or never connected at all.
 * Worse, hasActivePreviewLock used the global prisma client inside the tx,
 * which opened a nested connection outside the transaction's snapshot and
 * caused additional silent failures on Neon serverless Postgres.
 *
 * CORRECT FIX (this version):
 * No SERIALIZABLE needed. Plain READ COMMITTED (Postgres default) is
 * sufficient because each write is a single atomic SQL statement:
 *
 * Step 1 — write individual timestamp with a null-guard WHERE:
 *   UPDATE CallParticipant SET callerConnectedAt = $now
 *   WHERE callId = $id AND callerConnectedAt IS NULL
 *   → atomic no-op if already written by a concurrent webhook.
 *
 * Step 2 — write bothConnectedAt with a compound WHERE:
 *   UPDATE CallParticipant SET bothConnectedAt = $now
 *   WHERE callId = $id
 *     AND callerConnectedAt IS NOT NULL
 *     AND receiverConnectedAt IS NOT NULL
 *     AND bothConnectedAt IS NULL
 *   → only fires when BOTH timestamps are present and bothConnectedAt
 *     is still null. Exactly one of the two concurrent webhooks gets
 *     count=1. The other gets count=0 (no-op).
 *
 * Step 3 — hasActivePreviewLock and consumePreview run entirely outside
 *   any transaction, using the global prisma client as intended.
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  const now = new Date();

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  // "accepted" is a valid in-flight state (set by respondToCall) —
  // treat it identically to "ringing" for participant tracking.
  if (!call || call.status === "ended") return;

  // Idempotency: don't re-process if billing already settled.
  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    call.callerId,
    call.receiverId,
  );
  if (alreadySettled) return;

  // Ensure CallParticipant row exists (created with the call, but guard defensively).
  if (!call.participants) {
    await prisma.callParticipant.create({ data: { callId } });
  }

  // ── Step 1: Write this side's timestamp atomically ────────────────────
  // null-guard WHERE → safe to run from both concurrent webhooks.
  // The second execution matches 0 rows and does nothing.
  if (participantRole === "caller") {
    await prisma.callParticipant.updateMany({
      where: { callId, callerConnectedAt: null },
      data: { callerConnectedAt: now },
    });
  } else if (participantRole === "receiver") {
    await prisma.callParticipant.updateMany({
      where: { callId, receiverConnectedAt: null },
      data: { receiverConnectedAt: now },
    });
  }

  // ── Step 2: Attempt to write bothConnectedAt atomically ───────────────
  // Compound WHERE: only fires when both individual timestamps are present
  // AND bothConnectedAt is still null. Whichever concurrent webhook runs
  // this after both timestamps are committed gets count=1. The other
  // gets count=0 — a safe no-op. No SERIALIZABLE, no deadlock, no retry.
  const bothResult = await prisma.callParticipant.updateMany({
    where: {
      callId,
      callerConnectedAt: { not: null },
      receiverConnectedAt: { not: null },
      bothConnectedAt: null,
    },
    data: { bothConnectedAt: now },
  });

  const bothJustBecameConnected = bothResult.count > 0;

  if (bothJustBecameConnected) {
    // ── Step 3: Preview check — must be outside any transaction ──────────
    // hasActivePreviewLock uses the global prisma client. Calling it inside
    // a Prisma $transaction caused nested-connection failures in Neon.
    const hasLock = await hasActivePreviewLock({
      callerId: call.callerId,
      receiverId: call.receiverId,
    });
    const previewApplied = !hasLock;

    await prisma.$transaction([
      prisma.callParticipant.update({
        where: { callId },
        data: { bothConnectedAt: now },
      }),
      prisma.call.update({
        where: { id: callId },
        data: { status: "connected", previewApplied },
      }),
    ]);

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

  // Only one side connected so far — ensure call status is "connected" so
  // the token endpoint allows the other party to join. Handles "ringing",
  // "accepted", and is idempotent on "connected".
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
