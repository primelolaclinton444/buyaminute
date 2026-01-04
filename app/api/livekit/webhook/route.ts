// ================================
// BuyAMinute — LiveKit Webhook
// Phase 6
// ================================

import { PrismaClient } from "@prisma/client";
import { consumePreview } from "../../../../lib/previewLock";

const prisma = new PrismaClient();

/**
 * Expected incoming payload shape (minimal, MVP):
 * {
 *   event: "participant_connected" | "participant_disconnected",
 *   callId: string,
 *   participantRole: "caller" | "receiver"
 * }
 *
 * Note:
 * - In real deployment, LiveKit sends richer webhook payloads.
 * - For MVP, we map whatever LiveKit gives into this minimal form
 *   using a small adapter (later).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { event, callId, participantRole } = body;

  if (!event || !callId || !participantRole) {
    return new Response("Invalid payload", { status: 400 });
  }

  const call = await prisma.call.findUnique({
    where: { id: callId },
  });

  if (!call) {
    return new Response("Call not found", { status: 404 });
  }

  // Ensure participant row exists
  await prisma.callParticipant.upsert({
    where: { callId },
    create: { callId },
    update: {},
  });

  const now = new Date();

  if (event === "participant_connected") {
    if (participantRole === "caller") {
      await prisma.callParticipant.update({
        where: { callId },
        data: { callerConnectedAt: now },
      });
    } else {
      await prisma.callParticipant.update({
        where: { callId },
        data: { receiverConnectedAt: now },
      });
    }

    // After updating individual connection, check if both connected
    const p = await prisma.callParticipant.findUnique({ where: { callId } });

    if (p?.callerConnectedAt && p?.receiverConnectedAt && !p?.bothConnectedAt) {
      await prisma.callParticipant.update({
        where: { callId },
        data: { bothConnectedAt: now },
      });

      // Mark call connected
      await prisma.call.update({
        where: { id: callId },
        data: { status: "connected" },
      });

      // Consume preview immediately (Rule 6A)
      await consumePreview({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
    }

    return Response.json({ ok: true });
  }

  if (event === "participant_disconnected") {
    // Disconnect ends session immediately (no stitching)
    await prisma.call.update({
      where: { id: callId },
      data: { status: "ended", endedAt: now },
    });

    return Response.json({ ok: true });
  }

  return new Response("Unsupported event", { status: 400 });
}
