import { jsonError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return jsonError("Unauthorized", 401, "unauthorized");
  }

  const startedAt = Date.now();

  try {
    const { pollUsdtDeposits } = await import("../../../../lib/tron/watcher");
    await pollUsdtDeposits();

    return Response.json({ ok: true, ms: Date.now() - startedAt });
  } catch (err: any) {
    console.error("[run-watcher] failed:", err?.message || err, err?.stack);
    return jsonError("Watcher failed", 500, "watcher_failed");
  }
}
