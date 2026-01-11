// ================================
// BuyAMinute — Public Profile (Viral Layer)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /profile/public?userId=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return jsonError("Missing userId", 400, "invalid_payload");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return jsonError("User not found", 404, "not_found");
  }

  const response: {
    ok: boolean;
    userId: string;
    earningsVisible: boolean;
    totalEarningsTokens?: number;
    minutesSold?: number;
  } = {
    ok: true,
    userId,
    earningsVisible: user.earningsVisible,
  };

  if (!user.earningsVisible) {
    return Response.json(response);
  }

  const credits = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      type: "credit",
      source: "call_billing",
    },
    include: {
      call: true,
    },
  });

  let totalEarningsTokens = 0;
  let totalSeconds = 0;

  for (const entry of credits) {
    totalEarningsTokens += entry.amountTokens;

    const rate = entry.call?.ratePerSecondTokens;
    if (rate && rate > 0) {
      totalSeconds += Math.floor(entry.amountTokens / rate);
    }
  }

  response.totalEarningsTokens = totalEarningsTokens;
  response.minutesSold = Number((totalSeconds / 60).toFixed(2));

  return Response.json(response);
}
