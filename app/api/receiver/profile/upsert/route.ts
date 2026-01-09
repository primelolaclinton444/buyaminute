// ================================
// BuyAMinute — Receiver Profile Upsert API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { MIN_RATE_PER_SECOND_TOKENS, RATE_CHANGE_COOLDOWN_HOURS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /receiver/profile/upsert
 * Body:
 * {
 *   userId: string,
 *   ratePerSecondTokens: number,
 *   isAvailable: boolean,
 *   isVideoEnabled: boolean
 * }
 */
export async function POST(req: Request) {
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return new Response(gate.msg, { status: gate.status });

  const body = await req.json();
  const { userId, ratePerSecondTokens, isAvailable, isVideoEnabled } = body;

  if (
    !userId ||
    ratePerSecondTokens === undefined ||
    isAvailable === undefined ||
    isVideoEnabled === undefined
  ) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (
    typeof ratePerSecondTokens !== "number" ||
    !Number.isInteger(ratePerSecondTokens) ||
    ratePerSecondTokens <= 0
  ) {
    return new Response("Invalid ratePerSecondTokens", { status: 400 });
  }

  if (typeof isAvailable !== "boolean") {
    return new Response("Invalid isAvailable", { status: 400 });
  }

  if (typeof isVideoEnabled !== "boolean") {
    return new Response("Invalid isVideoEnabled", { status: 400 });
  }

  if (ratePerSecondTokens < MIN_RATE_PER_SECOND_TOKENS) {
    return new Response("Rate below minimum", { status: 400 });
  }

  const existing = await prisma.receiverProfile.findUnique({
    where: { userId },
  });

  const now = new Date();
  const rateChanged =
    existing && ratePerSecondTokens !== existing.ratePerSecondTokens;

  if (rateChanged && existing?.lastRateChangeAt) {
    const cooldownEnds = new Date(
      existing.lastRateChangeAt.getTime() + RATE_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000
    );
    if (now < cooldownEnds) {
      return new Response("Rate change cooldown active", { status: 429 });
    }
  }

  const profile = await prisma.receiverProfile.upsert({
    where: { userId },
    create: {
      userId,
      ratePerSecondTokens,
      isAvailable,
      isVideoEnabled,
      lastRateChangeAt: now,
    },
    update: {
      ratePerSecondTokens,
      isAvailable,
      isVideoEnabled,
      lastRateChangeAt: rateChanged ? now : existing?.lastRateChangeAt ?? null,
    },
  });

  return Response.json({ ok: true, profile });
}
