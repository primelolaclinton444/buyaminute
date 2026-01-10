export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  return Response.json({
    requests: [
      {
        id: "req-1001",
        caller: "dara",
        mode: "voice",
        ratePerMinute: "$3.25 / min",
        expiresAt: new Date(now + 18_000).toISOString(),
        status: "pending",
        summary: "First-time caller · Wants to talk through setup",
      },
      {
        id: "req-1002",
        caller: "maru",
        mode: "video",
        ratePerMinute: "$5.40 / min",
        expiresAt: new Date(now + 12_000).toISOString(),
        status: "pending",
        summary: "Repeat caller · Preview already used",
      },
    ],
  });
}
