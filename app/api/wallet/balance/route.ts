// ================================
// BuyAMinute — Wallet/Balance API (Secured)
// Phase 8
// ================================

import { requireInternalKey } from "@/lib/internalAuth";
import { getWalletBalance } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /wallet/balance?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return new Response("Missing userId", { status: 400 });

  const balanceTokens = await getWalletBalance(userId);
  return Response.json({ ok: true, userId, balanceTokens });
}
