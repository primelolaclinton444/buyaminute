import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(20, "60 s"),
        analytics: true,
      })
    : null;

export async function rateLimitOrPass(params: {
  key: string;
}): Promise<{ ok: boolean; retryAfterSeconds?: number }> {
  if (!ratelimit) return { ok: true };

  const r = await ratelimit.limit(params.key);
  if (r.success) return { ok: true };

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((r.reset - Date.now()) / 1000)
  );
  return { ok: false, retryAfterSeconds };
}

export function getClientIp(req: Request): string {
  const xfwd = req.headers.get("x-forwarded-for");
  if (!xfwd) return "unknown";
  return xfwd.split(",")[0]?.trim() || "unknown";
}
