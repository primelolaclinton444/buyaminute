// ================================
// BuyAMinute — Calls/Create API
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
 *   ratePerSecondTokens: number,
 *   minIntendedSeconds?: number
 * }
 *
 * Notes:
 * - For MVP we accept ratePerSecondTokens from the client, but we LOCK it on the call.
 * - Later you should fetch receiver rate from DB to prevent tampering.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const {
    callerId,
    receiverId,
    ratePerSecondTokens,
    minIntendedSeconds,
  } = body;

  if (!callerId || !receiverId || !ratePerSecondTokens) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (ratePerSecondTokens <= 0) {
    return new Response("Invalid rate", { status: 400 });
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return new Response("Invalid minIntendedSeconds", { status: 400 });
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

  // Create call + participant row
  const call = await prisma.call.create({
    data: {
      callerId,
      receiverId,
      status: "ringing",
      ratePerSecondTokens,
      previewApplied: false, // set later when both connect
      participants: {
        create: {},
      },
    },
    include: {
      participants: true,
    },
  });

  return Response.json({
    ok: true,
    callId: call.id,
    status: call.status,
  });
}
