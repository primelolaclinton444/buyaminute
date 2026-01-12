// ================================
// BuyAMinute — Calls/Create API (Secured)
// Phase 7
// ================================

import { requireInternalKey } from "@/lib/internalAuth";
import { jsonError } from "@/lib/api/errors";
import { createCall } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /calls/create
 * Body:
 * {
 *   callerId: string,
 *   receiverId: string,
 *   mode?: "voice" | "video",
 *   minIntendedSeconds?: number
 * }
 *
 * Security:
 * - rate is fetched server-side from ReceiverProfile
 * - receiver must be available
 */
export async function POST(req: Request) {
  // Phase 11 gate
  const gate = requireInternalKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json();
  const { callerId, receiverId, minIntendedSeconds, mode } = body;

  return createCall({
    callerId,
    receiverId,
    minIntendedSeconds,
    mode,
  });
}
