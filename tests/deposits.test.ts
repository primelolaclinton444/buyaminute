// ================================
// BuyAMinute — Deposit Tests
// Phase 2
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { appendLedgerEntry, getWalletBalance } from "../lib/ledger";
import { TOKENS_PER_USD } from "../lib/constants";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const TEST_USER_ID = "deposit-test-user";
const TEST_TX_HASH = "0xtesttxhash123";

describe("USDT-TRC20 deposits", () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("records a deposit without crediting tokens", async () => {
    await prisma.cryptoDeposit.create({
      data: {
        userId: TEST_USER_ID,
        tronAddress: "TTestAddress123",
        amountUsdtAtomic: 10_000_000,
        txHash: TEST_TX_HASH,
        confirmations: 25,
        credited: false,
      },
    });

    const balance = await getWalletBalance(TEST_USER_ID);
    expect(balance).toBe(0);
  });

  it("credits tokens only via ledger entry", async () => {
    const tokens = 10 * TOKENS_PER_USD;

    await appendLedgerEntry({
      userId: TEST_USER_ID,
      type: "credit",
      amountTokens: tokens,
      source: "crypto_deposit",
      txHash: TEST_TX_HASH,
      idempotencyKey: "deposit-test-credit",
    });

    const balance = await getWalletBalance(TEST_USER_ID);
    expect(balance).toBe(tokens);
  });

  it("prevents double credit for same txHash", async () => {
    const tokens = 10 * TOKENS_PER_USD;
    const duplicateTxHash = `0x${randomUUID()}`;

    // First credit
    await appendLedgerEntry({
      userId: TEST_USER_ID,
      type: "credit",
      amountTokens: tokens,
      source: "crypto_deposit",
      txHash: duplicateTxHash,
      idempotencyKey: "deposit-test-credit-1",
    });

    // Second attempt should fail due to unique txHash constraint.
    await expect(
      appendLedgerEntry({
        userId: TEST_USER_ID,
        type: "credit",
        amountTokens: tokens,
        source: "crypto_deposit",
        txHash: duplicateTxHash,
        idempotencyKey: "deposit-test-credit-2",
      })
    ).rejects.toThrow();

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        txHash: duplicateTxHash,
        source: "crypto_deposit",
      },
    });

    expect(ledgerEntries.length).toBe(1);
  });
});
