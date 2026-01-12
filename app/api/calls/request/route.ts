import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { requestCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: {
    username?: string;
    mode?: "voice" | "video";
    minIntendedSeconds?: number;
  };

  try {
    body = (await req.json()) as {
      username?: string;
      mode?: "voice" | "video";
      minIntendedSeconds?: number;
    };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  return requestCall({
    userId: auth.user.id,
    username: body.username,
    mode: body.mode,
    minIntendedSeconds: body.minIntendedSeconds,
    idempotencyKey: req.headers.get("idempotency-key"),
  });
}
