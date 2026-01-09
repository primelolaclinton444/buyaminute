-- BuyAMinute MVP updates

-- Add user earnings visibility flags
ALTER TABLE "User"
  ADD COLUMN "earningsVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "earningsVisibilityLockedUntil" TIMESTAMP(3);

-- Ledger updates
ALTER TYPE "LedgerSource" ADD VALUE IF NOT EXISTS 'availability_ping';

ALTER TABLE "LedgerEntry"
  ADD COLUMN "withdrawalRequestId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "LedgerEntry"
SET "idempotencyKey" = CONCAT('legacy-', "id")
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "LedgerEntry"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_withdrawalRequestId_fkey"
  FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Receiver profile updates
ALTER TABLE "ReceiverProfile"
  ADD COLUMN "isVideoEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastRateChangeAt" TIMESTAMP(3);

-- Crypto deposit amount in atomic units
ALTER TABLE "CryptoDeposit"
  ADD COLUMN "amountUsdtAtomic" INTEGER;

UPDATE "CryptoDeposit"
SET "amountUsdtAtomic" = CAST(ROUND("amountUsdt" * 1000000) AS INTEGER);

ALTER TABLE "CryptoDeposit"
  ALTER COLUMN "amountUsdtAtomic" SET NOT NULL;

ALTER TABLE "CryptoDeposit"
  DROP COLUMN "amountUsdt";

-- Availability ping enums and table
CREATE TYPE "AvailabilityQuestion" AS ENUM ('available_now', 'available_later', 'when_good_time');
CREATE TYPE "AvailabilityResponse" AS ENUM ('available_now', 'available_later', 'not_available');

CREATE TABLE "AvailabilityPing" (
  "id" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "question" "AvailabilityQuestion" NOT NULL,
  "response" "AvailabilityResponse",
  "feeTokens" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "AvailabilityPing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvailabilityPing_callerId_idx" ON "AvailabilityPing"("callerId");
CREATE INDEX "AvailabilityPing_receiverId_idx" ON "AvailabilityPing"("receiverId");
