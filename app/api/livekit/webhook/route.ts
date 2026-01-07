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

  // LiveKit signs webhooks. We must verify.
  const receiver = new WebhookReceiver(apiKey, apiSecret);

  try {
    // livekit-server-sdk expects headers object (plain)
    const headers = Object.fromEntries(req.headers.entries());
    const event = receiver.receive(rawBody, headers);

    // ---- MVP ADAPTER LAYER ----
    // Map LiveKit event to your simplified internal fields.
    // Adjust this mapping once you confirm exact event payloads.
    const eventName = (event as any)?.event ?? (event as any)?.name ?? "unknown";
    const roomName = (event as any)?.room?.name ?? (event as any)?.room?.sid ?? null;
    const identity = (event as any)?.participant?.identity ?? "";
    const participantRole =
      identity.includes("caller") ? "caller" : identity.includes("receiver") ? "receiver" : "unknown";

    // TODO: call your existing internal handler here:
    // await handleLivekitEvent({ event: eventName, callId: roomName, participantRole });

    console.log("[livekit] verified:", { eventName, roomName, participantRole });

    return j({ ok: true });
  } catch (err: any) {
    console.error("[livekit] invalid signature or payload:", err?.message || err);
    return j({ ok: false, error: "invalid_signature" }, 401);
  }
}
