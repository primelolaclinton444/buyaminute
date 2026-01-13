import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { hasErrors, parseBody, requireEmail, requireString } from "@/lib/api/validation";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

type LoginPayload = {
  email: string;
  password: string;
};

function validateLogin(payload: unknown) {
  const errors: Record<string, string> = {};
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, errors: { body: "Request body is required." } };
  }
  const data = payload as Record<string, unknown>;
  const emailError = requireEmail(data.email, "email");
  if (emailError) errors.email = emailError;
  const passwordError = requireString(data.password, "password");
  if (passwordError) errors.password = passwordError;
  if (hasErrors(errors)) {
    return { ok: false as const, errors };
  }
  return { ok: true as const, data: { email: data.email as string, password: data.password as string } };
}

export async function POST(req: Request) {
  const parsed = await parseBody<LoginPayload>(req, validateLogin);
  if (parsed.ok === false) {
    return jsonError("Invalid login payload", 400, "invalid_payload", parsed.errors);
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return jsonError("Invalid email or password", 401, "invalid_credentials");
  }

  const matches = verifyPassword(password, user.passwordHash);
  if (!matches) {
    return jsonError("Invalid email or password", 401, "invalid_credentials");
  }

  try {
    const token = createSessionToken(user.id);
    setSessionCookie(token);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create session.",
      500,
      "auth_session_error"
    );
  }

  return Response.json({
    user: {
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? email,
    },
  });
}
