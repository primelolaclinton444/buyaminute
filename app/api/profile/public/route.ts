// ================================
// BuyAMinute — Public Profile (Viral Layer)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { dlog } from "@/lib/debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /profile/public?userId=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim();
  const username = searchParams.get("username")?.trim();

  if (!userId && !username) {
    return jsonError("Missing userId or username", 400, "invalid_payload");
  }

  let user = null;

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
    });
  }

  if (!user && username) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: { equals: username, mode: "insensitive" } },
          { email: { equals: username, mode: "insensitive" } },
          { name: { equals: username, mode: "insensitive" } },
        ],
      },
    });
  }

  if (username) {
    dlog("[handle] lookup public", {
      handle: username,
      matchedUserId: user?.id ?? null,
    });
  }

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
    userId: user.id,
    earningsVisible: user.earningsVisible,
  };

  if (!user.earningsVisible) {
    return Response.json(response);
  }

  const credits = await prisma.ledgerEntry.findMany({
    where: {
      userId: user.id,
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
