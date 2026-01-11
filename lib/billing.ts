// ================================
// BuyAMinute — Billing Engine
// Phase 5
// ================================

import { prisma } from "@/lib/prisma";
import { ensureLedgerEntryWithClient } from "@/lib/ledger";
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
  await prisma.$transaction(async (tx) => {
    await ensureLedgerEntryWithClient(tx, {
      userId: callerId,
      type: "debit",
      amountTokens,
      source: "call_billing",
      callId,
      idempotencyKey: `call:${callId}:debit:${callerId}`,
    });

    await ensureLedgerEntryWithClient(tx, {
      userId: receiverId,
      type: "credit",
      amountTokens,
      source: "call_billing",
      callId,
      idempotencyKey: `call:${callId}:credit:${receiverId}`,
    });
  });
}

export async function settleCallBillingWithPreauth(params: {
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

  const normalizedBillableSeconds = Math.max(0, billableSeconds);
  const billedTokens = normalizedBillableSeconds * ratePerSecondTokens;

  await prisma.$transaction(async (tx) => {
    const preauthEntry = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: `call:${callId}:preauth:debit:${callerId}` },
    });
    const preauthTokens = preauthEntry?.amountTokens ?? 0;

    if (billedTokens > 0) {
      await ensureLedgerEntryWithClient(tx, {
        userId: receiverId,
        type: "credit",
        amountTokens: billedTokens,
        source: "call_billing",
        callId,
        idempotencyKey: `call:${callId}:credit:${receiverId}`,
      });
    }

    if (billedTokens > preauthTokens) {
      await ensureLedgerEntryWithClient(tx, {
        userId: callerId,
        type: "debit",
        amountTokens: billedTokens - preauthTokens,
        source: "call_billing",
        callId,
        idempotencyKey: `call:${callId}:debit:extra:${callerId}`,
      });
    }

    if (preauthTokens > 0 && billedTokens < preauthTokens) {
      await ensureLedgerEntryWithClient(tx, {
        userId: callerId,
        type: "credit",
        amountTokens: preauthTokens - billedTokens,
        source: "call_billing",
        callId,
        idempotencyKey: `call:${callId}:refund:${callerId}`,
      });
    }
  });
}
