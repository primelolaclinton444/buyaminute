export const dynamic = "force-dynamic";
import { pollUsdtDeposits } from "../../../../lib/tron/watcher";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  await pollUsdtDeposits();
  return Response.json({ ok: true });
}
