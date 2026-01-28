// ================================
// BuyAMinute — Withdrawal Processing API (Admin)
// Phase 3
// ================================

import { prisma } from "@/lib/prisma";
import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { appendLedgerEntryWithClient } from "@/lib/ledger";
import { isPayoutsDisabled } from "@/lib/platformSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /admin/withdrawals/process
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body:
 * {
 *   withdrawalId: string,
 *   txHash: string
 * }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  if (await isPayoutsDisabled()) {
    return jsonError("Payouts are disabled", 403, "payouts_disabled");
  }

  const body = await req.json();
  const { withdrawalId, txHash } = body;

  if (!withdrawalId || !txHash) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    return jsonError("Withdrawal not found", 404, "not_found");
  }

  const user = await prisma.user.findUnique({
    where: { id: withdrawal.userId },
    select: { isFrozen: true },
  });
  if (user?.isFrozen) {
    return jsonError("User is frozen", 403, "user_frozen");
  }

  if (withdrawal.status !== "pending") {
    return Response.json({ ok: true, status: withdrawal.status });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: withdrawal.userId },
        select: { lockedTokens: true },
      });

      if ((wallet?.lockedTokens ?? 0) < withdrawal.amountTokens) {
        throw new Error("locked_balance_mismatch");
      }

      await appendLedgerEntryWithClient(tx, {
        userId: withdrawal.userId,
        type: "debit",
        amountTokens: withdrawal.amountTokens,
        source: "withdrawal",
        withdrawalRequestId: withdrawal.id,
        txHash,
        idempotencyKey: `withdrawal:${withdrawal.id}:debit:${withdrawal.userId}`,
      });

      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          lockedTokens: { decrement: withdrawal.amountTokens },
        },
      });

      return tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: "sent",
          txHash,
          processedAt: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "locked_balance_mismatch") {
      return jsonError("Locked balance mismatch", 409, "locked_balance_mismatch");
    }
    throw err;
  }

  return Response.json({ ok: true, withdrawal: updated });
}
