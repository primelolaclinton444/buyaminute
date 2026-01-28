import { requireAuth } from "@/lib/auth";
import { ablyRest } from "@/lib/ably/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const tokenRequest = await ablyRest.auth.createTokenRequest({
    clientId: auth.user.id,
    capability: {
      [`user:${auth.user.id}`]: ["subscribe"],
      "call:*": ["subscribe"],
    },
  });

  return Response.json(tokenRequest);
}

export async function POST() {
  return GET();
}
