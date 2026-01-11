import { callProtectedApi } from "@/lib/internalCall";
import { getClientIp, rateLimitOrPass } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimitOrPass({ key: `ui:wallet:balance:ip:${ip}` });
  if (!rl.ok) {
    return jsonError("Too Many Requests", 429, "rate_limited", {
      retryAfterSeconds: rl.retryAfterSeconds ?? 1,
    });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return jsonError("Missing userId", 400, "invalid_payload");

  const res = await callProtectedApi(
    `/api/wallet/balance?userId=${encodeURIComponent(userId)}`,
    { method: "GET" },
    { baseUrl: url.origin }
  );

  return new Response(await res.text(), {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
