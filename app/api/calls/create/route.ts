// ================================
// BuyAMinute — Calls/Create API (Secured)
// Phase 7
// ================================

import { prisma } from "@/lib/prisma";
import { requireInternalKey } from "@/lib/internalAuth";
import { ensureLedgerEntryWithClient, getWalletBalance } from "@/lib/ledger";
import { MIN_CALL_BALANCE_SECONDS } from "@/lib/constants";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/create
 * Body:
 * {
 *   callerId: string,
 *   receiverId: string,
 *   mode?: "voice" | "video",
 *   minIntendedSeconds?: number
 * }
 *
 * Security:
 * - rate is fetched server-side from ReceiverProfile
 * - receiver must be available
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callerId, receiverId, minIntendedSeconds, mode } = body;
  const resolvedMode = mode === "video" ? "video" : "voice";

  if (!callerId || !receiverId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  if (minIntendedSeconds !== undefined && minIntendedSeconds <= 0) {
    return jsonError("Invalid minIntendedSeconds", 400, "invalid_payload");
  }

  const receiverProfile = await prisma.receiverProfile.findUnique({
    where: { userId: receiverId },
  });

  if (!receiverProfile) {
    return jsonError("Receiver profile not found", 404, "not_found");
  }

  if (!receiverProfile.isAvailable) {
    return jsonError("Receiver is not available", 400, "receiver_unavailable");
  }

  if (resolvedMode === "video" && !receiverProfile.isVideoEnabled) {
    return jsonError(
      "Receiver does not allow video calls.",
      400,
      "VIDEO_NOT_ALLOWED"
    );
  }

  const ratePerSecondTokens = receiverProfile.ratePerSecondTokens;

  if (!ratePerSecondTokens || ratePerSecondTokens <= 0) {
    return jsonError("Receiver rate not set", 400, "invalid_rate");
  }

  const callerBalance = await getWalletBalance(callerId);

  // Rule: must afford at least 1 minute at receiver rate
  const minRequiredTokens = MIN_CALL_BALANCE_SECONDS * ratePerSecondTokens;

  if (callerBalance < minRequiredTokens) {
    return jsonError(
      "Insufficient balance for 1-minute minimum",
      400,
      "insufficient_balance"
    );
  }

  // Rule: if caller declares min intended duration, must cover it (signal-only)
  if (minIntendedSeconds !== undefined) {
    const declaredRequired = minIntendedSeconds * ratePerSecondTokens;
    if (callerBalance < declaredRequired) {
      return jsonError(
        "Insufficient balance for declared minimum",
        400,
        "insufficient_balance"
      );
    }
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: {
        callerId,
        receiverId,
        mode: resolvedMode,
        status: "ringing",
        ratePerSecondTokens,
        previewApplied: false,
        participants: { create: {} },
      },
    });

    await ensureLedgerEntryWithClient(tx, {
      userId: callerId,
      type: "debit",
      amountTokens: minRequiredTokens,
      source: "call_billing",
      callId: created.id,
      idempotencyKey: `call:${created.id}:preauth:debit:${callerId}`,
    });

    return created;
  });

  return Response.json({ ok: true, callId: call.id });
}
