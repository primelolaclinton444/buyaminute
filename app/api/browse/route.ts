export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { SECONDS_IN_MINUTE, TOKEN_UNIT_USD } from "@/lib/constants";
import { CallStatus } from "@/lib/domain";

const BUSY_STATUSES: CallStatus[] = ["ringing", "connected"];

export async function GET() {
  const receiverProfiles = await prisma.receiverProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, lastSeenAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (receiverProfiles.length === 0) {
    return Response.json({ categories: ["All"], featured: [], profiles: [] });
  }

  const receiverIds = receiverProfiles.map((profile) => profile.userId);
  const activeCalls = await prisma.call.findMany({
    where: {
      receiverId: { in: receiverIds },
      status: { in: BUSY_STATUSES },
    },
    select: { receiverId: true },
  });
  const busyReceivers = new Set(activeCalls.map((call) => call.receiverId));

  const PRESENCE_WINDOW_MS = 5 * 60_000;
  const cutoff = Date.now() - PRESENCE_WINDOW_MS;
  const profiles = receiverProfiles.map((profile) => {
    const name = profile.user.name ?? profile.user.email ?? profile.user.id;
    const rate = profile.ratePerSecondTokens * SECONDS_IN_MINUTE * TOKEN_UNIT_USD;
    const isPresent =
      profile.user.lastSeenAt && profile.user.lastSeenAt.getTime() >= cutoff;
    const isEligible = profile.isAvailable && isPresent;
    const status = isEligible
      ? busyReceivers.has(profile.userId)
        ? "busy"
        : "available"
      : "offline";

    return {
      id: profile.userId,
      name,
      username: name,
      rate,
      tagline: isEligible ? "Available for new calls." : "Currently unavailable.",
      categories: [] as string[],
      status,
    };
  });

  const categories = [
    "All",
    ...Array.from(
      new Set(profiles.flatMap((profile) => profile.categories))
    ).sort(),
  ];

  return Response.json({
    categories,
    featured: profiles.slice(0, 2),
    profiles,
  });
}
