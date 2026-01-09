// ================================
// BuyAMinute — Billing Engine
// Phase 5
// ================================

import { appendLedgerEntry } from "./ledger";
import { PREVIEW_SECONDS } from "./constants";

/**
 * Compute billable seconds based on total connected overlap
 * and preview eligibility.
 */
export function computeBillableSeconds(params: {
  connectedOverlapSeconds: number;
  previewApplied: boolean;
}): number {
  const { connectedOverlapSeconds, previewApplied } = params;

  if (connectedOverlapSeconds <= 0) return 0;

  const previewSeconds = previewApplied ? PREVIEW_SECONDS : 0;

  return Math.max(0, connectedOverlapSeconds - previewSeconds);
}

/**
 * Settle billing for a call.
 * This function is called AFTER the call ends.
 */
export async function settleCallBilling(params: {
  callId: string;
  callerId: string;
  receiverId: string;
  billableSeconds: number;
  ratePerSecondTokens: number;
}) {
  const {
    callId,
    callerId,
    receiverId,
    billableSeconds,
    ratePerSecondTokens,
  } = params;

  if (billableSeconds <= 0) return;

  const amountTokens = billableSeconds * ratePerSecondTokens;

  // Debit caller
  await appendLedgerEntry({
    userId: callerId,
    type: "debit",
    amountTokens,
    source: "call_billing",
    callId,
    idempotencyKey: `call:${callId}:debit:${callerId}`,
  });

  // Credit receiver
  await appendLedgerEntry({
    userId: receiverId,
    type: "credit",
    amountTokens,
    source: "call_billing",
    callId,
    idempotencyKey: `call:${callId}:credit:${receiverId}`,
  });
}
