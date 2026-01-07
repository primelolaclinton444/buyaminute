// ================================
// BuyAMinute — Receiver Profile Upsert API
// Phase 7
// ================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
/**
 * POST /receiver/profile/upsert
 * Body:
 * {
 *   userId: string,
 *   ratePerSecondTokens: number,
 *   isAvailable: boolean
 * }
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { userId, ratePerSecondTokens, isAvailable } = body;

  if (!userId || ratePerSecondTokens === undefined || isAvailable === undefined) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (typeof ratePerSecondTokens !== "number" || ratePerSecondTokens <= 0) {
    return new Response("Invalid ratePerSecondTokens", { status: 400 });
  }

  if (typeof isAvailable !== "boolean") {
    return new Response("Invalid isAvailable", { status: 400 });
  }

  const profile = await prisma.receiverProfile.upsert({
    where: { userId },
    create: { userId, ratePerSecondTokens, isAvailable },
    update: { ratePerSecondTokens, isAvailable },
  });

  return Response.json({ ok: true, profile });
}
