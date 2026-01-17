// ================================
// BuyAMinute — Wallet Deposit Info API (Secured)
// Phase 9
// ================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const depositAddress = await prisma.depositAddress.findUnique({
    where: { userId: auth.user.id },
  });

  if (!depositAddress) {
    return jsonError(
      "Deposit address not available yet. Contact support to assign one.",
      404,
      "deposit_address_missing"
    );
  }

  return Response.json({
    network: "USDT (TRC20)",
    address: depositAddress.tronAddress,
    memo: null,
  });
}
