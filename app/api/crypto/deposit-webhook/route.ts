// ================================
// BuyAMinute — USDT-TRC20 Deposit Intake
// Phase 2
// ================================

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This endpoint records detected USDT-TRC20 deposits.
 * It MUST be idempotent.
 * It MUST NOT credit tokens.
 */
export async function POST(req: Request) {
  const secret = process.env.DEPOSIT_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError("Server misconfigured", 500, "server_error");
  }

  const incoming = req.headers.get("x-deposit-secret");
  if (incoming !== secret) {
    return jsonError("Unauthorized", 401, "unauthorized");
  }

  const body = await req.json();

  const { userId, tronAddress, amountUsdtAtomic, txHash, confirmations } = body;

  if (
    !userId ||
    !tronAddress ||
    amountUsdtAtomic === undefined ||
    !txHash ||
    confirmations === undefined
  ) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }
  if (!Number.isInteger(amountUsdtAtomic) || amountUsdtAtomic <= 0) {
    return jsonError("Invalid amountUsdtAtomic", 400, "invalid_amount");
  }

  // Idempotency: do nothing if tx already recorded
  const existing = await prisma.cryptoDeposit.findUnique({
    where: { txHash },
  });

  if (existing) {
    return Response.json({ ok: true });
  }

  await prisma.cryptoDeposit.create({
    data: {
      userId,
      tronAddress,
      amountUsdtAtomic,
      txHash,
      confirmations,
      credited: false,
    },
  });

  return Response.json({ ok: true });
}
