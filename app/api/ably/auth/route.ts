import { requireAuth } from "@/lib/auth";
import { ablyRest } from "@/lib/ably/server";
import { dlog } from "@/lib/debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const capability = JSON.stringify({
    [`user:${auth.user.id}`]: ["subscribe"],
    "call:*": ["subscribe"],
  });

  dlog("[ably-auth] user", { userId: auth.user.id });
  dlog("[ably-auth] capability", capability);

  const tokenRequest = await ablyRest.auth.createTokenRequest({
    clientId: auth.user.id,
    capability,
  });

  return Response.json(tokenRequest);
}

export async function POST() {
  return GET();
}
