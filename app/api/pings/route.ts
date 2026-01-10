import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

let pings = [
  {
    id: "ping-1",
    requester: "Jordan",
    topic: "Review our pricing page copy",
    status: "new",
    createdAt: "2024-05-12T15:15:00Z",
  },
  {
    id: "ping-2",
    requester: "Samira",
    topic: "Quick feedback on onboarding",
    status: "accepted",
    createdAt: "2024-05-11T09:40:00Z",
  },
  {
    id: "ping-3",
    requester: "Miguel",
    topic: "Investor update narrative",
    status: "completed",
    createdAt: "2024-05-09T18:10:00Z",
  },
];

export async function GET() {
  return NextResponse.json({ pings });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const newPing = {
    id: randomUUID(),
    requester: payload.requestedFor ?? "New requester",
    topic: payload.topic ?? "New ping",
    status: "new",
    createdAt: new Date().toISOString(),
  };
  pings = [newPing, ...pings];
  return NextResponse.json({ ping: newPing }, { status: 201 });
}
