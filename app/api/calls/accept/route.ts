// ================================
// BuyAMinute — Calls/Accept API (Secured)
// Phase 7
// ================================

import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";
import { acceptCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/accept
 * Body:
 * {
 *   callId: string
 * }
 *
 * MVP: Marks call as "connected" intent-wise.
 * Actual connection timestamps come from LiveKit webhook events.
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callId } = body;

  return acceptCall({ callId });
}
