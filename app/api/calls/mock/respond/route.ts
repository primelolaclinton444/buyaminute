import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { settleEndedCall } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { requestId?: string; action?: "accept" | "decline" };
  try {
    body = (await req.json()) as { requestId?: string; action?: "accept" | "decline" };
  } catch {
    return jsonError("Invalid JSON payload", 400, "invalid_json");
  }

  const requestId = body.requestId?.trim();
  const action = body.action === "accept" ? "accept" : "decline";

  if (!requestId) {
    return jsonError("Missing requestId", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({ where: { id: requestId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.receiverId !== auth.user.id) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  if (action === "accept") {
    if (call.status !== "ended") {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: "connected" },
      });
    }

    return Response.json({
      requestId: call.id,
      status: "accepted",
      updatedAt: new Date().toISOString(),
    });
  }

  const updated = await prisma.call.update({
    where: { id: call.id },
    data: { status: "ended", endedAt: new Date() },
  });

  await settleEndedCall(updated.id);

  return Response.json({
    requestId: call.id,
    status: "declined",
    updatedAt: updated.endedAt?.toISOString() ?? new Date().toISOString(),
  });
}
