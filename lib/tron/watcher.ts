// ================================
// BuyAMinute — USDT-TRC20 Deposit Watcher
// Phase 2 (deploy-safe)
// ================================

import { prisma } from "@/lib/prisma";
import { appendLedgerEntry } from "@/lib/ledger";
import { TOKENS_PER_USD, USDT_ATOMIC_MULTIPLIER } from "@/lib/constants";

// USDT-TRC20 contract address on TRON (mainnet)
const USDT_TRC20_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

// Minimum confirmations before crediting
const CONFIRMATION_THRESHOLD = 20;

// Lazy singleton TronWeb instance (IMPORTANT: no build-time constructor)
let _tronWeb: any = null;

async function getTronWeb() {
  if (_tronWeb) return _tronWeb;

  // Dynamic import prevents Next build-time evaluation issues
  const mod: any = await import("tronweb");
  const TronWeb: any = mod?.default ?? mod;

  _tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
    headers: process.env.TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
      : undefined,
  });

  return _tronWeb;
}

/**
 * Poll confirmed USDT-TRC20 deposits and credit tokens.
 * SAFE to run repeatedly (idempotent).
 */
export async function pollUsdtDeposits() {
  // Ensure TronWeb can initialize at runtime (not at build)
  await getTronWeb();

  const pendingDeposits = await prisma.cryptoDeposit.findMany({
    where: {
      credited: false,
      confirmations: {
        gte: CONFIRMATION_THRESHOLD,
      },
    },
  });

  for (const deposit of pendingDeposits) {
    // Idempotency guard: skip if already ledgered
    const existingLedger = await prisma.ledgerEntry.findFirst({
      where: {
        txHash: deposit.txHash,
        source: "crypto_deposit",
      },
    });

    if (existingLedger) continue;

    const tokensToCredit = Math.floor(
      (deposit.amountUsdtAtomic * TOKENS_PER_USD) / USDT_ATOMIC_MULTIPLIER
    );

    if (tokensToCredit <= 0) {
      continue;
    }

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
      data: {
        credited: true,
        confirmedAt: new Date(),
      },
    });
  }
}
