import { callProtectedApi } from "@/lib/internalCall";
import { getClientIp, rateLimitOrPass } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const rl = await rateLimitOrPass({
    key: `ui:calls:accept:ip:${ip}`,
  });
  if (!rl.ok) {
    return jsonError("Too Many Requests", 429, "rate_limited", {
      retryAfterSeconds: rl.retryAfterSeconds ?? 1,
    });
  }

  const body = await req.text();

  const res = await callProtectedApi(
    "/api/calls/accept",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    },
    { baseUrl: new URL(req.url).origin },
  );

  return new Response(await res.text(), {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
