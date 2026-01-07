import { callProtectedApi } from "@/lib/internalCall";
import { getClientIp, rateLimitOrPass } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimitOrPass({ key: `ui:wallet:balance:ip:${ip}` });
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "retry-after": String(rl.retryAfterSeconds ?? 1) },
    });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return new Response("Missing userId", { status: 400 });

  const res = await callProtectedApi(
    `/api/wallet/balance?userId=${encodeURIComponent(userId)}`,
    { method: "GET" }
  );

  return new Response(await res.text(), { status: res.status });
}
