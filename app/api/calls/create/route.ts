// ================================
// BuyAMinute — Calls/Create API (Secured)
// Phase 7
// ================================

import { PrismaClient } from "@prisma/client";
import { getWalletBalance } from "../../../../lib/ledger";
import { MIN_CALL_BALANCE_SECONDS } from "../../../../lib/constants";

const prisma = new PrismaClient();

/**
 * POST /calls/create
 * Body:
 * {
 *   callerId: string,
 *   receiverId: string,
 *   minIntendedSeconds?: number
 * }
 *
 * Security:
 * - rate is fetched server-side from ReceiverProfile
 * - receiver must be available
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { callerId, receiverId, minIntendedSeconds } = body;

  if (!callerId || !receiverId) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return new Response("Invalid minIntendedSeconds", { status: 400 });
  }

  const receiverProfile = await prisma.receiverProfile.findUnique({
    where: { userId: receiverId },
  });

  if (!receiverProfile) {
    return new Response("Receiver profile not found", { status: 404 });
  }

  if (!receiverProfile.isAvailable) {
    return new Response("Receiver is not available", { status: 400 });
  }

  const ratePerSecondTokens = receiverProfile.ratePerSecondTokens;

  if (!ratePerSecondTokens || ratePerSecondTokens <= 0) {
    return new Response("Receiver rate not set", { status: 400 });
  }

  const callerBalance = await getWalletBalance(callerId);

  // Rule: must afford at least 1 minute at receiver rate
  const minRequiredTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;

  if (callerBalance < minRequiredTokens) {
    return new Response("Insufficient balance for 1-minute minimum", {
      status: 400,
    });
  }

  // Rule: if caller declares min intended duration, must cover it (signal-only)
  if (minIntendedSeconds !== undefined) {
    const declaredRequired = minIntendedSeconds * ratePerSecondTokens;
    if (callerBalance < declaredRequired) {
      return new Response("Insufficient balance for declared minimum", {
        status: 400,
      });
    }
  }

  const call = await prisma.call.create({
    data: {
      callerId,
      receiverId,
      status: "ringing",
      ratePerSecondTokens,
      previewApplied: false, // set later when both connect
      participants: { create: {} },
    },
  });

  return Response.json({ ok: true, callId: call.id });
}
