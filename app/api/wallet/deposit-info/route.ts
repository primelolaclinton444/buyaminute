// ================================
// BuyAMinute — Wallet Deposit Info API (Secured)
// Phase 1: auto-provisions a derived deposit address on first view.
// ================================

import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { getOrCreateDepositAddress } from "@/lib/tron/provisionDepositAddress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const address = await getOrCreateDepositAddress(auth.user.id);

    return Response.json({
      network: "USDT (TRC20)",
      address,
      memo: null,
    });
  } catch (err: any) {
    return jsonError(
      err?.message || "Could not provision a deposit address",
      500,
      "deposit_address_error"
    );
  }
}
