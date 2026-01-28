import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { setPayoutsDisabled } from "@/lib/platformSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payouts/disable
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body: { disabled?: boolean }
 */
export async function POST(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const body = await req.json().catch(() => ({}));
  const disabled = body?.disabled === undefined ? true : Boolean(body.disabled);

  await setPayoutsDisabled(disabled);

  return Response.json({ ok: true, disabled });
}
