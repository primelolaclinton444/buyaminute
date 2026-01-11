// ================================
// BuyAMinute — Calls/End API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { settleEndedCall } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/end
 * Body:
 * {
 *   callId: string,
 *   endedBy?: "caller" | "receiver" | "system"
 * }
 *
 * Rules:
 * - Ending stops billing immediately (we end the call server-side).
 * - Settlement happens after end.
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  const session = gate.ok ? null : await requireAuth();
  if (!gate.ok && !session.ok) {
    if (gate.status === 500) {
      return new Response(gate.msg, { status: gate.status });
    }
    return session.response;
  }

  const body = await req.json();
  const { callId } = body ?? {};

  if (!callId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (!gate.ok) {
    if (call.callerId !== session.user.id && call.receiverId !== session.user.id) {
      return jsonError("Unauthorized", 403, "forbidden");
    }
  }

  if (call.status === "ended") {
    // Idempotent: ending an ended call is a no-op
    return Response.json({ ok: true });
  }

  await prisma.call.update({
    where: { id: callId },
    data: {
      status: "ended",
      endedAt: new Date(),
    },
  });

  // Settle deterministically after end
  await settleEndedCall(callId);

  return Response.json({ ok: true });
}
