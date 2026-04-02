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
 * FIX: The previous implementation read CallParticipant outside a transaction,
 * then conditionally wrote callerConnectedAt or receiverConnectedAt, then
 * re-fetched to check bothConnected. When two participant_joined events
 * arrived near-simultaneously (the normal case — both clients pre-connect
 * during "ringing"), both reads returned the same stale row (all nulls),
 * each wrote only their own timestamp, and when each re-fetched they saw
 * only their own timestamp. Neither event ever set bothConnectedAt.
 *
 * Settlement then computed overlapMs = 0 (bothConnectedAt null → fallback
 * to 0), billableSeconds = 0, and issued a full preauth refund regardless
 * of how long the call actually lasted.
 *
 * THE FIX:
 * Collapse the entire read-modify-check-write sequence into a single
 * serializable Prisma transaction using conditional updateMany (WHERE
 * field IS NULL) for the individual timestamps, then re-read inside the
 * same transaction so Postgres guarantees we see the committed state from
 * any concurrent sibling transaction before we evaluate bothConnected.
 *
 * Using updateMany with a null-guard WHERE clause is the Prisma equivalent
 * of UPDATE ... SET col = $now WHERE col IS NULL — it is a no-op if the
 * column was already written, making it safe to call from both concurrent
 * webhooks without double-writing or clobbering.
 *
 * The bothConnectedAt write is also guarded (WHERE bothConnectedAt IS NULL)
 * so only the first transaction that sees both timestamps present will
 * actually commit the write. The second arrives, re-reads, sees
 * bothConnectedAt already set, and exits cleanly without side-effects.
 */
async function handleParticipantJoined(callId: string, participantRole: string) {
  // Fast pre-check outside transaction — avoids locking on already-ended calls.
  const callPreCheck = await prisma.call.findUnique({
    where: { id: callId },
    select: { status: true, callerId: true, receiverId: true },
  });

  if (!callPreCheck || callPreCheck.status === "ended") return;

  // Guard: don't re-process if billing already settled (idempotency).
  const alreadySettled = await hasSettledLedgerEntries(
    callId,
    callPreCheck.callerId,
    callPreCheck.receiverId,
  );
  if (alreadySettled) return;

  const now = new Date();

  // ── Atomic read-modify-write inside a serializable transaction ──────────
  //
  // All reads and writes in here are serialized by Postgres. Two concurrent
  // invocations of this function for the same callId will execute their
  // transactions sequentially (the second blocks until the first commits),
  // so the second will always see the first's written timestamp when it
  // re-reads latestParticipants.
  const { bothJustBecameConnected, previewApplied, callerId, receiverId } =
    await prisma.$transaction(
      async (tx) => {
        // Ensure the CallParticipant row exists (created alongside the Call,
        // but guard defensively).
        await tx.callParticipant.upsert({
          where: { callId },
          create: { callId },
          update: {},
        });

        // Write this participant's timestamp only if it is not yet set.
        // Using updateMany with a null-guard WHERE is the Prisma equivalent
        // of UPDATE ... SET col = $now WHERE col IS NULL — a no-op when
        // another concurrent transaction already committed the write.
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

        // Re-read INSIDE the transaction — Postgres guarantees we see the
        // committed state of any concurrent sibling transaction that already
        // ran its updateMany above.
        const latest = await tx.callParticipant.findUnique({
          where: { callId },
        });

        const bothTimestampsPresent =
          Boolean(latest?.callerConnectedAt) &&
          Boolean(latest?.receiverConnectedAt);

        const bothJustBecameConnected =
          bothTimestampsPresent && !latest?.bothConnectedAt;

        // Fetch the call to get caller/receiver IDs and current status.
        const call = await tx.call.findUnique({
          where: { id: callId },
          select: { callerId: true, receiverId: true, status: true },
        });

        if (!call) {
          return {
            bothJustBecameConnected: false,
            previewApplied: false,
            callerId: "",
            receiverId: "",
          };
        }

        if (bothJustBecameConnected) {
          // Check preview eligibility. hasActivePreviewLock uses its own
          // table so it cannot be inside this tx, but it only affects
          // billing math — not the correctness of bothConnectedAt.
          const hasLock = await hasActivePreviewLock({
            callerId: call.callerId,
            receiverId: call.receiverId,
          });
          const preview = !hasLock;

          // Write bothConnectedAt and mark the call connected atomically.
          // The updateMany null-guard on bothConnectedAt ensures only the
          // first transaction that reaches this point commits the write.
          await tx.callParticipant.updateMany({
            where: { callId, bothConnectedAt: null },
            data: { bothConnectedAt: now },
          });

          await tx.call.update({
            where: { id: callId },
            data: { status: "connected", previewApplied: preview },
          });

          return {
            bothJustBecameConnected: true,
            previewApplied: preview,
            callerId: call.callerId,
            receiverId: call.receiverId,
          };
        }

        // Only one side connected so far — ensure call status is "connected"
        // so the token endpoint allows the other side to join.
        if (call.status !== "connected") {
          await tx.call.update({
            where: { id: callId },
            data: { status: "connected" },
          });
        }

        return {
          bothJustBecameConnected: false,
          previewApplied: false,
          callerId: call.callerId,
          receiverId: call.receiverId,
        };
      },
      // SERIALIZABLE isolation guarantees the second concurrent transaction
      // sees the first's committed writes on re-read inside the tx.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  // Side-effects outside the transaction: preview lock consumption and
  // Ably publish. These are idempotent / best-effort and do not need to
  // be inside the transaction.
  if (bothJustBecameConnected) {
    if (previewApplied) {
      await consumePreview({ callerId, receiverId });
    }
    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${receiverId}`, "call_connected", { callId });
  } else if (callerId) {
    // Single participant connected — still notify so the caller's UI
    // transitions out of "waiting" state.
    void publishCallEvent(`call:${callId}`, "call_connected", { callId });
    void publishCallEvent(`user:${callerId}`, "call_connected", { callId });
    void publishCallEvent(`user:${receiverId}`, "call_connected", { callId });
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

      payload = receiver.receive(rawBody, auth);
    } else {
      payload = JSON.parse(rawBody);
    }

    const { eventName, callId, participantRole } = normalizePayload(payload);

    console.log("[livekit] verified:", { eventName, callId, participantRole });

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

    if (eventName === "room_finished") {
      await handleParticipantLeft(callId);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    // Serializable transactions can abort with a serialization failure
    // (Postgres error code 40001) when two concurrent transactions conflict.
    // LiveKit retries webhooks, so returning 503 tells it to retry — the
    // second attempt will succeed because by then the first has committed.
    if (err?.code === "P2034") {
      console.warn("[livekit] serialization conflict, signalling retry", err?.message);
      return new Response(JSON.stringify({ ok: false, retry: true }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }

    console.error(
      "[livekit] invalid signature or payload:",
      err?.message || err
    );
    return jsonError("Invalid signature", 401, "invalid_signature");
  }
}
