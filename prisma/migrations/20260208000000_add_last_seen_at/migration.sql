-- Add lastSeenAt to User for presence tracking
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
