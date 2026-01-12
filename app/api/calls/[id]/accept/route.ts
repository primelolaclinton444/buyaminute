export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      error: {
        code: "DEPRECATED_ENDPOINT",
        message: "This endpoint is deprecated. Use /api/calls/respond instead.",
        use: "/api/calls/respond",
      },
    },
    { status: 410 }
  );
}
