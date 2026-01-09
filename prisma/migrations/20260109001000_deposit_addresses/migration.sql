-- BuyAMinute deposit address assignment

CREATE TABLE "DepositAddress" (
  "userId" TEXT NOT NULL,
  "tronAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DepositAddress_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "DepositAddress_tronAddress_key" ON "DepositAddress"("tronAddress");

ALTER TABLE "DepositAddress"
  ADD CONSTRAINT "DepositAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
