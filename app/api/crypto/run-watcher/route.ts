// ================================
// BuyAMinute — Deposit Watcher Cron Entry
// Phase 2: scan for new deposits + bump confirmations, then credit.
// ================================
//
// Auth (either works):
//   - Vercel Cron: sends  Authorization: Bearer <CRON_SECRET>  automatically
//     when a CRON_SECRET env var is set. Vercel cron issues GET requests.
//   - Manual trigger: header  x-cron-secret: <CRON_SECRET>  (POST or GET).

import { jsonError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true; // Vercel cron
  if (req.headers.get("x-cron-secret") === secret) return true; // manual
  return false;
}

async function runWatcher() {
  const { scanDepositAddresses } = await import("../../../../lib/tron/scanner");
  const { pollUsdtDeposits } = await import("../../../../lib/tron/watcher");

  const scan = await scanDepositAddresses(); // detect + confirmations
  await pollUsdtDeposits(); // credit anything now >= 20 confirmations
  return scan;
}

async function handle(req: Request) {
  if (!authorized(req)) return jsonError("Unauthorized", 401, "unauthorized");

  const startedAt = Date.now();
  try {
    const scan = await runWatcher();
    return Response.json({ ok: true, ms: Date.now() - startedAt, ...scan });
  } catch (err: any) {
    console.error("[run-watcher] failed:", err?.message || err, err?.stack);
    return jsonError("Watcher failed", 500, "watcher_failed");
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
