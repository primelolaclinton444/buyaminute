export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const requestId = body.requestId ?? "unknown";
  const action = body.action === "accept" ? "accepted" : "declined";

  return Response.json({
    requestId,
    status: action,
    updatedAt: new Date().toISOString(),
  });
}
