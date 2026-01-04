// ================================
// BuyAMinute — Ledger Logic
// Phase 1
// ================================

import { PrismaClient, LedgerType, LedgerSource } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Append a ledger entry.
 * This function is the ONLY way money moves.
 */
export async function appendLedgerEntry(params: {
  userId: string;
  type: LedgerType;
  amountTokens: number;
  source: LedgerSource;
  callId?: string;
  txHash?: string;
}) {
  if (params.amountTokens <= 0) {
    throw new Error("amountTokens must be > 0");
  }

  return prisma.$transaction(async (tx) => {
    // Create ledger entry (append-only)
    await tx.ledgerEntry.create({
      data: {
        userId: params.userId,
        type: params.type,
        amountTokens: params.amountTokens,
        source: params.source,
        callId: params.callId,
        txHash: params.txHash,
      },
    });

    // Update wallet cache
    const delta =
      params.type === "credit"
        ? params.amountTokens
        : -params.amountTokens;

    await tx.wallet.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        balanceTokens: delta,
      },
      update: {
        balanceTokens: {
          increment: delta,
        },
      },
    });
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
