// ================================
// BuyAMinute — Deposit Address API (Secured)
// Phase 2
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /wallet/deposit-address?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return new Response("Missing userId", { status: 400 });

  const existing = await prisma.depositAddress.findUnique({
    where: { userId },
  });

  if (!existing) {
    return new Response("Deposit address not found", { status: 404 });
  }

  return Response.json({ ok: true, userId, tronAddress: existing.tronAddress });
}

/**
 * POST /wallet/deposit-address
 * Body:
 * {
 *   userId: string,
 *   tronAddress: string
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { userId, tronAddress } = body;

  if (!userId || !tronAddress) {
    return new Response("Invalid payload", { status: 400 });
  }

  const assigned = await prisma.depositAddress.upsert({
    where: { userId },
    create: { userId, tronAddress },
    update: { tronAddress },
  });

  return Response.json({ ok: true, userId, tronAddress: assigned.tronAddress });
}
