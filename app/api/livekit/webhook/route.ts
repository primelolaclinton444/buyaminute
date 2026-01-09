export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { consumePreview, hasActivePreviewLock } from "@/lib/previewLock";
import { settleEndedCall } from "@/lib/settlement";

function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalizePayload(payload: any) {
  const eventName =
    payload?.event ??
    payload?.name ??
    "unknown";

  const callId =
    payload?.callId ??
    payload?.room?.name ??
    payload?.room?.sid ??
    null;

  const participantRole =
    payload?.participantRole ??
    (payload?.participant?.identity?.includes("caller")
      ? "caller"
      : payload?.participant?.identity?.includes("receiver")
      ? "receiver"
      : "unknown");

  return { eventName, callId, participantRole };
}

async function handleParticipantConnected(callId: string, participantRole: string) {
  const now = new Date();

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { participants: true },
  });

  if (!call || call.status === "ended") return;

  if (!call.participants) {
    await prisma.callParticipant.create({
      data: { callId },
    });
  }

  if (participantRole === "caller") {
    await prisma.callParticipant.update({
      where: { callId },
      data: { callerConnectedAt: call.participants?.callerConnectedAt ?? now },
    });
  } else if (participantRole === "receiver") {
    await prisma.callParticipant.update({
      where: { callId },
      data: { receiverConnectedAt: call.participants?.receiverConnectedAt ?? now },
    });
  } else {
    return;
  }

  const updated = await prisma.callParticipant.findUnique({
    where: { callId },
  });

  if (
    updated?.callerConnectedAt &&
    updated?.receiverConnectedAt &&
    !updated?.bothConnectedAt
  ) {
    await prisma.callParticipant.update({
      where: { callId },
      data: { bothConnectedAt: now },
    });

    const hasLock = await hasActivePreviewLock({
      callerId: call.callerId,
      receiverId: call.receiverId,
    });

    const previewApplied = !hasLock;

    await prisma.call.update({
      where: { id: callId },
      data: {
        status: "connected",
        previewApplied,
      },
    });

    if (previewApplied) {
      await consumePreview({
        callerId: call.callerId,
        receiverId: call.receiverId,
      });
    }
  } else {
    await prisma.call.update({
      where: { id: callId },
      data: { status: "connected" },
    });
  }
}

async function handleParticipantDisconnected(callId: string) {
  const updated = await prisma.call.updateMany({
    where: { id: callId, status: { not: "ended" } },
    data: { status: "ended", endedAt: new Date() },
  });

  if (updated.count === 0) return;

  await settleEndedCall(callId);
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  try {
    let payload: any = null;

    if (apiKey && apiSecret) {
      const rawBody = await req.text();
      const receiver = new WebhookReceiver(apiKey, apiSecret);

      // Accept common LiveKit signature headers (SDK expects a STRING)
      const auth =
        req.headers.get("authorization") ||
        req.headers.get("x-livekit-signature") ||
        req.headers.get("x-livekit-webhook-signature") ||
        "";

      if (!auth) {
        return j({ ok: false, error: "missing_signature" }, 401);
      }

      payload = receiver.receive(rawBody, auth);
    } else {
      payload = await req.json();
    }

    const { eventName, callId, participantRole } = normalizePayload(payload);

    console.log("[livekit] verified:", {
      eventName,
      callId,
      participantRole,
    });

    if (!callId) {
      return j({ ok: false, error: "missing_call_id" }, 400);
    }

    if (eventName === "participant_connected") {
      await handleParticipantConnected(callId, participantRole);
    }

    if (eventName === "participant_disconnected") {
      await handleParticipantDisconnected(callId);
    }

    return j({ ok: true });
  } catch (err: any) {
    console.error(
      "[livekit] invalid signature or payload:",
      err?.message || err
    );
    return j({ ok: false, error: "invalid_signature" }, 401);
  }
}
