// ================================
// BuyAMinute — Preview Lock Logic
// Phase 4 (Rule 6A)
// ================================

import { PrismaClient } from "@prisma/client";
import { PREVIEW_LOCK_HOURS } from "./constants";

const prisma = new PrismaClient();

/**
 * Check whether a caller is eligible for a preview
 * with a given receiver.
 */
export async function hasActivePreviewLock(params: {
  callerId: string;
  receiverId: string;
}): Promise<boolean> {
  const { callerId, receiverId } = params;

  const lock = await prisma.callerReceiverPreviewLock.findUnique({
    where: {
      callerId_receiverId: {
        callerId,
        receiverId,
      },
    },
  });

  if (!lock) return false;

  const cutoff = new Date(
    Date.now() - PREVIEW_LOCK_HOURS * 60 * 60 * 1000
  );

  return lock.previewUsedAt >= cutoff;
}

/**
 * Consume preview immediately on first real connection.
 * This must be called as soon as both_connected_at is set.
 */
export async function consumePreview(params: {
  callerId: string;
  receiverId: string;
}) {
  const { callerId, receiverId } = params;

  await prisma.callerReceiverPreviewLock.upsert({
    where: {
      callerId_receiverId: {
        callerId,
        receiverId,
      },
    },
    create: {
      callerId,
      receiverId,
      previewUsedAt: new Date(),
    },
    update: {
      previewUsedAt: new Date(),
    },
  });
}
