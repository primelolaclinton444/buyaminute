import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { getCallReceipt } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return jsonError("Missing call id", 400, "invalid_payload");
  }

  return getCallReceipt({ callId: id, userId: auth.user.id });
}
