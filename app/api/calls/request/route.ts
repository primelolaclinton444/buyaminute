import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { ensureLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { CALL_REQUEST_WINDOW_MS, MIN_CALL_BALANCE_SECONDS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCallId(idempotencyKey: string, callerId: string) {
  const digest = createHash("sha256")
    .update(`${callerId}:${idempotencyKey}`)
    .digest("hex");
  return `call_${digest}`;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: {
    username?: string;
    mode?: "voice" | "video";
    minIntendedSeconds?: number;
  };

  try {
    body = (await req.json()) as {
      username?: string;
      mode?: "voice" | "video";
      minIntendedSeconds?: number;
    };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  const username = body.username?.trim();
  const mode = body.mode === "video" ? "video" : "voice";
  const minIntendedSeconds = body.minIntendedSeconds;

  if (!username) {
    return jsonError("Missing username", 400, "invalid_payload");
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return jsonError("Invalid minIntendedSeconds", 400, "invalid_payload");
  }

  const receiver = await prisma.user.findFirst({
    where: { OR: [{ id: username }, { email: username }, { name: username }] },
    select: { id: true, name: true, email: true },
  });

  if (!receiver) {
    return Response.json({
      requestId: null,
      status: "offline",
      username,
      mode,
      expiresAt: null,
    });
  }

  const receiverProfile = await prisma.receiverProfile.findUnique({
    where: { userId: receiver.id },
  });

  if (!receiverProfile?.isAvailable) {
    return Response.json({
      requestId: null,
      status: "offline",
      username,
      mode,
      expiresAt: null,
    });
  }

  if (mode === "video" && !receiverProfile.isVideoEnabled) {
    return Response.json({
      requestId: null,
      status: "offline",
      username,
      mode,
      expiresAt: null,
    });
  }

  const ratePerSecondTokens = receiverProfile.ratePerSecondTokens;
  if (!ratePerSecondTokens || ratePerSecondTokens <= 0) {
    return jsonError("Receiver rate not set", 400, "invalid_rate");
  }

  const minRequiredTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;
  const callerBalance = await getWalletBalance(auth.user.id);

  if (callerBalance < minRequiredTokens) {
    return Response.json({
      requestId: null,
      status: "insufficient",
      username,
      mode,
      expiresAt: null,
    });
  }

  if (minIntendedSeconds !== undefined) {
    const declaredRequired = minIntendedSeconds * ratePerSecondTokens;
    if (callerBalance < declaredRequired) {
      return Response.json({
        requestId: null,
        status: "insufficient",
        username,
        mode,
        expiresAt: null,
      });
    }
  }

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  const callId = idempotencyKey ? getCallId(idempotencyKey, auth.user.id) : null;

  if (callId) {
    const existing = await prisma.call.findUnique({ where: { id: callId } });
    if (existing) {
      if (existing.callerId !== auth.user.id) {
        return jsonError("Unauthorized", 403, "forbidden");
      }
      const expiresAt = new Date(
        existing.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
      ).toISOString();
      return Response.json({
        requestId: existing.id,
        status: "pending",
        username: receiver.name ?? receiver.email ?? receiver.id,
        mode,
        expiresAt,
      });
    }
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: {
        id: callId ?? undefined,
        callerId: auth.user.id,
        receiverId: receiver.id,
        status: "ringing",
        ratePerSecondTokens,
        previewApplied: false,
        participants: { create: {} },
      },
    });

    await ensureLedgerEntryWithClient(tx, {
      userId: auth.user.id,
      type: "debit",
      amountTokens: minRequiredTokens,
      source: "call_billing",
      callId: created.id,
      idempotencyKey: `call:${created.id}:preauth:debit:${auth.user.id}`,
    });

    return created;
  });

  const expiresAt = new Date(
    call.createdAt.getTime() + CALL_REQUEST_WINDOW_MS
  ).toISOString();

  return Response.json({
    requestId: call.id,
    status: "pending",
    username: receiver.name ?? receiver.email ?? receiver.id,
    mode,
    expiresAt,
  });
}
