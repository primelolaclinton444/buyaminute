import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { hasErrors, parseBody } from "@/lib/api/validation";
import { getWalletBalanceFromLedger, getWalletBalanceFromLedgerWithClient } from "@/lib/ledger";
import { MIN_WITHDRAWAL_TOKENS, TOKEN_UNIT_USD } from "@/lib/constants";
import { isPayoutsDisabled } from "@/lib/platformSettings";
import { Prisma } from "@prisma/client";

type WithdrawPayload = {
  amount: number;
};

const TRON_ADDRESS_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

function validateWithdrawPayload(payload: unknown) {
  const errors: Record<string, string> = {};
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, errors: { body: "Request body is required." } };
  }
  const data = payload as Record<string, unknown>;
  if (typeof data.amount !== "number" || !Number.isFinite(data.amount)) {
    errors.amount = "amount must be a number.";
  } else if (!Number.isInteger(data.amount) || data.amount <= 0) {
    errors.amount = "amount must be a positive integer.";
  }
  if (hasErrors(errors)) {
    return { ok: false as const, errors };
  }
  return { ok: true as const, data: { amount: data.amount as number } };
}

function mapLedgerToTransaction(entry: {
  id: string;
  type: string;
  source: string;
  amountTokens: number;
  createdAt: Date;
  withdrawalRequest?: { status: string | null } | null;
}) {
  let type: "deposit" | "withdrawal" | "earning" = "earning";
  if (entry.source === "crypto_deposit") {
    type = "deposit";
  } else if (entry.type === "debit") {
    type = "withdrawal";
  }

  const status =
    entry.withdrawalRequest?.status === "pending"
      ? "pending"
      : entry.withdrawalRequest?.status === "failed"
      ? "failed"
      : "completed";

  return {
    id: entry.id,
    type,
    amount: entry.amountTokens,
    status,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const balanceTokens = await getWalletBalanceFromLedger(auth.user.id);

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: { userId: auth.user.id },
    include: { withdrawalRequest: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId: auth.user.id, status: "pending" },
    include: { ledgerEntries: { select: { id: true } } },
  });

  const transactions = [
    ...ledgerEntries.map(mapLedgerToTransaction),
    ...pendingWithdrawals
      .filter((withdrawal) => withdrawal.ledgerEntries.length === 0)
      .map((withdrawal) => ({
        id: withdrawal.id,
        type: "withdrawal" as const,
        amount: withdrawal.amountTokens,
        status: "pending" as const,
        createdAt: withdrawal.createdAt.toISOString(),
      })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return Response.json({
    balanceTokens,
    availableUsd: Number((balanceTokens * TOKEN_UNIT_USD).toFixed(2)),
    transactions,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  if (await isPayoutsDisabled()) {
    return jsonError("Payouts are disabled", 403, "payouts_disabled");
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { isFrozen: true },
  });
  if (user?.isFrozen) {
    return jsonError("User is frozen", 403, "user_frozen");
  }

  const parsed = await parseBody<WithdrawPayload>(request, validateWithdrawPayload);
  if (parsed.ok === false) {
    return jsonError("Invalid withdrawal payload", 400, "invalid_payload", parsed.errors);
  }

  const amountTokens = parsed.data.amount;
  if (amountTokens < MIN_WITHDRAWAL_TOKENS) {
    return jsonError(
      `Minimum withdrawal is ${MIN_WITHDRAWAL_TOKENS} tokens.`,
      400,
      "withdrawal_minimum"
    );
  }

  const balanceTokens = await getWalletBalanceFromLedger(auth.user.id);
  if (balanceTokens < amountTokens) {
    return jsonError("Insufficient balance", 400, "insufficient_balance");
  }

  const destination = await prisma.depositAddress.findUnique({
    where: { userId: auth.user.id },
  });

  if (!destination) {
    return jsonError("Withdrawal address not on file", 400, "missing_withdrawal_address");
  }
  if (!TRON_ADDRESS_REGEX.test(destination.tronAddress)) {
    return jsonError("Invalid TRC20 address", 400, "invalid_address");
  }

  const rawKey =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key") ??
    null;

  if (rawKey) {
    const existing = await prisma.withdrawalRequest.findUnique({
      where: { idempotencyKey: rawKey },
    });
    if (existing) {
      return Response.json({ success: true });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { availableTokens } = await getWalletBalanceFromLedgerWithClient(
        tx,
        auth.user.id
      );

      if (availableTokens < amountTokens) {
        throw new Error("insufficient_balance");
      }

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId: auth.user.id,
          amountTokens,
          destinationTronAddress: destination.tronAddress,
          idempotencyKey: rawKey ?? undefined,
        },
      });

      await tx.wallet.upsert({
        where: { userId: auth.user.id },
        create: {
          userId: auth.user.id,
          balanceTokens: 0,
          lockedTokens: withdrawal.amountTokens,
        },
        update: {
          lockedTokens: { increment: withdrawal.amountTokens },
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ success: true });
    }
    if (err instanceof Error && err.message === "insufficient_balance") {
      return jsonError("Insufficient balance", 400, "insufficient_balance");
    }
    throw err;
  }

  return Response.json({ success: true });
}
