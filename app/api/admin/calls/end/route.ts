import { prisma } from "@/lib/prisma";
import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { settleEndedCall } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/calls/end
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body: { callId: string, reason?: string }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callId } = body ?? {};

  if (!callId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.status !== "ended") {
    await prisma.call.update({
      where: { id: callId },
      data: {
        status: "ended",
        endedAt: new Date(),
        endReason: "admin_end",
      },
    });

    await settleEndedCall(callId);
  }

  return Response.json({ ok: true });
}
