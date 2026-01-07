import { NextRequest } from "next/server";

export function requireInternalKey(req: NextRequest) {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return { ok: false, status: 500, msg: "Server misconfigured" };

  const got = req.headers.get("x-internal-key");
  if (got !== expected) return { ok: false, status: 401, msg: "Unauthorized" };

  return { ok: true as const };
}
