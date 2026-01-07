export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return j({ ok: false, error: "unauthorized" }, 401);
  }

  const startedAt = Date.now();

  try {
    const { pollUsdtDeposits } = await import("../../../../lib/tron/watcher");
    await pollUsdtDeposits();

    return j({ ok: true, ms: Date.now() - startedAt });
  } catch (err: any) {
    console.error("[run-watcher] failed:", err?.message || err, err?.stack);
    return j({ ok: false, error: "watcher_failed" }, 500);
  }
}
