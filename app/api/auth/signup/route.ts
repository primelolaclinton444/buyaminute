import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";
import { hasErrors, parseBody, requireEmail, requireString } from "@/lib/api/validation";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";

type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

function validateSignup(payload: unknown) {
  const errors: Record<string, string> = {};
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, errors: { body: "Request body is required." } };
  }
  const data = payload as Record<string, unknown>;
  const nameError = requireString(data.name, "name", 2);
  if (nameError) errors.name = nameError;
  const emailError = requireEmail(data.email, "email");
  if (emailError) errors.email = emailError;
  const passwordError = requireString(data.password, "password");
  if (passwordError) errors.password = passwordError;
  if (hasErrors(errors)) {
    return { ok: false as const, errors };
  }
  return {
    ok: true as const,
    data: {
      name: data.name as string,
      email: data.email as string,
      password: data.password as string,
    },
  };
}

export async function POST(req: Request) {
  const parsed = await parseBody<SignupPayload>(req, validateSignup);
  if (parsed.ok === false) {
    return jsonError("Invalid signup payload", 400, "invalid_payload", parsed.errors);
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already in use", 409, "email_taken");
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
    await tx.wallet.create({
      data: { userId: created.id, balanceTokens: 0 },
    });
    return created;
  });

  const token = createSessionToken(user.id);
  setSessionCookie(token);

  return Response.json({ user });
}
