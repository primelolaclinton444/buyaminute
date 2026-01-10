// ================================
// BuyAMinute — Withdrawal Request API (Secured)
// Phase 3
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { appendLedgerEntry, getWalletBalanceFromLedger } from "@/lib/ledger";
import { MIN_WITHDRAWAL_TOKENS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRON_ADDRESS_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * Create a withdrawal request.
 * Tokens are locked immediately via ledger debit.
 * No crypto is sent here.
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  const session = gate.ok ? null : await requireAuth();
  if (!gate.ok && !session.ok) return session.response;

  const body = await req.json();
  const { userId, amountTokens, amount, destinationTronAddress } = body ?? {};

  const resolvedUserId = gate.ok ? userId : session.user.id;
  const resolvedAmount = amountTokens ?? amount;

  if (!resolvedUserId || resolvedAmount === undefined) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (
    typeof resolvedAmount !== "number" ||
    !Number.isInteger(resolvedAmount) ||
    resolvedAmount <= 0
  ) {
    return jsonError("Invalid withdrawal amount", 400, "invalid_amount");
  }

  if (resolvedAmount < MIN_WITHDRAWAL_TOKENS) {
    return jsonError(
      `Minimum withdrawal is ${MIN_WITHDRAWAL_TOKENS} tokens.`,
      400,
      "withdrawal_minimum"
    );
  }

  const balance = await getWalletBalanceFromLedger(resolvedUserId);
  if (balance < resolvedAmount) {
    return jsonError("Insufficient balance", 400, "insufficient_balance");
  }

  const destination =
    typeof destinationTronAddress === "string" && destinationTronAddress.length > 0
      ? destinationTronAddress
      : (
          await prisma.depositAddress.findUnique({
            where: { userId: resolvedUserId },
          })
        )?.tronAddress;

  if (!destination) {
    return jsonError("Withdrawal address not on file", 400, "missing_withdrawal_address");
  }
  if (!TRON_ADDRESS_REGEX.test(destination)) {
    return jsonError("Invalid TRC20 address", 400, "invalid_address");
  }

  const rawKey =
    req.headers.get("idempotency-key") ?? req.headers.get("x-idempotency-key") ?? null;

  if (rawKey) {
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: rawKey },
    });
    if (existing?.withdrawalRequestId) {
      return Response.json({ ok: true, withdrawalId: existing.withdrawalRequestId });
    }
  }

  // Create withdrawal request
  const withdrawal = await prisma.withdrawalRequest.create({
    data: {
      userId: resolvedUserId,
      amountTokens: resolvedAmount,
      destinationTronAddress: destination,
    },
  });

  // Lock tokens immediately (ledger debit)
  await appendLedgerEntry({
    userId: resolvedUserId,
    type: "debit",
    amountTokens: resolvedAmount,
    source: "withdrawal",
    withdrawalRequestId: withdrawal.id,
    idempotencyKey: rawKey ?? `withdrawal:${withdrawal.id}:debit:${resolvedUserId}`,
  });

  return Response.json({
    ok: true,
    withdrawalId: withdrawal.id,
  });
}
