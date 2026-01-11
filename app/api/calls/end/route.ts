// ================================
// BuyAMinute — Calls/End API (Secured)
// Phase 7
// ================================

import { requireInternalKey } from "@/lib/internalAuth";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { endCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/end
 * Body:
 * {
 *   callId: string,
 *   endedBy?: "caller" | "receiver" | "system"
 * }
 *
 * Rules:
 * - Ending stops billing immediately (we end the call server-side).
 * - Settlement happens after end.
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  const session = gate.ok ? null : await requireAuth();
  if (!gate.ok && !session.ok) {
    if (gate.status === 500) {
      return jsonError(gate.msg, gate.status, "server_error");
    }
    return session.response;
  }

  const body = await req.json();
  const { callId } = body ?? {};

  if (!callId) {
    return jsonError("Invalid payload", 400, "invalid_payload");
  }

  return endCall({ callId, userId: session?.user.id });
}
