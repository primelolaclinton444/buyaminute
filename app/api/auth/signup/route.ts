import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string }
    | null;

  if (!body?.name || !body.email || !body.password) {
    return NextResponse.json({ error: "Missing signup fields" }, { status: 400 });
  }

  const userId = `user-${Math.random().toString(36).slice(2, 8)}`;

  cookies().set("mock_session", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({
    user: {
      id: userId,
      name: body.name,
      email: body.email,
    },
  });
}
