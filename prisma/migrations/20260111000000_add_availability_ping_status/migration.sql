-- Add status tracking for availability pings
CREATE TYPE "AvailabilityPingStatus" AS ENUM ('sent', 'delivered', 'replied');

ALTER TABLE "AvailabilityPing"
  ADD COLUMN "status" "AvailabilityPingStatus" NOT NULL DEFAULT 'sent';

UPDATE "AvailabilityPing"
SET "status" = 'replied'
WHERE "response" IS NOT NULL;
