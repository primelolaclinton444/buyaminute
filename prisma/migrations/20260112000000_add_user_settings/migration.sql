-- Add user settings fields
ALTER TABLE "User"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
