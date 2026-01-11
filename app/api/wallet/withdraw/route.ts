// ================================
// BuyAMinute — Withdrawal Request API (Secured)
// Phase 3
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { getWalletBalanceFromLedgerWithClient } from "@/lib/ledger";
import { MIN_WITHDRAWAL_TOKENS } from "@/lib/constants";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRON_ADDRESS_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * Create a withdrawal request.
 * Tokens are locked immediately on the wallet.
 * Ledger debit happens during processing.
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
    const existing = await prisma.withdrawalRequest.findUnique({
      where: { idempotencyKey: rawKey },
    });
    if (existing) {
      return Response.json({ ok: true, withdrawalId: existing.id });
    }
  }

  let withdrawalId: string;
  try {
    const withdrawal = await prisma.$transaction(async (tx) => {
      const { availableTokens } = await getWalletBalanceFromLedgerWithClient(
        tx,
        resolvedUserId
      );

      if (availableTokens < resolvedAmount) {
        throw new Error("insufficient_balance");
      }

      const created = await tx.withdrawalRequest.create({
        data: {
          userId: resolvedUserId,
          amountTokens: resolvedAmount,
          destinationTronAddress: destination,
          idempotencyKey: rawKey ?? undefined,
        },
      });

      await tx.wallet.upsert({
        where: { userId: resolvedUserId },
        create: {
          userId: resolvedUserId,
          balanceTokens: 0,
          lockedTokens: resolvedAmount,
        },
        update: {
          lockedTokens: { increment: resolvedAmount },
        },
      });

      return created;
    });

    withdrawalId = withdrawal.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      if (rawKey) {
        const existing = await prisma.withdrawalRequest.findUnique({
          where: { idempotencyKey: rawKey },
        });
        if (existing) {
          return Response.json({ ok: true, withdrawalId: existing.id });
        }
      }
    }
    if (err instanceof Error && err.message === "insufficient_balance") {
      return jsonError("Insufficient balance", 400, "insufficient_balance");
    }
    throw err;
  }

  return Response.json({
    ok: true,
    withdrawalId,
  });
}
