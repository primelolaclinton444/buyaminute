// ================================
// BuyAMinute — USDT-TRC20 Deposit Scanner
// Phase 2: detects incoming USDT to derived addresses + tracks confirmations.
// Feeds lib/tron/watcher.ts -> pollUsdtDeposits() which credits at >= 20 confs.
// ================================
//
// Read-only against TronGrid (no keys, no signing). Idempotent on txHash.
// Network is env-driven:
//   TRON_FULLHOST          mainnet: https://api.trongrid.io   nile: https://nile.trongrid.io
//   USDT_CONTRACT_ADDRESS  mainnet: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t  nile: TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf
//   TRONGRID_API_KEY       mainnet only (testnet needs no key)
//   SCAN_MAX_ADDRESSES     safety cap on addresses scanned per run (default 1000)

import { prisma } from "@/lib/prisma";

// Postgres Int (32-bit signed). Guard single deposits that would overflow
// amountUsdtAtomic (~2,147 USDT). Larger deposits are logged for manual handling.
const MAX_ATOMIC = 2_000_000_000;

function fullHost(): string {
  const h = process.env.TRON_FULLHOST;
  if (!h) throw new Error("TRON_FULLHOST is not set");
  return h.replace(/\/+$/, "");
}

function usdtContract(): string {
  const c = process.env.USDT_CONTRACT_ADDRESS;
  if (!c) throw new Error("USDT_CONTRACT_ADDRESS is not set");
  return c;
}

function tronHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.TRONGRID_API_KEY) h["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  return h;
}

async function getCurrentBlock(): Promise<number> {
  const res = await fetch(`${fullHost()}/wallet/getnowblock`, {
    method: "POST",
    headers: tronHeaders(),
    body: "{}",
  });
  const j: any = await res.json();
  return j?.block_header?.raw_data?.number ?? 0;
}

async function getTxBlockNumber(txHash: string): Promise<number | null> {
  const res = await fetch(`${fullHost()}/wallet/gettransactioninfobyid`, {
    method: "POST",
    headers: tronHeaders(),
    body: JSON.stringify({ value: txHash }),
  });
  const j: any = await res.json();
  // Skip failed contract executions — they didn't actually transfer funds.
  if (j?.receipt?.result && j.receipt.result !== "SUCCESS") return null;
  return typeof j?.blockNumber === "number" ? j.blockNumber : null;
}

async function fetchIncomingTransfers(
  address: string
): Promise<Array<{ txHash: string; value: number; to: string }>> {
  const url =
    `${fullHost()}/v1/accounts/${address}/transactions/trc20` +
    `?only_to=true&limit=50&order_by=block_timestamp,desc` +
    `&contract_address=${usdtContract()}`;

  const res = await fetch(url, { method: "GET", headers: tronHeaders() });
  const j: any = await res.json();

  const out: Array<{ txHash: string; value: number; to: string }> = [];
  for (const t of j?.data ?? []) {
    if (t?.type && t.type !== "Transfer") continue;
    const txHash = t?.transaction_id;
    const to = t?.to;
    const value = Number(t?.value);
    if (!txHash || !to || !Number.isFinite(value)) continue;
    out.push({ txHash, value, to });
  }
  return out;
}

/**
 * Scan provisioned deposit addresses for incoming USDT, record/refresh deposits.
 * Does NOT credit — that's pollUsdtDeposits()'s job once confirmations >= 20.
 */
export async function scanDepositAddresses(): Promise<{
  scanned: number;
  recorded: number;
  updated: number;
}> {
  const cap = Number(process.env.SCAN_MAX_ADDRESSES ?? 1000);

  const addresses = await prisma.depositAddress.findMany({
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(cap) && cap > 0 ? cap : 1000,
  });
  if (addresses.length === 0) return { scanned: 0, recorded: 0, updated: 0 };

  const addrToUser = new Map(addresses.map((a) => [a.tronAddress, a.userId]));
  const currentBlock = await getCurrentBlock();

  let recorded = 0;
  let updated = 0;

  for (const { tronAddress } of addresses) {
    let transfers;
    try {
      transfers = await fetchIncomingTransfers(tronAddress);
    } catch (e: any) {
      console.error(`[scanner] fetch failed for ${tronAddress}:`, e?.message || e);
      continue; // one bad address shouldn't abort the whole run
    }

    for (const t of transfers) {
      if (t.to !== tronAddress) continue;
      if (t.value <= 0) continue;
      if (t.value > MAX_ATOMIC) {
        console.warn(
          `[scanner] deposit ${t.txHash} (${t.value} atomic) exceeds Int cap; manual handling required`
        );
        continue;
      }

      const existing = await prisma.cryptoDeposit.findUnique({
        where: { txHash: t.txHash },
      });
      if (existing?.credited) continue; // already done

      let confirmations = 0;
      const block = await getTxBlockNumber(t.txHash);
      if (block != null && currentBlock > 0) {
        confirmations = Math.max(0, currentBlock - block);
      }

      if (existing) {
        if (confirmations !== existing.confirmations) {
          await prisma.cryptoDeposit.update({
            where: { txHash: t.txHash },
            data: { confirmations },
          });
          updated++;
        }
      } else {
        const userId = addrToUser.get(tronAddress);
        if (!userId) continue;
        try {
          await prisma.cryptoDeposit.create({
            data: {
              userId,
              tronAddress,
              amountUsdtAtomic: t.value,
              txHash: t.txHash,
              confirmations,
              credited: false,
            },
          });
          recorded++;
        } catch (e: any) {
          if (e?.code === "P2002") continue; // race: recorded by a concurrent run
          throw e;
        }
      }
    }
  }

  return { scanned: addresses.length, recorded, updated };
}
