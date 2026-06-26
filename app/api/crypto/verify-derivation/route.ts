// ================================
// BuyAMinute — Derivation Verification (Guide C handshake)
// TEMPORARY: delete this route once derivation is confirmed.
// ================================
//
// Lets you confirm the server derives the SAME addresses your offline
// tool showed, WITHOUT ever pasting the xpub into a chat or the repo.
// The xpub stays in Vercel env; this route just prints the addresses.
//
// Usage:
//   GET /api/crypto/verify-derivation?count=3
//   Header: x-admin-key: <ADMIN_API_KEY>

import { requireAdminKey } from "@/lib/adminAuth";
import { jsonError } from "@/lib/api/errors";
import { deriveTronDepositAddress } from "@/lib/tron/deriveAddress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = requireAdminKey(req as any);
  if (!gate.ok) return jsonError(gate.msg, gate.status, "unauthorized");

  const url = new URL(req.url);
  const count = Math.min(
    Math.max(parseInt(url.searchParams.get("count") || "3", 10), 1),
    20
  );

  try {
    const addresses = [];
    for (let i = 0; i < count; i++) {
      addresses.push({ index: i, address: deriveTronDepositAddress(i) });
    }
    return Response.json({ ok: true, count, addresses });
  } catch (err: any) {
    return jsonError(err?.message || "derivation failed", 500, "derivation_failed");
  }
}
