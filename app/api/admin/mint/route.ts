import { prisma } from "@/lib/prisma";
import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { appendLedgerEntryWithClient } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/mint
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body:
 * {
 *   userId?: string,
 *   email?: string,
 *   amountTokens: number,
 *   note?: string
 * }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { userId, email, amountTokens, note } = body ?? {};

  if ((!userId && !email) || typeof amountTokens !== "number" || !Number.isInteger(amountTokens) || amountTokens <= 0) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { email: String(email) },
    select: { id: true, email: true },
  });

  if (!user) return jsonError("User not found", 404, "not_found");

  const idempotencyKey =
    `admin_mint:${user.id}:${crypto.randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    await appendLedgerEntryWithClient(tx, {
      userId: user.id,
      type: "credit",
      amountTokens,
      source: "admin_mint",
      idempotencyKey,
    });
  });

  return Response.json({ ok: true, userId: user.id, email: user.email, amountTokens, note: note ?? null });
}
