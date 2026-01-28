-- Add freeze controls and call end reason
ALTER TABLE "User"
  ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "frozenReason" TEXT,
  ADD COLUMN "frozenAt" TIMESTAMP(3);

ALTER TABLE "Call"
  ADD COLUMN "endReason" TEXT;

-- Add platform settings
CREATE TABLE "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");
