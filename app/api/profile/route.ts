import { prisma } from "@/lib/prisma";
import { SECONDS_IN_MINUTE, TOKEN_UNIT_USD } from "@/lib/constants";
import { CallStatus } from "@/lib/domain";
import { jsonError } from "@/lib/api/errors";
import { dlog } from "@/lib/debug";

const BUSY_STATUSES: CallStatus[] = ["ringing", "connected"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return jsonError("Missing username", 400, "invalid_payload");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: { equals: username, mode: "insensitive" } },
        { email: { equals: username, mode: "insensitive" } },
        { name: { equals: username, mode: "insensitive" } },
      ],
    },
    include: { receiverProfile: true },
  });

  dlog("[handle] lookup", { handle: username, matchedUserId: user?.id ?? null });

  if (!user || !user.receiverProfile) {
    return jsonError("Profile not found", 404, "not_found");
  }

  const activeCall = await prisma.call.findFirst({
    where: {
      receiverId: user.id,
      status: { in: BUSY_STATUSES },
    },
    select: { id: true },
  });

  const name = user.name ?? user.email ?? user.id;
  const rate =
    user.receiverProfile.ratePerSecondTokens * SECONDS_IN_MINUTE * TOKEN_UNIT_USD;
  const status = user.receiverProfile.isAvailable
    ? activeCall
      ? "busy"
      : "available"
    : "offline";

  return Response.json({
    profile: {
      id: user.id,
      name,
      username: name,
      rate,
      videoAllowed: user.receiverProfile.isVideoEnabled,
      tagline: user.receiverProfile.isAvailable
        ? "Available for new calls."
        : "Currently unavailable.",
      categories: [] as string[],
      status,
      bio: "",
      responseTime: "",
      languages: [] as string[],
      reviews: [] as Array<{
        id: string;
        author: string;
        rating: number;
        quote: string;
      }>,
    },
  });
}
