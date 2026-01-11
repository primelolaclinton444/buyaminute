import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const pings = await prisma.availabilityPing.findMany({
    where: { callerId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    pings: pings.map(serializePing),
  });
}
