// ================================
// BuyAMinute — Receiver Profile Get API
// Phase 7
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
/**
 * GET /receiver/profile/get?userId=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const profile = await prisma.receiverProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  return Response.json({ ok: true, profile });
}
