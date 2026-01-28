import { prisma } from "@/lib/prisma";
import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/freeze
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body: { userId: string, freeze: boolean, reason?: string }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { userId, freeze, reason } = body ?? {};

  if (!userId || typeof freeze !== "boolean") {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return jsonError("User not found", 404, "not_found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: freeze
      ? {
          isFrozen: true,
          frozenReason: typeof reason === "string" ? reason : null,
          frozenAt: new Date(),
        }
      : {
          isFrozen: false,
          frozenReason: null,
          frozenAt: null,
        },
    select: { id: true, isFrozen: true, frozenReason: true, frozenAt: true },
  });

  return Response.json({ ok: true, user: updated });
}
