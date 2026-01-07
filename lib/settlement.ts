// ================================
// BuyAMinute — Settlement on End
// Phase 6
// ================================
import { prisma } from "@/lib/prisma";
import { computeBillableSeconds, settleCallBilling } from "./billing";
/**
 * Settle a call AFTER it has ended.
 * - Computes connected overlap as (endedAt - bothConnectedAt)
 * - Applies preview (30s) only if call.previewApplied === true
 * - Debits caller, credits receiver via append-only ledger
 */
export async function settleEndedCall(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call) throw new Error("Call not found");
  if (!call.endedAt) throw new Error("Call is not ended");
  if (!call.participants?.bothConnectedAt) {
    // Never had a real connection → nothing to bill
    return;
  }

  const overlapMs =
    call.endedAt.getTime() - call.participants.bothConnectedAt.getTime();

  // Conservative billing: never overcharge partial seconds
  const connectedOverlapSeconds = Math.max(0, Math.floor(overlapMs / 1000));

  const billableSeconds = computeBillableSeconds({
    connectedOverlapSeconds,
    previewApplied: call.previewApplied,
  });

  await settleCallBilling({
    callId: call.id,
    callerId: call.callerId,
    receiverId: call.receiverId,
    billableSeconds,
    ratePerSecondTokens: call.ratePerSecondTokens,
  });
}
