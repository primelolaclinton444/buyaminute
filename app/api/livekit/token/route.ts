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

  const isCaller = call.callerId === auth.user.id;
  const isReceiver = call.receiverId === auth.user.id;
  const debugDetails =
    process.env.NODE_ENV !== "production"
      ? {
          sessionUserId: auth.user.id,
          callerId: call.callerId,
          receiverId: call.receiverId,
          status: call.status,
          callId: call.id,
        }
      : undefined;

  if (!isCaller && !isReceiver) {
    return jsonError("Unauthorized", 403, "forbidden", debugDetails);
  }

  // Join policy:
  // - Receiver may join during "ringing" (to pick up / connect).
  // - Caller may join during "ringing" so they can connect immediately after acceptance,
  //   and stay connected through "connected".
  const joinableStatuses = new Set(["ringing", "connected"]);
  if (!joinableStatuses.has(call.status)) {
    return jsonError(
      `Call is not joinable (status=${call.status})`,
      403,
      "call_not_joinable",
      debugDetails
    );
  }

  const roomName = `call_${callId}`;

  const role = isCaller ? "caller" : "receiver";
  const token = new AccessToken(livekit.apiKey, livekit.apiSecret, {
    identity: `${role}:${auth.user.id}`,
    name: auth.user.name ?? auth.user.email ?? auth.user.id,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    roomCreate: true,
    canPublish: true,
    canSubscribe: true,
  });

  const tokenJwt = await token.toJwt();

  return Response.json({
    token: tokenJwt,
    url: livekit.url,
    room: roomName,
    roomName,
    role,
    callStatus: call.status,
  });
}
