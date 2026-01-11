-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN "lockedTokens" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "LivekitWebhookEvent" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "participantRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivekitWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LivekitWebhookEvent_callId_idx" ON "LivekitWebhookEvent"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_idempotencyKey_key" ON "WithdrawalRequest"("idempotencyKey");
