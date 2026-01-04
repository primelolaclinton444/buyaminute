// ================================
// BuyAMinute — USDT-TRC20 Deposit Watcher
// Phase 2
// ================================

import TronWeb from "tronweb";
import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry } from "../ledger";
import { TOKENS_PER_USD } from "../constants";

const prisma = new PrismaClient();

// USDT-TRC20 contract address on TRON (mainnet)
const USDT_TRC20_CONTRACT =
  "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

const CONFIRMATION_THRESHOLD = 20;

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
});

/**
 * Poll confirmed USDT-TRC20 deposits and credit tokens.
 * This function is SAFE to run repeatedly (idempotent).
 */
export async function pollUsdtDeposits() {
  const pendingDeposits = await prisma.cryptoDeposit.findMany({
    where: {
      credited: false,
      confirmations: {
        gte: CONFIRMATION_THRESHOLD,
      },
    },
  });

  for (const deposit of pendingDeposits) {
    // Idempotency guard
    const existingLedger = await prisma.ledgerEntry.findFirst({
      where: {
        txHash: deposit.txHash,
        source: "crypto_deposit",
      },
    });

    if (existingLedger) {
      continue;
    }

    const tokensToCredit = deposit.amountUsdt * TOKENS_PER_USD;

    await appendLedgerEntry({
      userId: deposit.userId,
      type: "credit",
      amountTokens: tokensToCredit,
      source: "crypto_deposit",
      txHash: deposit.txHash,
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
