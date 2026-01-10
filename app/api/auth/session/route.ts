import { clearSessionCookie, getSessionUserId, getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUserId = getSessionUserId();
  if (!sessionUserId) {
    return Response.json({ user: null });
  }

  const user = await getSessionUser();
  if (!user) {
    clearSessionCookie();
    return Response.json({ user: null });
  }

  return Response.json({ user });
}
