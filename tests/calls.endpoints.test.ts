// ================================
// BuyAMinute — Calls Endpoint Drift Tests
// ================================

import { afterAll, beforeAll, describe, expect, it } from "./test-helpers";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { appendLedgerEntry } from "../lib/ledger";
import {
  createSessionToken,
  resetCookieReaderForTests,
  setCookieReaderForTests,
} from "../lib/auth";
import { GET as activeGET } from "../app/api/calls/active/route";
import { GET as stateGET } from "../app/api/calls/[id]/state/route";
import { GET as receiptGET } from "../app/api/calls/receipt/route";
import { GET as receiptIdGET } from "../app/api/calls/[id]/receipt/route";
import { POST as deprecatedAcceptPOST } from "../app/api/calls/[id]/accept/route";
import { POST as deprecatedDeclinePOST } from "../app/api/calls/[id]/decline/route";

const prisma = new PrismaClient();
let sessionToken: string | null = null;

function setSession(userId: string | null) {
  sessionToken = userId ? createSessionToken(userId) : null;
}

setCookieReaderForTests(() => ({
  get: (name: string) =>
    name === "bam_session" && sessionToken ? { value: sessionToken } : undefined,
  set: () => {},
}));

describe("Call endpoint canonicalization", () => {
  const callerId = `caller-${randomUUID()}`;
  const receiverId = `receiver-${randomUUID()}`;
  const callId = `call-${randomUUID()}`;

  beforeAll(async () => {
    await Promise.all(
      [callerId, receiverId].map((id) =>
        prisma.user.upsert({
          where: { id },
          update: { email: `${id}@test.dev` },
          create: { id, email: `${id}@test.dev` },
        })
      )
    );

    const endedAt = new Date();
    const connectedAt = new Date(endedAt.getTime() - 45_000);

    await prisma.call.create({
      data: {
        id: callId,
        callerId,
        receiverId,
        mode: "voice",
        status: "ended",
        ratePerSecondTokens: 2,
        previewApplied: false,
        endedAt,
        participants: {
          create: {
            callerConnectedAt: connectedAt,
            receiverConnectedAt: connectedAt,
            bothConnectedAt: connectedAt,
          },
        },
      },
    });

    await appendLedgerEntry({
      userId: callerId,
      type: "debit",
      amountTokens: 120,
      source: "call_billing",
      callId,
      idempotencyKey: `seed:${callId}:debit:${callerId}`,
    });

    await appendLedgerEntry({
      userId: callerId,
      type: "credit",
      amountTokens: 20,
      source: "call_billing",
      callId,
      idempotencyKey: `seed:${callId}:credit:${callerId}`,
    });

    await appendLedgerEntry({
      userId: receiverId,
      type: "credit",
      amountTokens: 100,
      source: "call_billing",
      callId,
      idempotencyKey: `seed:${callId}:credit:${receiverId}`,
    });
  });

  afterAll(async () => {
    resetCookieReaderForTests();
    await prisma.$disconnect();
  });

  it("wraps state and receipt endpoints to canonical responses", async () => {
    setSession(callerId);

    const activeRes = await activeGET(
      new Request(`http://localhost/api/calls/active?id=${callId}`)
    );
    const stateRes = await stateGET(new Request("http://localhost/api/calls"), {
      params: { id: callId },
    });

    expect(activeRes.status).toBe(200);
    expect(stateRes.status).toBe(200);
    expect(await stateRes.json()).toEqual(await activeRes.json());

    const receiptRes = await receiptGET(
      new Request(`http://localhost/api/calls/receipt?id=${callId}`)
    );
    const receiptIdRes = await receiptIdGET(new Request("http://localhost/api/calls"), {
      params: { id: callId },
    });

    expect(receiptRes.status).toBe(200);
    expect(receiptIdRes.status).toBe(200);
    expect(await receiptIdRes.json()).toEqual(await receiptRes.json());
  });

  it("returns 410 for deprecated endpoints", async () => {
    const acceptRes = await deprecatedAcceptPOST();
    const declineRes = await deprecatedDeclinePOST();

    expect(acceptRes.status).toBe(410);
    expect(declineRes.status).toBe(410);

    const acceptJson = await acceptRes.json();
    const declineJson = await declineRes.json();

    expect(acceptJson.error?.code).toBe("DEPRECATED_ENDPOINT");
    expect(declineJson.error?.code).toBe("DEPRECATED_ENDPOINT");
  });
});

describe("Call route anti-drift guard", () => {
  it("keeps call routes free of business logic", async () => {
    const root = path.join(process.cwd(), "app", "api", "calls");
    const routes: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && entry.name === "route.ts") {
            routes.push(fullPath);
          }
        })
      );
    }

    await walk(root);

    const forbiddenPatterns: { pattern: RegExp; reason: string }[] = [
      { pattern: /prisma\./, reason: "direct prisma access" },
      { pattern: /appendLedgerEntry/, reason: "ledger mutations" },
      { pattern: /ensureLedgerEntryWithClient/, reason: "ledger mutations" },
      { pattern: /getWalletBalance/, reason: "wallet math" },
      { pattern: /hasActivePreviewLock/, reason: "preview locks" },
      { pattern: /settleEndedCall/, reason: "settlement logic" },
      { pattern: /MIN_CALL_BALANCE_SECONDS/, reason: "billing constants" },
      { pattern: /CALL_REQUEST_WINDOW_MS/, reason: "billing constants" },
      { pattern: /TOKEN_UNIT_USD/, reason: "billing constants" },
      { pattern: /PREVIEW_SECONDS/, reason: "preview constants" },
    ];

    await Promise.all(
      routes.map(async (routePath) => {
        const contents = await fs.readFile(routePath, "utf8");
        for (const { pattern, reason } of forbiddenPatterns) {
          if (pattern.test(contents)) {
            throw new Error(
              `${routePath} contains ${reason} (${pattern.toString()})`
            );
          }
        }
      })
    );
  });
});
