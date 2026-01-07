export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // MVP admin guard via a shared secret
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // IMPORTANT: import watcher only at runtime (not build time)
  const { pollUsdtDeposits } = await import("../../../../lib/tron/watcher");

  await pollUsdtDeposits();
  return Response.json({ ok: true });
}
