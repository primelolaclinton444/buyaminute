import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Presence ping failed";
    return jsonError(message, 500, "presence_ping_failed");
  }

  return Response.json({ ok: true });
}
