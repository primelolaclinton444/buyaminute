// ================================
// BuyAMinute — Availability Ping API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { appendLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { AVAILABILITY_PING_FEE_TOKENS } from "@/lib/constants";
import { AvailabilityQuestion } from "@/lib/domain";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /availability/ping
 * Body:
 * {
 *   callerId: string,
 *   receiverId: string,
 *   question: "available_now" | "available_later" | "when_good_time"
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { callerId, receiverId, question } = body;

  if (!callerId || !receiverId || !question) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (!Object.values(AvailabilityQuestion).includes(question)) {
    return new Response("Invalid question", { status: 400 });
  }

  const feeTokens = AVAILABILITY_PING_FEE_TOKENS;
  const idempotencyKey = req.headers.get("idempotency-key")?.trim();

  if (feeTokens > 0 && !idempotencyKey) {
    return new Response("Idempotency key required", { status: 400 });
  }

  const balance = await getWalletBalance(callerId);
  if (balance < feeTokens) {
    return new Response("Insufficient balance", { status: 400 });
  }

  const effectiveKey = idempotencyKey ?? randomUUID();
  const pingId = createHash("sha256")
    .update(`${callerId}:${effectiveKey}`)
    .digest("hex");
  const pingIdWithPrefix = `ping_${pingId}`;
  const ledgerKey = `availability_ping:${callerId}:${effectiveKey}`;

  const existingPing = await prisma.availabilityPing.findUnique({
    where: { id: pingIdWithPrefix },
  });
  if (existingPing) {
    return Response.json({ ok: true, pingId: existingPing.id });
  }

  await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: ledgerKey },
    });
    const shouldAppendLedger = feeTokens > 0 && !ledgerEntry;

    if (ledgerEntry) {
      const ping = await tx.availabilityPing.findUnique({
        where: { id: pingIdWithPrefix },
      });
      if (ping) {
        return;
      }
    }

    await tx.availabilityPing.create({
      data: {
        id: pingIdWithPrefix,
        callerId,
        receiverId,
        question,
        feeTokens,
        status: "sent",
      },
    });

    if (shouldAppendLedger) {
      await appendLedgerEntryWithClient(tx, {
        userId: callerId,
        type: "debit",
        amountTokens: feeTokens,
        source: "availability_ping",
        idempotencyKey: ledgerKey,
      });
    }
  });

  return Response.json({ ok: true, pingId: pingIdWithPrefix });
}

/**
 * GET /availability/ping?receiverId=...&limit=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const receiverId = searchParams.get("receiverId");
  const limitParam = searchParams.get("limit");

  if (!receiverId) {
    return new Response("receiverId required", { status: 400 });
  }

  const parsedLimit = Number(limitParam ?? 5);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(20, parsedLimit))
    : 5;

  const pings = await prisma.availabilityPing.findMany({
    where: { receiverId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({ ok: true, pings });
}
