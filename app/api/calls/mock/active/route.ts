export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "call-demo";

  return Response.json({
    call: {
      id,
      caller: "you",
      receiver: "creator-demo",
      mode: "video",
    },
  });
}
