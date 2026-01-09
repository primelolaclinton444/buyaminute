// ================================
// BuyAMinute — Earnings Visibility Settings (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { EARNINGS_VISIBILITY_COOLDOWN_HOURS } from "@/lib/constants";

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
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { userId, earningsVisible } = body;

  if (!userId || earningsVisible === undefined) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (typeof earningsVisible !== "boolean") {
    return new Response("Invalid earningsVisible", { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const now = new Date();
  if (user.earningsVisibilityLockedUntil && now < user.earningsVisibilityLockedUntil) {
    return new Response("Visibility cooldown active", { status: 429 });
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
