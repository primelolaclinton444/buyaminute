// ================================
// BuyAMinute — Calls/End API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { settleEndedCall } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/end
 * Body:
 * {
 *   callId: string,
 *   endedBy: "caller" | "receiver" | "system"
 * }
 *
 * Rules:
 * - Ending stops billing immediately (we end the call server-side).
 * - Settlement happens after end.
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { callId, endedBy } = body;

  if (!callId || !endedBy) {
    return new Response("Invalid payload", { status: 400 });
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return new Response("Call not found", { status: 404 });
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
