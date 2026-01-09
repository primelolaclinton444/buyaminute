// ================================
// BuyAMinute — Ledger Tests
// Phase 1
// ================================

import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { LedgerType, LedgerSource } from "@prisma/client";

const TEST_USER_ID = "test-user-1";

describe("Ledger invariants", () => {
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
