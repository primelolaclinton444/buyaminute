import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { argon2id } from "@noble/hashes/argon2";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/errors";

const SESSION_COOKIE_NAME = "bam_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type SessionPayload = {
  uid: string;
  exp: number;
};

const PASSWORD_SALT_LENGTH = 16;
const PASSWORD_HASH_LENGTH = 32;
const ARGON2_VERSION = 19;
const ARGON2_MEMORY_KIB = 16384;
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 1;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET is not configured");
  }
  return "dev-insecure-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string) {
  const parsed = Buffer.from(encoded, "base64url").toString("utf8");
  return JSON.parse(parsed) as SessionPayload;
}

function isSignatureValid(encoded: string, signature: string) {
  const expected = signPayload(encoded);
  if (expected.length !== signature.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function createSessionToken(userId: string) {
  const payload: SessionPayload = {
    uid: userId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = encodePayload(payload);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionUserId() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  const [encoded, signature] = sessionCookie.value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  if (!isSignatureValid(encoded, signature)) {
    return null;
  }

  try {
    const payload = decodePayload(encoded);
    if (!payload?.uid || Date.now() > payload.exp) {
      return null;
    }
    return payload.uid;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const userId = getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, response: jsonError("Unauthorized", 401, "unauthorized") };
  }
  return { ok: true as const, user };
}

export function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_LENGTH);
  const hash = argon2id(password, salt, {
    m: ARGON2_MEMORY_KIB,
    t: ARGON2_ITERATIONS,
    p: ARGON2_PARALLELISM,
    dkLen: PASSWORD_HASH_LENGTH,
    version: ARGON2_VERSION,
  });
  const saltEncoded = Buffer.from(salt).toString("base64");
  const hashEncoded = Buffer.from(hash).toString("base64");
  return `$argon2id$v=${ARGON2_VERSION}$m=${ARGON2_MEMORY_KIB},t=${ARGON2_ITERATIONS},p=${ARGON2_PARALLELISM}$${saltEncoded}$${hashEncoded}`;
}

export function verifyPassword(password: string, stored: string) {
  const match = stored.match(
    /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/
  );
  if (!match) {
    return false;
  }
  const [, versionRaw, memoryRaw, iterationsRaw, parallelismRaw, saltEncoded, hashEncoded] = match;
  const version = Number(versionRaw);
  const memory = Number(memoryRaw);
  const iterations = Number(iterationsRaw);
  const parallelism = Number(parallelismRaw);
  if (
    !Number.isFinite(version) ||
    !Number.isFinite(memory) ||
    !Number.isFinite(iterations) ||
    !Number.isFinite(parallelism) ||
    version <= 0 ||
    memory <= 0 ||
    iterations <= 0 ||
    parallelism <= 0
  ) {
    return false;
  }
  const salt = Buffer.from(saltEncoded, "base64");
  const storedHash = Buffer.from(hashEncoded, "base64");
  if (!salt.length || !storedHash.length) {
    return false;
  }
  const derived = argon2id(password, salt, {
    m: memory,
    t: iterations,
    p: parallelism,
    dkLen: storedHash.length,
    version,
  });
  if (storedHash.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(storedHash), Buffer.from(derived));
}
