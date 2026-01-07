export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { WebhookReceiver } from "livekit-server-sdk";

function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("[livekit] missing LIVEKIT_API_KEY/SECRET");
    return j({ ok: false, error: "server_misconfigured" }, 500);
  }

  const rawBody = await req.text();

  // LiveKit signs webhooks — verify signature
  const receiver = new WebhookReceiver(apiKey, apiSecret);

  try {
    // Accept common LiveKit signature headers (SDK expects a STRING)
    const auth =
      req.headers.get("authorization") ||
      req.headers.get("x-livekit-signature") ||
      req.headers.get("x-livekit-webhook-signature") ||
      "";

    if (!auth) {
      return j({ ok: false, error: "missing_signature" }, 401);
    }

    const event = receiver.receive(rawBody, auth);

    // ---- MVP ADAPTER LAYER ----
    const eventName =
      (event as any)?.event ??
      (event as any)?.name ??
      "unknown";

    const roomName =
      (event as any)?.room?.name ??
      (event as any)?.room?.sid ??
      null;

    const identity = (event as any)?.participant?.identity ?? "";

    const participantRole =
      identity.includes("caller")
        ? "caller"
        : identity.includes("receiver")
        ? "receiver"
        : "unknown";

    console.log("[livekit] verified:", {
      eventName,
      roomName,
      participantRole,
    });

    return j({ ok: true });
  } catch (err: any) {
    console.error(
      "[livekit] invalid signature or payload:",
      err?.message || err
    );
    return j({ ok: false, error: "invalid_signature" }, 401);
  }
}
