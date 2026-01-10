import { NextResponse } from "next/server";

let settings = {
  displayName: "Avery Park",
  email: "avery@buyaminute.com",
  timezone: "America/Los_Angeles",
  marketingOptIn: true,
};

export async function GET() {
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const payload = await request.json();
  settings = {
    displayName: payload.displayName ?? settings.displayName,
    email: payload.email ?? settings.email,
    timezone: payload.timezone ?? settings.timezone,
    marketingOptIn: Boolean(payload.marketingOptIn),
  };

  return NextResponse.json({ settings });
}
