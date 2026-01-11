import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { respondToCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id?: string } }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const callId = params.id?.trim();
  if (!callId) {
    return jsonError("Missing call id", 400, "invalid_payload");
  }

  return respondToCall({ requestId: callId, action: "decline", userId: auth.user.id });
}
