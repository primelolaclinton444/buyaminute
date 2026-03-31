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
  // - Both parties may join during "ringing" (receiver needs to join to accept,
  //   caller needs to join so they're ready when accepted).
  // - Both parties may join during "connected" (the live call state).
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

  /**
   * Identity format: "caller:<userId>" or "receiver:<userId>"
   *
   * IMPORTANT: the webhook handler's normalizePayload extracts the role from
   * the identity string using startsWith("caller") / startsWith("receiver").
   * This identity format is load-bearing — do not change it without updating
   * the webhook handler's identity parsing logic.
   */
  const identity = `${role}:${auth.user.id}`;

  const token = new AccessToken(livekit.apiKey, livekit.apiSecret, {
    identity,
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
