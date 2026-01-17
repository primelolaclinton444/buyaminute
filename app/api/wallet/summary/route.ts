// ================================
// BuyAMinute — Wallet Summary API (Secured)
// Phase 9
// ================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getWalletBalanceFromLedgerWithClient } from "@/lib/ledger";
import { TOKENS_PER_USD, USDT_ATOMIC_MULTIPLIER } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokensFromUsdtAtomic(amountUsdtAtomic: number) {
  return Math.floor((amountUsdtAtomic * TOKENS_PER_USD) / USDT_ATOMIC_MULTIPLIER);
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const {
    ledgerTotals,
    pendingDeposits,
    latestWithdrawal,
    withdrawalAddress,
  } = await prisma.$transaction(async (tx) => {
    const [ledgerTotals, pendingDeposits, latestWithdrawal, withdrawalAddress] =
      await Promise.all([
        getWalletBalanceFromLedgerWithClient(tx, auth.user.id),
        tx.cryptoDeposit.findMany({
          where: { userId: auth.user.id, credited: false },
          select: { amountUsdtAtomic: true },
        }),
        tx.withdrawalRequest.findFirst({
          where: { userId: auth.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            amountTokens: true,
            createdAt: true,
            processedAt: true,
          },
        }),
        tx.depositAddress.findUnique({
          where: { userId: auth.user.id },
          select: { userId: true },
        }),
      ]);

    return { ledgerTotals, pendingDeposits, latestWithdrawal, withdrawalAddress };
  });

  const pendingTokens = pendingDeposits.reduce(
    (sum, deposit) => sum + tokensFromUsdtAtomic(deposit.amountUsdtAtomic),
    0
  );

  const totalTokens = ledgerTotals.balanceTokens + pendingTokens;

  return Response.json({
    totalTokens,
    availableTokens: ledgerTotals.availableTokens,
    onHoldTokens: ledgerTotals.lockedTokens,
    pendingTokens,
    withdrawalAddressOnFile: Boolean(withdrawalAddress),
    latestWithdrawal: latestWithdrawal
      ? {
          status: latestWithdrawal.status as "pending" | "sent" | "failed",
          amountTokens: latestWithdrawal.amountTokens,
          createdAt: latestWithdrawal.createdAt.toISOString(),
          processedAt: latestWithdrawal.processedAt?.toISOString() ?? null,
        }
      : { status: "none" },
  });
}
