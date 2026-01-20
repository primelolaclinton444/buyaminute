import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AvailabilityResponse } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { appendLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { AVAILABILITY_PING_FEE_TOKENS } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import {
  parseAvailabilityQuestion,
  PING_QUESTION_LABELS,
} from "@/lib/pings";

type PingStatus = "new" | "accepted" | "missed" | "completed";

function mapStatus(response: string | null): PingStatus {
  if (!response) return "new";
  if (response === AvailabilityResponse.not_available) return "missed";
  return "accepted";
}

function getPingId(idempotencyKey: string, userId: string) {
  const digest = createHash("sha256")
    .update(`${userId}:${idempotencyKey}`)
    .digest("hex");
  return `ping_${digest}`;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const pings = await prisma.availabilityPing.findMany({
    where: {
      OR: [{ callerId: auth.user.id }, { receiverId: auth.user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  const callerIds = Array.from(new Set(pings.map((ping) => ping.callerId)));
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

  return NextResponse.json({
    pings: pings.map((ping) => ({
      id: ping.id,
      requester: callerMap.get(ping.callerId) ?? ping.callerId,
      topic: PING_QUESTION_LABELS[ping.question] ?? ping.question,
      status: mapStatus(ping.response),
      createdAt: ping.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let payload: { topic?: string; requestedFor?: string; details?: string };
  try {
    payload = (await request.json()) as {
      topic?: string;
      requestedFor?: string;
      details?: string;
    };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  const topic = payload.topic?.trim();
  const requestedFor = payload.requestedFor?.trim();
  const details = payload.details?.trim();

  if (!topic || !requestedFor) {
    return jsonError("Missing required fields", 400, "invalid_payload", {
      required: ["topic", "requestedFor"],
    });
  }

  if (details) {
    return jsonError("Ping details are not allowed", 400, "details_not_allowed");
  }

  const question = parseAvailabilityQuestion(topic);
  if (!question) {
    return jsonError("Invalid ping topic", 400, "invalid_topic");
  }

  const receiver = await prisma.user.findFirst({
    where: {
      OR: [{ id: requestedFor }, { email: requestedFor }, { name: requestedFor }],
    },
    select: { id: true },
  });

  if (!receiver) {
    return jsonError("Receiver not found", 404, "receiver_not_found");
  }

  const feeTokens = AVAILABILITY_PING_FEE_TOKENS;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();

  if (feeTokens > 0 && !idempotencyKey) {
    return jsonError("Idempotency key required", 400, "idempotency_key_required");
  }

  const effectiveKey = idempotencyKey ?? randomUUID();
  const pingId = getPingId(effectiveKey, auth.user.id);
  const ledgerKey = `availability_ping:${auth.user.id}:${effectiveKey}`;

  const existingPing = await prisma.availabilityPing.findUnique({
    where: { id: pingId },
  });

  if (existingPing) {
    if (existingPing.callerId !== auth.user.id) {
      return jsonError("Unauthorized", 403, "forbidden");
    }
    return NextResponse.json(
      {
        ping: {
          id: existingPing.id,
          requester: auth.user.name ?? auth.user.email ?? auth.user.id,
          topic: PING_QUESTION_LABELS[existingPing.question] ?? existingPing.question,
          status: mapStatus(existingPing.response),
          createdAt: existingPing.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  }

  if (feeTokens > 0) {
    const balance = await getWalletBalance(auth.user.id);
    if (balance < feeTokens) {
      return jsonError("Insufficient balance", 400, "insufficient_balance");
    }
  }

  const { ping, created } = await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: ledgerKey },
    });
    const shouldAppendLedger = feeTokens > 0 && !ledgerEntry;

    if (ledgerEntry) {
      const existing = await tx.availabilityPing.findUnique({
        where: { id: pingId },
      });
      if (existing) {
        return { ping: existing, created: false };
      }
    }

    const created = await tx.availabilityPing.create({
      data: {
        id: pingId,
        callerId: auth.user.id,
        receiverId: receiver.id,
        question,
        feeTokens,
      },
    });

    if (shouldAppendLedger) {
      await appendLedgerEntryWithClient(tx, {
        userId: auth.user.id,
        type: "debit",
        amountTokens: feeTokens,
        source: "availability_ping",
        idempotencyKey: ledgerKey,
      });
    }

    return { ping: created, created: true };
  });

  if (created) {
    await createNotification({
      userId: receiver.id,
      type: "availability_ping",
      data: { pingId: ping.id, callerId: auth.user.id, question },
      idempotencyKey: `ping:${ping.id}:created:${receiver.id}`,
    });
  }

  return NextResponse.json(
    {
      ping: {
        id: ping.id,
        requester: auth.user.name ?? auth.user.email ?? auth.user.id,
        topic: PING_QUESTION_LABELS[ping.question] ?? ping.question,
        status: mapStatus(ping.response),
        createdAt: ping.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
