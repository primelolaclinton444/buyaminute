import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(MAX_LIMIT, limitParam))
    : DEFAULT_LIMIT;
  const cursor = searchParams.get("cursor");

  if (cursor && typeof cursor !== "string") {
    return jsonError("Invalid cursor", 400, "invalid_cursor");
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = entries.length > limit;
  const sliced = hasMore ? entries.slice(0, limit) : entries;

  return Response.json({
    entries: sliced.map((entry) => ({
      id: entry.id,
      type: entry.type,
      source: entry.source,
      amountTokens: entry.amountTokens,
      callId: entry.callId,
      withdrawalRequestId: entry.withdrawalRequestId,
      txHash: entry.txHash,
      createdAt: entry.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? sliced[sliced.length - 1]?.id ?? null : null,
  });
}
