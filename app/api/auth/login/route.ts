import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MOCK_USER = {
  id: "user-mock-1",
  name: "Avery Expert",
  email: "avery@example.com",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  cookies().set("mock_session", MOCK_USER.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({
    user: {
      ...MOCK_USER,
      email: body.email,
    },
  });
}
