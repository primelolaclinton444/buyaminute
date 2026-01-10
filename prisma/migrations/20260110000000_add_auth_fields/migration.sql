-- Add auth fields for user accounts
ALTER TABLE "User"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
