import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_INVITE_LIMIT = 5;
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_TOKEN_ATTEMPTS = 5;

const generateToken = () => randomBytes(16).toString("base64url");

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError("DATABASE_URL is not configured", 500, "missing_database_url");
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const now = new Date();
    const activeCount = await prisma.invite.count({
      where: {
        inviterUserId: auth.user.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (activeCount >= ACTIVE_INVITE_LIMIT) {
      return jsonError("Invite limit reached", 429, "invite_limit");
    }

    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    let created = null as null | { token: string };

    for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
      const token = generateToken();
      try {
        created = await prisma.invite.create({
          data: {
            token,
            inviterUserId: auth.user.id,
            expiresAt,
          },
          select: { token: true },
        });
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          continue;
        }
        throw err;
      }
    }

    if (!created) {
      return jsonError("Unable to create invite link", 500, "invite_create_failed");
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const inviteUrl = `${origin}/i/${created.token}`;

    return Response.json({ inviteUrl, token: created.token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create invite link";
    return jsonError(message, 500, "invite_create_failed");
  }
}
