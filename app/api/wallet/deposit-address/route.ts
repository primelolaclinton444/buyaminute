// ================================
// BuyAMinute — Deposit Address API (Secured)
// Phase 2
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /wallet/deposit-address?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return jsonError("Missing userId", 400, "invalid_payload");

  const existing = await prisma.depositAddress.findUnique({
    where: { userId },
  });

  if (!existing) {
    return jsonError("Deposit address not found", 404, "not_found");
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
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { userId, tronAddress } = body;

  if (!userId || !tronAddress) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const assigned = await prisma.depositAddress.upsert({
    where: { userId },
    create: { userId, tronAddress },
    update: { tronAddress },
  });

  return Response.json({ ok: true, userId, tronAddress: assigned.tronAddress });
}
