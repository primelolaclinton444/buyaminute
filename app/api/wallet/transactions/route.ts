// ================================
// BuyAMinute — Wallet Transactions API (Secured)
// Phase 9
// ================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { TOKENS_PER_USD, USDT_ATOMIC_MULTIPLIER } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WalletTransactionType =
  | "deposit"
  | "hold"
  | "release"
  | "call_settlement"
  | "withdrawal_request"
  | "withdrawal_paid";

type WalletTransactionStatus = "pending" | "completed" | "failed";

const TRANSACTION_TYPES = new Set<WalletTransactionType>([
  "deposit",
  "hold",
  "release",
  "call_settlement",
  "withdrawal_request",
  "withdrawal_paid",
]);

const PAGE_SIZE = 20;

function tokensFromUsdtAtomic(amountUsdtAtomic: number) {
  return Math.floor((amountUsdtAtomic * TOKENS_PER_USD) / USDT_ATOMIC_MULTIPLIER);
}

function mapLedgerEntry(entry: {
  id: string;
  type: string;
  source: string;
  amountTokens: number;
  createdAt: Date;
}): {
  id: string;
  type: WalletTransactionType;
  amountTokens: number;
  status: WalletTransactionStatus;
  createdAt: string;
} {
  if (entry.source === "crypto_deposit") {
    return {
      id: entry.id,
      type: "deposit",
      amountTokens: entry.amountTokens,
      status: "completed",
      createdAt: entry.createdAt.toISOString(),
    };
  }

  if (entry.source === "withdrawal") {
    return {
      id: entry.id,
      type: "withdrawal_paid",
      amountTokens: entry.amountTokens,
      status: "completed",
      createdAt: entry.createdAt.toISOString(),
    };
  }

  return {
    id: entry.id,
    type: "call_settlement",
    amountTokens: entry.amountTokens,
    status: "completed",
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const cursorParam = url.searchParams.get("cursor");
  const typeParam = url.searchParams.get("type");

  if (typeParam && !TRANSACTION_TYPES.has(typeParam as WalletTransactionType)) {
    return jsonError("Invalid transaction type", 400, "invalid_type");
  }

  let cursorDate: Date | null = null;
  if (cursorParam) {
    const parsed = new Date(cursorParam);
    if (Number.isNaN(parsed.getTime())) {
      return jsonError("Invalid cursor", 400, "invalid_cursor");
    }
    cursorDate = parsed;
  }

  const dateFilter = cursorDate ? { lt: cursorDate } : undefined;

  const [ledgerEntries, withdrawalRequests, pendingDeposits] =
    await prisma.$transaction([
      prisma.ledgerEntry.findMany({
        where: {
          userId: auth.user.id,
          createdAt: dateFilter,
        },
        select: {
          id: true,
          type: true,
          source: true,
          amountTokens: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
      prisma.withdrawalRequest.findMany({
        where: {
          userId: auth.user.id,
          status: { in: ["pending", "failed"] },
          createdAt: dateFilter,
        },
        select: {
          id: true,
          status: true,
          amountTokens: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
      prisma.cryptoDeposit.findMany({
        where: {
          userId: auth.user.id,
          credited: false,
          createdAt: dateFilter,
        },
        select: {
          id: true,
          amountUsdtAtomic: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
    ]);

  const ledgerTransactions = ledgerEntries.map(mapLedgerEntry);
  const withdrawalTransactions = withdrawalRequests.map((request) => ({
    id: request.id,
    type: "withdrawal_request" as const,
    amountTokens: request.amountTokens,
    status: request.status === "failed" ? ("failed" as const) : ("pending" as const),
    createdAt: request.createdAt.toISOString(),
  }));

  const depositTransactions = pendingDeposits.map((deposit) => ({
    id: deposit.id,
    type: "deposit" as const,
    amountTokens: tokensFromUsdtAtomic(deposit.amountUsdtAtomic),
    status: "pending" as const,
    createdAt: deposit.createdAt.toISOString(),
  }));

  const combined = [...ledgerTransactions, ...withdrawalTransactions, ...depositTransactions]
    .filter((transaction) => (typeParam ? transaction.type === typeParam : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, PAGE_SIZE);

  const nextCursor =
    combined.length === PAGE_SIZE ? combined[combined.length - 1]?.createdAt ?? null : null;

  return Response.json({
    transactions: combined,
    nextCursor,
  });
}
