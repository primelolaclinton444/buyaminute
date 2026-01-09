import { callProtectedApi } from "@/lib/internalCall";
import { getClientIp, rateLimitOrPass } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimitOrPass({ key: `ui:availability:ping:ip:${ip}` });
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "retry-after": String(rl.retryAfterSeconds ?? 1) },
    });
  }

  const body = await req.text();

  const res = await callProtectedApi(
    "/api/availability/ping",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    },
    { baseUrl: new URL(req.url).origin },
  );

  return new Response(await res.text(), { status: res.status });
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimitOrPass({ key: `ui:availability:ping:get:ip:${ip}` });
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "retry-after": String(rl.retryAfterSeconds ?? 1) },
    });
  }

  const { search } = new URL(req.url);
  const res = await callProtectedApi(
    `/api/availability/ping${search}`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
    },
    { baseUrl: new URL(req.url).origin },
  );

  return new Response(await res.text(), { status: res.status });
}
