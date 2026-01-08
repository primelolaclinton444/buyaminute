-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('call_billing', 'crypto_deposit', 'withdrawal');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('created', 'ringing', 'connected', 'ended');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "userId" TEXT NOT NULL,
    "balanceTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amountTokens" INTEGER NOT NULL,
    "source" "LedgerSource" NOT NULL,
    "callId" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountTokens" INTEGER NOT NULL,
    "destinationTronAddress" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "ratePerSecondTokens" INTEGER NOT NULL,
    "previewApplied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallParticipant" (
    "callId" TEXT NOT NULL,
    "callerConnectedAt" TIMESTAMP(3),
    "receiverConnectedAt" TIMESTAMP(3),
    "bothConnectedAt" TIMESTAMP(3),

    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("callId")
);

-- CreateTable
CREATE TABLE "CallerReceiverPreviewLock" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "previewUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallerReceiverPreviewLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiverProfile" (
    "userId" TEXT NOT NULL,
    "ratePerSecondTokens" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiverProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tronAddress" TEXT NOT NULL,
    "amountUsdt" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "credited" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_callId_idx" ON "LedgerEntry"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_txHash_source_key" ON "LedgerEntry"("txHash", "source");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "CallerReceiverPreviewLock_previewUsedAt_idx" ON "CallerReceiverPreviewLock"("previewUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallerReceiverPreviewLock_callerId_receiverId_key" ON "CallerReceiverPreviewLock"("callerId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_txHash_key" ON "CryptoDeposit"("txHash");

-- CreateIndex
CREATE INDEX "CryptoDeposit_userId_idx" ON "CryptoDeposit"("userId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_tronAddress_idx" ON "CryptoDeposit"("tronAddress");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiverProfile" ADD CONSTRAINT "ReceiverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
