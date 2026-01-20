import { NextResponse } from "next/server";
import { AvailabilityResponse } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { createNotification } from "@/lib/notifications";

type PingPayload = {
  id: string;
  callerId: string;
  receiverId: string;
  question: string;
  response: string | null;
  status: string;
  feeTokens: number;
  createdAt: string;
  respondedAt: string | null;
};

function serializePing(ping: {
  id: string;
  callerId: string;
  receiverId: string;
  question: string;
  response: string | null;
  status: string;
  feeTokens: number;
  createdAt: Date;
  respondedAt: Date | null;
}): PingPayload {
  return {
    id: ping.id,
    callerId: ping.callerId,
    receiverId: ping.receiverId,
    question: ping.question,
    response: ping.response,
    status: ping.status,
    feeTokens: ping.feeTokens,
    createdAt: ping.createdAt.toISOString(),
    respondedAt: ping.respondedAt ? ping.respondedAt.toISOString() : null,
  };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let payload: { response?: AvailabilityResponse };
  try {
    payload = (await request.json()) as { response?: AvailabilityResponse };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  if (!payload.response) {
    return jsonError("Missing response", 400, "invalid_payload");
  }

  if (!Object.values(AvailabilityResponse).includes(payload.response)) {
    return jsonError("Invalid response", 400, "invalid_response");
  }

  const ping = await prisma.availabilityPing.findUnique({
    where: { id: params.id },
  });

  if (!ping) {
    return jsonError("Ping not found", 404, "not_found");
  }

  if (ping.receiverId !== auth.user.id) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  if (ping.response) {
    return NextResponse.json({ ping: serializePing(ping) });
  }

  const updated = await prisma.availabilityPing.update({
    where: { id: ping.id },
    data: {
      response: payload.response,
      status: "replied",
      respondedAt: new Date(),
    },
  });

  await createNotification({
    userId: ping.callerId,
    type: "availability_response",
    data: {
      pingId: ping.id,
      responderId: ping.receiverId,
      response: payload.response,
    },
    idempotencyKey: `ping:${ping.id}:reply:${payload.response}`,
  });

  return NextResponse.json({ ping: serializePing(updated) });
}
