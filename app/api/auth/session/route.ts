import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MOCK_USER = {
  id: "user-mock-1",
  name: "Avery Expert",
  email: "avery@example.com",
};

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("mock_session");

  if (!sessionCookie) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { ...MOCK_USER, id: sessionCookie.value } });
}
