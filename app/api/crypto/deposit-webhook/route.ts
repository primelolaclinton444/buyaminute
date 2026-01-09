// ================================
// BuyAMinute — USDT-TRC20 Deposit Intake
// Phase 2
// ================================

import { prisma } from "@/lib/prisma";

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
    return new Response("Server misconfigured", { status: 500 });
  }

  const incoming = req.headers.get("x-deposit-secret");
  if (incoming !== secret) {
    return new Response("Unauthorized", { status: 401 });
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
    return new Response("Invalid payload", { status: 400 });
  }
  if (!Number.isInteger(amountUsdtAtomic) || amountUsdtAtomic <= 0) {
    return new Response("Invalid amountUsdtAtomic", { status: 400 });
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
