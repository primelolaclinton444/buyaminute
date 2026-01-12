// ================================
// BuyAMinute — Earnings Visibility Settings (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { EARNINGS_VISIBILITY_COOLDOWN_HOURS } from "@/lib/constants";
import { jsonError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth";

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
  const body = await req.json();
  const { userId: bodyUserId, earningsVisible } = body;

  if (earningsVisible === undefined) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (typeof earningsVisible !== "boolean") {
    return jsonError("Invalid earningsVisible", 400, "invalid_payload");
  }

  const gate = requireInternalKey(req as any);
  let userId = bodyUserId;

  if (!gate.ok) {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    userId = auth.user.id;
  }

  if (!userId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
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
