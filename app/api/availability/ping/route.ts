// ================================
// BuyAMinute — Availability Ping API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { appendLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { AVAILABILITY_PING_FEE_TOKENS } from "@/lib/constants";
import { AvailabilityQuestion } from "@prisma/client";
import { randomUUID } from "crypto";

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

  const balance = await getWalletBalance(callerId);
  if (balance < AVAILABILITY_PING_FEE_TOKENS) {
    return new Response("Insufficient balance", { status: 400 });
  }

  const pingId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.availabilityPing.create({
      data: {
        id: pingId,
        callerId,
        receiverId,
        question,
        feeTokens: AVAILABILITY_PING_FEE_TOKENS,
      },
    });

    await appendLedgerEntryWithClient(tx, {
      userId: callerId,
      type: "debit",
      amountTokens: AVAILABILITY_PING_FEE_TOKENS,
      source: "availability_ping",
      idempotencyKey: `ping:${pingId}:debit:${callerId}`,
    });
  });

  return Response.json({ ok: true, pingId });
}
