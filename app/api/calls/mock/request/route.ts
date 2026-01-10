export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scenarios = new Set([
  "pending",
  "timeout",
  "insufficient",
  "offline",
  "accepted",
]);

export async function POST(req: Request) {
  const body = await req.json();
  const username = body.username ?? "creator-demo";
  const mode = body.mode ?? "voice";
  const scenario = scenarios.has(body.scenario) ? body.scenario : "pending";

  const requestId = `mock-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 20_000).toISOString();

  return Response.json({
    requestId,
    status: scenario,
    username,
    mode,
    expiresAt: scenario === "pending" ? expiresAt : null,
  });
}
