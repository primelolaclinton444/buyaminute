import { requireAuth } from "@/lib/auth";
import { getIncomingCalls } from "@/lib/api/calls";
import { dlog } from "@/lib/debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  dlog("[incoming] auth ok", { userId: auth.user.id });
  return getIncomingCalls({ userId: auth.user.id });
}
