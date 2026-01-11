import { prisma } from "@/lib/prisma";
import { SECONDS_IN_MINUTE, TOKEN_UNIT_USD } from "@/lib/constants";
import { CallStatus } from "@/lib/domain";

const BUSY_STATUSES: CallStatus[] = ["ringing", "connected"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return new Response("Missing username", { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: username }, { email: username }, { name: username }],
    },
    include: { receiverProfile: true },
  });

  if (!user || !user.receiverProfile) {
    return new Response("Profile not found", { status: 404 });
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
