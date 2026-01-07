// ================================
// BuyAMinute — Wallet/Balance API
// Phase 8
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getWalletBalance } from "../../../../lib/ledger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return new Response("Missing userId", { status: 400 });

  const balanceTokens = await getWalletBalance(userId);
  return Response.json({ ok: true, userId, balanceTokens });
}
