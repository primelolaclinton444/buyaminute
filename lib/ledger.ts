// ================================
// BuyAMinute — Ledger Logic
// Phase 1
// ================================

import { LedgerType, LedgerSource } from "@/lib/domain";
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
      lockedTokens: 0,
    },
    update: {
      balanceTokens: { increment: delta },
    },
  });
}

export async function ensureLedgerEntryWithClient(
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
    return;
  }

  const existing = await tx.ledgerEntry.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });

  if (existing) {
    return;
  }

  await appendLedgerEntryWithClient(tx, params);
}

/**
 * Read wallet balance (cached).
 * Ledger remains source of truth.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  const balance = wallet?.balanceTokens ?? 0;
  const locked = wallet?.lockedTokens ?? 0;
  return Math.max(0, balance - locked);
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

  const balance = (credits._sum.amountTokens ?? 0) - (debits._sum.amountTokens ?? 0);
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { lockedTokens: true },
  });
  const locked = wallet?.lockedTokens ?? 0;
  return Math.max(0, balance - locked);
}

export async function getWalletBalanceFromLedgerWithClient(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<{ balanceTokens: number; lockedTokens: number; availableTokens: number }> {
  const credits = await tx.ledgerEntry.aggregate({
    where: { userId, type: "credit" },
    _sum: { amountTokens: true },
  });

  const debits = await tx.ledgerEntry.aggregate({
    where: { userId, type: "debit" },
    _sum: { amountTokens: true },
  });

  const wallet = await tx.wallet.findUnique({
    where: { userId },
    select: { lockedTokens: true },
  });

  const balanceTokens =
    (credits._sum.amountTokens ?? 0) - (debits._sum.amountTokens ?? 0);
  const lockedTokens = wallet?.lockedTokens ?? 0;
  const availableTokens = Math.max(0, balanceTokens - lockedTokens);

  return { balanceTokens, lockedTokens, availableTokens };
}
