import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const existing = await prisma.depositAddress.findUnique({
    where: { userId: auth.user.id },
  });

  if (!existing) {
    return jsonError("Deposit address not found", 404, "deposit_address_missing");
  }

  return Response.json({
    userId: auth.user.id,
    tronAddress: existing.tronAddress,
  });
}
