import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { PREVIEW_SECONDS, TOKEN_UNIT_USD } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatUsd(tokens: number) {
  const usd = tokens * TOKEN_UNIT_USD;
  return `$${usd.toFixed(2)}`;
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return jsonError("Missing call id", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.callerId !== auth.user.id && call.receiverId !== auth.user.id) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [call.callerId, call.receiverId] } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(
    users.map((user) => [user.id, user.name ?? user.email ?? user.id])
  );

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      callId: call.id,
      userId: call.callerId,
      source: "call_billing",
    },
  });

  const debits = ledgerEntries
    .filter((entry) => entry.type === "debit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);
  const credits = ledgerEntries
    .filter((entry) => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amountTokens, 0);

  const totalChargedTokens = Math.max(0, debits - credits);
  const refundedTokens = Math.max(0, credits);

  const durationSeconds =
    call.participants?.bothConnectedAt && call.endedAt
      ? Math.max(
          0,
          Math.floor(
            (call.endedAt.getTime() - call.participants.bothConnectedAt.getTime()) /
              1000
          )
        )
      : 0;

  const previewSeconds = call.previewApplied
    ? Math.min(PREVIEW_SECONDS, durationSeconds)
    : 0;

  return Response.json({
    receipt: {
      id: call.id,
      caller: userMap.get(call.callerId) ?? call.callerId,
      receiver: userMap.get(call.receiverId) ?? call.receiverId,
      duration: formatDuration(durationSeconds),
      previewApplied: formatDuration(previewSeconds),
      totalCharged: formatUsd(totalChargedTokens),
      refunded: formatUsd(refundedTokens),
    },
  });
}
