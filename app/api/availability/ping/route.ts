// ================================
// BuyAMinute — Availability Ping API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { appendLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { AVAILABILITY_PING_FEE_TOKENS } from "@/lib/constants";
import { AvailabilityQuestion } from "@/lib/domain";
import { jsonError } from "@/lib/api/errors";
import { createNotification } from "@/lib/notifications";
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
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callerId, receiverId, question } = body;

  if (!callerId || !receiverId || !question) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (!Object.values(AvailabilityQuestion).includes(question)) {
    return jsonError("Invalid question", 400, "invalid_question");
  }

  const feeTokens = AVAILABILITY_PING_FEE_TOKENS;
  const idempotencyKey = req.headers.get("idempotency-key")?.trim();

  if (feeTokens > 0 && !idempotencyKey) {
    return jsonError("Idempotency key required", 400, "idempotency_key_required");
  }

  const balance = await getWalletBalance(callerId);
  if (balance < feeTokens) {
    return jsonError("Insufficient balance", 400, "insufficient_balance");
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

  await createNotification({
    userId: receiverId,
    type: "availability_ping",
    data: { pingId: pingIdWithPrefix, callerId, question },
    idempotencyKey: `ping:${pingIdWithPrefix}:created:${receiverId}`,
  });

  return Response.json({ ok: true, pingId: pingIdWithPrefix });
}

/**
 * GET /availability/ping?receiverId=...&limit=...
 */
export async function GET(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const { searchParams } = new URL(req.url);
  const receiverId = searchParams.get("receiverId");
  const limitParam = searchParams.get("limit");

  if (!receiverId) {
    return jsonError("receiverId required", 400, "invalid_payload");
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
