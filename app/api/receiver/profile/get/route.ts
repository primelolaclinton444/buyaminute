// ================================
// BuyAMinute — Receiver Profile Get API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /receiver/profile/get?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return jsonError("Missing userId", 400, "invalid_payload");
  }

  const profile = await prisma.receiverProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return jsonError("Profile not found", 404, "not_found");
  }

  return Response.json({ ok: true, profile });
}
