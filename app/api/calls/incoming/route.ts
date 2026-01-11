import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { hasActivePreviewLock } from "@/lib/previewLock";
import { CALL_REQUEST_WINDOW_MS, TOKEN_UNIT_USD } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatRatePerMinute(ratePerSecondTokens: number) {
  const perMinuteUsd = ratePerSecondTokens * 60 * TOKEN_UNIT_USD;
  return `$${perMinuteUsd.toFixed(2)} / min`;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const now = Date.now();
  const earliest = new Date(now - CALL_REQUEST_WINDOW_MS);

  const calls = await prisma.call.findMany({
    where: {
      receiverId: auth.user.id,
      status: "ringing",
      createdAt: { gte: earliest },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (calls.length === 0) {
    return Response.json({ requests: [] });
  }

  const callerIds = Array.from(new Set(calls.map((call) => call.callerId)));
  const callers = await prisma.user.findMany({
    where: { id: { in: callerIds } },
    select: { id: true, name: true, email: true },
  });
  const callerMap = new Map(
    callers.map((caller) => [
      caller.id,
      caller.name ?? caller.email ?? caller.id,
    ])
  );

  const requests = await Promise.all(
    calls.map(async (call) => {
      const expiresAt = new Date(
        call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
      ).toISOString();
      const hasPreview = await hasActivePreviewLock({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
      const summary = hasPreview
        ? "Repeat caller · Preview already used"
        : "First-time caller · Preview available";

      return {
        id: call.id,
        caller: callerMap.get(call.callerId) ?? call.callerId,
        mode: call.mode === "video" ? "video" : "voice",
        ratePerMinute: formatRatePerMinute(call.ratePerSecondTokens),
        expiresAt,
        status: "pending",
        summary,
      };
    })
  );

  return Response.json({ requests });
}
