// ================================
// BuyAMinute — Withdrawal Processing API (Admin)
// Phase 3
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /admin/withdrawals/process
 * Body:
 * {
 *   withdrawalId: string,
 *   txHash: string
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { withdrawalId, txHash } = body;

  if (!withdrawalId || !txHash) {
    return new Response("Invalid payload", { status: 400 });
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    return new Response("Withdrawal not found", { status: 404 });
  }

  if (withdrawal.status !== "pending") {
    return Response.json({ ok: true, status: withdrawal.status });
  }

  const updated = await prisma.withdrawalRequest.update({
    where: { id: withdrawalId },
    data: {
      status: "sent",
      txHash,
      processedAt: new Date(),
    },
  });

  return Response.json({ ok: true, withdrawal: updated });
}
