import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, name: true, email: true, timezone: true, marketingOptIn: true },
  });

  if (!user) {
    return jsonError("User not found", 404, "not_found");
  }

  return Response.json({
    settings: {
      displayName: user.name ?? user.email ?? user.id,
      email: user.email ?? "",
      timezone: user.timezone ?? "UTC",
      marketingOptIn: user.marketingOptIn ?? false,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const displayName =
    typeof payload.displayName === "string" ? payload.displayName.trim() : undefined;
  const email = typeof payload.email === "string" ? payload.email.trim() : undefined;
  const timezone = typeof payload.timezone === "string" ? payload.timezone.trim() : undefined;
  const marketingOptIn =
    typeof payload.marketingOptIn === "boolean" ? payload.marketingOptIn : undefined;

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      name: displayName === "" ? null : displayName,
      email: email === "" ? null : email,
      timezone,
      marketingOptIn,
    },
    select: { id: true, name: true, email: true, timezone: true, marketingOptIn: true },
  });

  return Response.json({
    settings: {
      displayName: updated.name ?? updated.email ?? updated.id,
      email: updated.email ?? "",
      timezone: updated.timezone ?? "UTC",
      marketingOptIn: updated.marketingOptIn ?? false,
    },
  });
}
