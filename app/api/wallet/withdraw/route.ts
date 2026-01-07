// ================================
// BuyAMinute — Withdrawal Request API
// Phase 3
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { appendLedgerEntry, getWalletBalance } from "../../../../lib/ledger";
/**
 * Create a withdrawal request.
 * Tokens are locked immediately via ledger debit.
 * No crypto is sent here.
 */
export async function POST(req: Request) {
  const body = await req.json();

  const { userId, amountTokens, destinationTronAddress } = body;

  if (!userId || !amountTokens || !destinationTronAddress) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (amountTokens <= 0) {
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
  });

  return Response.json({
    ok: true,
    withdrawalId: withdrawal.id,
  });
}
