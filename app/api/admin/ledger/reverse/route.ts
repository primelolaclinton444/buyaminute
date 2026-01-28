import { prisma } from "@/lib/prisma";
import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { appendLedgerEntryWithClient } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/ledger/reverse
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body:
 * {
 *   ledgerEntryId?: string,
 *   idempotencyKey: string,
 *   reason?: string,
 *   amount?: number,
 *   userId?: string,
 *   direction?: "credit" | "debit"
 * }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const {
    ledgerEntryId,
    idempotencyKey,
    amount,
    userId,
    direction,
  } = body ?? {};

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return jsonError("Missing idempotencyKey", 400, "invalid_payload");
  }

  const existing = await prisma.ledgerEntry.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return Response.json({ ok: true, ledgerEntry: existing });
  }

  let targetUserId = userId as string | undefined;
  let amountTokens = amount as number | undefined;
  let type = direction as "credit" | "debit" | undefined;
  let callId: string | null | undefined = undefined;

  if (ledgerEntryId) {
    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: ledgerEntryId },
    });
    if (!entry) {
      return jsonError("Ledger entry not found", 404, "not_found");
    }
    targetUserId = entry.userId;
    amountTokens = typeof amount === "number" ? amount : entry.amountTokens;
    type = entry.type === "credit" ? "debit" : "credit";
    callId = entry.callId;
  }

  if (!targetUserId || typeof amountTokens !== "number" || amountTokens <= 0) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (type !== "credit" && type !== "debit") {
    return jsonError("Invalid direction", 400, "invalid_payload");
  }

  const created = await prisma.$transaction(async (tx) => {
    await appendLedgerEntryWithClient(tx, {
      userId: targetUserId,
      type,
      amountTokens,
      source: "admin_adjustment",
      idempotencyKey,
      callId: callId ?? undefined,
    });

    return tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
  });

  return Response.json({ ok: true, ledgerEntry: created });
}
