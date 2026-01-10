// ================================
// BuyAMinute — Ledger Logic
// Phase 1
// ================================

import { LedgerType, LedgerSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Append a ledger entry.
 * This function is the ONLY way money moves.
 */
export async function appendLedgerEntry(params: {
  userId: string;
  type: LedgerType;
  amountTokens: number;
  source: LedgerSource;
  idempotencyKey: string;
  callId?: string;
  withdrawalRequestId?: string;
  txHash?: string;
}) {
  if (params.amountTokens <= 0) {
    throw new Error("amountTokens must be > 0");
  }

  return prisma.$transaction(async (tx) => {
    await appendLedgerEntryWithClient(tx, params);
  });
}

export async function appendLedgerEntryWithClient(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    type: LedgerType;
    amountTokens: number;
    source: LedgerSource;
    idempotencyKey: string;
    callId?: string;
    withdrawalRequestId?: string;
    txHash?: string;
  }
) {
  if (params.amountTokens <= 0) {
    throw new Error("amountTokens must be > 0");
  }

  // Create ledger entry (append-only)
  await tx.ledgerEntry.create({
    data: {
      userId: params.userId,
      type: params.type,
      amountTokens: params.amountTokens,
      source: params.source,
      callId: params.callId,
      withdrawalRequestId: params.withdrawalRequestId,
      txHash: params.txHash,
      idempotencyKey: params.idempotencyKey,
    },
  });

  // Update wallet cache
  const delta = params.type === "credit" ? params.amountTokens : -params.amountTokens;

  await tx.wallet.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      balanceTokens: delta,
    },
    update: {
      balanceTokens: { increment: delta },
    },
  });
}

/**
 * Read wallet balance (cached).
 * Ledger remains source of truth.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  return wallet?.balanceTokens ?? 0;
}

/**
 * Read wallet balance from ledger (source of truth).
 */
export async function getWalletBalanceFromLedger(userId: string): Promise<number> {
  const credits = await prisma.ledgerEntry.aggregate({
    where: { userId, type: "credit" },
    _sum: { amountTokens: true },
  });

  const debits = await prisma.ledgerEntry.aggregate({
    where: { userId, type: "debit" },
    _sum: { amountTokens: true },
  });

  return (credits._sum.amountTokens ?? 0) - (debits._sum.amountTokens ?? 0);
}
