import { requireAuth } from "@/lib/auth";
import { getIncomingCalls } from "@/lib/api/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return getIncomingCalls({ userId: auth.user.id });
}
