export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  void req;
  return new Response(
    JSON.stringify({
      error: {
        code: "DEPRECATED_ENDPOINT",
        message: "This endpoint is no longer supported.",
        use: "/api/calls/respond",
      },
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json",
      },
    }
  );
}
