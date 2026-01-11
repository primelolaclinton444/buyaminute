// ================================
// BuyAMinute — Receiver Profile Upsert API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";
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
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { userId, ratePerSecondTokens, isAvailable, isVideoEnabled } = body;

  if (
    !userId ||
    ratePerSecondTokens === undefined ||
    isAvailable === undefined ||
    isVideoEnabled === undefined
  ) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (
    typeof ratePerSecondTokens !== "number" ||
    !Number.isInteger(ratePerSecondTokens) ||
    ratePerSecondTokens <= 0
  ) {
    return jsonError("Invalid ratePerSecondTokens", 400, "invalid_rate");
  }

  if (typeof isAvailable !== "boolean") {
    return jsonError("Invalid isAvailable", 400, "invalid_payload");
  }

  if (typeof isVideoEnabled !== "boolean") {
    return jsonError("Invalid isVideoEnabled", 400, "invalid_payload");
  }

  if (ratePerSecondTokens < MIN_RATE_PER_SECOND_TOKENS) {
    return jsonError("Rate below minimum", 400, "invalid_rate");
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
      return jsonError("Rate change cooldown active", 429, "rate_change_cooldown");
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
