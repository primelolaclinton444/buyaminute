// ================================
// BuyAMinute — Withdrawal Processor
// Phase 3 (Manual)
// ================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Mark a withdrawal as sent after USDT-TRC20
 * has been manually transferred on-chain.
 *
 * This script does NOT send crypto.
 */
export async function markWithdrawalAsSent(params: {
  withdrawalId: string;
  txHash: string;
}) {
  const { withdrawalId, txHash } = params;

  if (!withdrawalId || !txHash) {
    throw new Error("withdrawalId and txHash are required");
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error("Withdrawal not found");
  }

  if (withdrawal.status !== "pending") {
    throw new Error("Withdrawal is not pending");
  }

  await prisma.withdrawalRequest.update({
    where: { id: withdrawalId },
    data: {
      status: "sent",
      txHash,
      processedAt: new Date(),
    },
  });
}
