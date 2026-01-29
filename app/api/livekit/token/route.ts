import { AccessToken } from "livekit-server-sdk";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireLiveKitConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return {
      ok: false as const,
      response: jsonError(
        "LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be configured",
        500,
        "server_error"
      ),
    };
  }

  return { ok: true as const, url, apiKey, apiSecret };
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const livekit = requireLiveKitConfig();
  if (!livekit.ok) return livekit.response;

  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) {
    return jsonError("Missing call id", 400, "invalid_payload");
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    return jsonError("Call not found", 404, "not_found");
  }

  if (call.callerId !== auth.user.id && call.receiverId !== auth.user.id) {
    return jsonError("Unauthorized", 403, "forbidden");
  }

  const joinableStatuses = new Set(["ringing", "connected"]);
  if (!joinableStatuses.has(call.status)) {
    return jsonError("Call is not joinable", 403, "call_not_joinable");
  }

  const roomName = `call_${callId}`;
  const token = new AccessToken(livekit.apiKey, livekit.apiSecret, {
    identity: auth.user.id,
    name: auth.user.name ?? auth.user.email ?? auth.user.id,
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    roomCreate: true,
    canPublish: true,
    canSubscribe: true,
  });

  return Response.json({
    token: token.toJwt(),
    url: livekit.url,
    room: roomName,
    roomName,
  });
}
