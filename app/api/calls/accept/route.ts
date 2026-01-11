// ================================
// BuyAMinute — Calls/Accept API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/accept
 * Body:
 * {
 *   callId: string
 * }
 *
 * MVP: Marks call as "connected" intent-wise.
 * Actual connection timestamps come from LiveKit webhook events.
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callId } = body;

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

  // If it's still created/ringing, move to connected state.
  // LiveKit events will set timestamps and consume preview.
  await prisma.call.update({
    where: { id: callId },
    data: { status: "connected" },
  });

  return Response.json({ ok: true });
}
