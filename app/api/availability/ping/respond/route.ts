// ================================
// BuyAMinute — Availability Ping Response API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { AvailabilityResponse } from "@/lib/domain";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /availability/ping/respond
 * Body:
 * {
 *   pingId: string,
 *   userId: string,
 *   response: "available_now" | "available_later" | "not_available"
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { pingId, userId, response } = body;

  if (!pingId || !userId || !response) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (!Object.values(AvailabilityResponse).includes(response)) {
    return jsonError("Invalid response", 400, "invalid_response");
  }

  const ping = await prisma.availabilityPing.findUnique({
    where: { id: pingId },
  });

  if (!ping) {
    return jsonError("Ping not found", 404, "not_found");
  }

  if (ping.receiverId !== userId) {
    return jsonError("Unauthorized", 401, "unauthorized");
  }

  if (ping.response) {
    return Response.json({ ok: true, ping });
  }

  const updated = await prisma.availabilityPing.update({
    where: { id: pingId },
    data: {
      response,
      status: "replied",
      respondedAt: new Date(),
    },
  });

  return Response.json({ ok: true, ping: updated });
}
