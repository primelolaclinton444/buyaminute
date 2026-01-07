// ================================
// BuyAMinute — Calls/End API
// Phase 7
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireInternalKey } from "@/lib/internalAuth";

export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });



import { prisma } from "@/lib/prisma";
import { settleEndedCall } from "../../../../lib/settlement";
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
