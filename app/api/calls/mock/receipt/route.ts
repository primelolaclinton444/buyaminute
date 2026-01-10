export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "call-demo";

  return Response.json({
    receipt: {
      id,
      caller: "you",
      receiver: "creator-demo",
      duration: "05:32",
      previewApplied: "00:30",
      totalCharged: "$1.82",
      refunded: "$0.45",
    },
  });
}
