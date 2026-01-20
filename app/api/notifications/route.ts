import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");

  const parsedLimit = Number(limitParam ?? 20);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(50, parsedLimit))
    : 20;

  const notifications = await prisma.notification.findMany({
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

  const hasMore = notifications.length > limit;
  const page = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return Response.json({
    notifications: page.map((notification) => ({
      id: notification.id,
      type: notification.type,
      data: notification.data,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    })),
    nextCursor,
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let payload: { ids?: string[]; markAll?: boolean };
  try {
    payload = (await req.json()) as { ids?: string[]; markAll?: boolean };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  const ids = payload.ids?.filter((id) => typeof id === "string" && id.length > 0) ?? [];
  const markAll = payload.markAll === true;

  if (!markAll && ids.length === 0) {
    return jsonError("Missing notification ids", 400, "invalid_payload");
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: auth.user.id,
      ...(markAll ? {} : { id: { in: ids } }),
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return Response.json({ ok: true, updated: result.count });
}
