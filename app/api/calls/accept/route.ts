// ================================
// BuyAMinute — Calls/Accept API
// Phase 7
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { requireInternalKey } from "@/lib/internalAuth";

export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });




import { prisma } from "@/lib/prisma";
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
  const body = await req.json();
  const { callId } = body;

  if (!callId) {
    return new Response("Invalid payload", { status: 400 });
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return new Response("Call not found", { status: 404 });
  }

  if (call.status === "ended") {
    return new Response("Call already ended", { status: 400 });
  }

  // If it's still created/ringing, move to connected state.
  // LiveKit events will set timestamps and consume preview.
  await prisma.call.update({
    where: { id: callId },
    data: { status: "connected" },
  });

  return Response.json({ ok: true });
}
