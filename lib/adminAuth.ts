import { NextRequest } from "next/server";

export function requireAdminKey(req: NextRequest) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return { ok: false, status: 500, msg: "Server misconfigured" };

  const got = req.headers.get("x-admin-key");
  if (got !== expected) return { ok: false, status: 401, msg: "Unauthorized" };

  return { ok: true as const };
}
