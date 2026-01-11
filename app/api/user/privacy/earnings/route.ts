// ================================
// BuyAMinute — Earnings Visibility Settings (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { EARNINGS_VISIBILITY_COOLDOWN_HOURS } from "@/lib/constants";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /user/privacy/earnings
 * Body:
 * {
 *   userId: string,
 *   earningsVisible: boolean
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { userId, earningsVisible } = body;

  if (!userId || earningsVisible === undefined) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (typeof earningsVisible !== "boolean") {
    return jsonError("Invalid earningsVisible", 400, "invalid_payload");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError("User not found", 404, "not_found");

  const now = new Date();
  if (user.earningsVisibilityLockedUntil && now < user.earningsVisibilityLockedUntil) {
    return jsonError("Visibility cooldown active", 429, "visibility_cooldown");
  }

  const lockedUntil = new Date(
    now.getTime() + EARNINGS_VISIBILITY_COOLDOWN_HOURS * 60 * 60 * 1000
  );

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      earningsVisible,
      earningsVisibilityLockedUntil: lockedUntil,
    },
  });

  return Response.json({ ok: true, user: updated });
}
