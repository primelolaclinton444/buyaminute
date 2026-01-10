import { NextResponse } from "next/server";

const transactions = [
  {
    id: "txn-1",
    type: "earning",
    amount: 120,
    status: "completed",
    createdAt: "2024-05-10T16:40:00Z",
  },
  {
    id: "txn-2",
    type: "deposit",
    amount: 250,
    status: "completed",
    createdAt: "2024-05-08T10:12:00Z",
  },
  {
    id: "txn-3",
    type: "withdrawal",
    amount: 90,
    status: "pending",
    createdAt: "2024-05-06T09:05:00Z",
  },
];

export async function GET() {
  return NextResponse.json({
    balanceTokens: 380,
    availableUsd: 1420,
    transactions,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.amount || Number(body.amount) <= 0) {
    return NextResponse.json({ message: "Invalid withdrawal amount." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
