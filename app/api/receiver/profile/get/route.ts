// ================================
// BuyAMinute — Receiver Profile Get API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /receiver/profile/get?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const profile = await prisma.receiverProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  return Response.json({ ok: true, profile });
}
