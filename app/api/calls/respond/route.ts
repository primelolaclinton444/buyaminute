import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { respondToCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { requestId?: string; action?: "accept" | "decline" };
  try {
    body = (await req.json()) as { requestId?: string; action?: "accept" | "decline" };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  const requestId = body.requestId?.trim();
  const action = body.action === "accept" ? "accept" : "decline";

  if (!requestId) {
    return jsonError("Missing requestId", 400, "invalid_payload");
  }

  return respondToCall({
    requestId,
    action,
    userId: auth.user.id,
  });
}
