import { prisma } from "@/lib/prisma";
import { SECONDS_IN_MINUTE, TOKEN_UNIT_USD } from "@/lib/constants";

const BUSY_STATUSES = ["ringing", "connected"] as const;

export async function GET() {
  const receiverProfiles = await prisma.receiverProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
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

  const profiles = receiverProfiles.map((profile) => {
    const name = profile.user.name ?? profile.user.email ?? profile.user.id;
    const rate = profile.ratePerSecondTokens * SECONDS_IN_MINUTE * TOKEN_UNIT_USD;
    const status = profile.isAvailable
      ? busyReceivers.has(profile.userId)
        ? "busy"
        : "available"
      : "offline";

    return {
      id: profile.userId,
      name,
      username: name,
      rate,
      tagline: profile.isAvailable ? "Available for new calls." : "Currently unavailable.",
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
