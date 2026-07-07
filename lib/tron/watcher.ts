// ================================
// BuyAMinute — USDT-TRC20 Deposit Watcher (credit step)
// ================================
//
// Credits tokens for deposits that have reached the confirmation threshold.
// On-chain detection + confirmation tracking lives in lib/tron/scanner.ts;
// this file only turns confirmed deposits into ledger credits. Idempotent.

import { prisma } from "@/lib/prisma";
import { appendLedgerEntry } from "@/lib/ledger";
import { TOKENS_PER_USD, USDT_ATOMIC_MULTIPLIER } from "@/lib/constants";

// Minimum confirmations before crediting.
const CONFIRMATION_THRESHOLD = 20;

/**
 * Poll confirmed USDT-TRC20 deposits and credit tokens.
 * SAFE to run repeatedly (idempotent on txHash).
 */
export async function pollUsdtDeposits() {
  const pendingDeposits = await prisma.cryptoDeposit.findMany({
    where: {
      credited: false,
      confirmations: { gte: CONFIRMATION_THRESHOLD },
    },
  });

  for (const deposit of pendingDeposits) {
    // Idempotency guard: skip if this txHash was already ledgered.
    const existingLedger = await prisma.ledgerEntry.findFirst({
      where: { txHash: deposit.txHash, source: "crypto_deposit" },
    });
    if (existingLedger) continue;

    const tokensToCredit = Math.floor(
      (deposit.amountUsdtAtomic * TOKENS_PER_USD) / USDT_ATOMIC_MULTIPLIER
    );
    if (tokensToCredit <= 0) continue;

    await appendLedgerEntry({
      userId: deposit.userId,
      type: "credit",
      amountTokens: tokensToCredit,
      source: "crypto_deposit",
      txHash: deposit.txHash,
      idempotencyKey: `deposit:${deposit.txHash}:${deposit.userId}`,
    });

    await prisma.cryptoDeposit.update({
      where: { id: deposit.id },
      data: { credited: true, confirmedAt: new Date() },
    });
  }
}
