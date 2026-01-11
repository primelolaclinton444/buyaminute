// ================================
// BuyAMinute — Ledger Tests
// Phase 1
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { PrismaClient } from "@prisma/client";
import { LedgerSource, LedgerType } from "../lib/domain";
import { randomUUID } from "crypto";

const TEST_USER_ID = `test-user-${randomUUID()}`;
const prisma = new PrismaClient();

describe("Ledger invariants", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: TEST_USER_ID, email: `${TEST_USER_ID}@test.dev` } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("credits increase wallet balance", async () => {
    await appendLedgerEntry({
      userId: TEST_USER_ID,
      type: LedgerType.credit,
      amountTokens: 1000,
      source: LedgerSource.crypto_deposit,
      idempotencyKey: "ledger-credit-1",
    });

    const balance = await getWalletBalance(TEST_USER_ID);
    expect(balance).toBe(1000);
  });

  it("debits decrease wallet balance", async () => {
    await appendLedgerEntry({
      userId: TEST_USER_ID,
      type: LedgerType.debit,
      amountTokens: 400,
      source: LedgerSource.call_billing,
      idempotencyKey: "ledger-debit-1",
    });

    const balance = await getWalletBalance(TEST_USER_ID);
    expect(balance).toBe(600);
  });

  it("cannot append zero or negative amounts", async () => {
    await expect(
      appendLedgerEntry({
        userId: TEST_USER_ID,
        type: LedgerType.credit,
        amountTokens: 0,
        source: LedgerSource.crypto_deposit,
        idempotencyKey: "ledger-zero",
      })
    ).rejects.toThrow();
  });
});
