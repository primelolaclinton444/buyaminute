// ================================
// BuyAMinute — Wallet/Balance API (Secured)
// Phase 8
// ================================

import { requireInternalKey } from "@/lib/internalAuth";
import { getWalletBalance } from "@/lib/ledger";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /wallet/balance?userId=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return jsonError("Missing userId", 400, "invalid_payload");

  const balanceTokens = await getWalletBalance(userId);
  return Response.json({ ok: true, userId, balanceTokens });
}
