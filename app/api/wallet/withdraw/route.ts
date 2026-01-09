// ================================
// BuyAMinute — Withdrawal Request API (Secured)
// Phase 3
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { appendLedgerEntry, getWalletBalance } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a withdrawal request.
 * Tokens are locked immediately via ledger debit.
 * No crypto is sent here.
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { userId, amountTokens, destinationTronAddress } = body;

  if (!userId || amountTokens === undefined || !destinationTronAddress) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (
    typeof amountTokens !== "number" ||
    !Number.isInteger(amountTokens) ||
    amountTokens <= 0
  ) {
    return new Response("Invalid withdrawal amount", { status: 400 });
  }

  const balance = await getWalletBalance(userId);
  if (balance < amountTokens) {
    return new Response("Insufficient balance", { status: 400 });
  }

  // Create withdrawal request
  const withdrawal = await prisma.withdrawalRequest.create({
    data: {
      userId,
      amountTokens,
      destinationTronAddress,
    },
  });

  // Lock tokens immediately (ledger debit)
  await appendLedgerEntry({
    userId,
    type: "debit",
    amountTokens,
    source: "withdrawal",
    withdrawalRequestId: withdrawal.id,
    idempotencyKey: `withdrawal:${withdrawal.id}:debit:${userId}`,
  });

  return Response.json({
    ok: true,
    withdrawalId: withdrawal.id,
  });
}
