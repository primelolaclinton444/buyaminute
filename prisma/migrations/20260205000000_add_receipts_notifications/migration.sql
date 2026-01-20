-- CreateTable
CREATE TABLE "CallReceipt" (
    "callId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "previewSeconds" INTEGER NOT NULL,
    "totalChargedTokens" INTEGER NOT NULL,
    "refundedTokens" INTEGER NOT NULL,
    "earnedTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallReceipt_pkey" PRIMARY KEY ("callId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallReceipt_callerId_idx" ON "CallReceipt"("callerId");

-- CreateIndex
CREATE INDEX "CallReceipt_receiverId_idx" ON "CallReceipt"("receiverId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_idempotencyKey_key" ON "Notification"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "CallReceipt" ADD CONSTRAINT "CallReceipt_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallReceipt" ADD CONSTRAINT "CallReceipt_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallReceipt" ADD CONSTRAINT "CallReceipt_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
