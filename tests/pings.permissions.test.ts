// ================================
// BuyAMinute — Ping Permissions Tests
// Phase 11
// ================================

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { appendLedgerEntry } from "../lib/ledger";
import { AVAILABILITY_PING_FEE_TOKENS } from "../lib/constants";
import { POST as createPingPOST } from "../app/api/availability/ping/route";
import { POST as respondPingPOST } from "../app/api/availability/ping/respond/route";

const prisma = new PrismaClient();

const callerId = "caller-ping-permissions";
const receiverId = "receiver-ping-permissions";
const otherUserId = "other-ping-permissions";

function makeInternalRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
}

describe("Availability ping permissions", () => {
  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = "test-internal-key";
    await prisma.user.createMany({
      data: [{ id: callerId }, { id: receiverId }, { id: otherUserId }],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("only allows the receiver to respond", async () => {
    const txHash = `seed-${randomUUID()}`;
    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: AVAILABILITY_PING_FEE_TOKENS,
      source: "crypto_deposit",
      txHash,
      idempotencyKey: txHash,
    });

    const createRes = await createPingPOST(
      makeInternalRequest("http://localhost/api/availability/ping", {
        callerId,
        receiverId,
        question: "available_now",
      })
    );

    const createJson = (await createRes.json()) as { ok?: boolean; pingId?: string };
    expect(createJson.ok).toBe(true);
    expect(createJson.pingId).toBeTruthy();

    const pingId = createJson.pingId as string;

    const wrongRes = await respondPingPOST(
      makeInternalRequest("http://localhost/api/availability/ping/respond", {
        pingId,
        userId: otherUserId,
        response: "available_now",
      })
    );
    expect(wrongRes.status).toBe(401);

    const okRes = await respondPingPOST(
      makeInternalRequest("http://localhost/api/availability/ping/respond", {
        pingId,
        userId: receiverId,
        response: "available_now",
      })
    );
    expect(okRes.status).toBe(200);
  });
});
