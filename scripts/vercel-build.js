// scripts/vercel-build.js
// BuyAMinute — Phase 11 Hardening
// Goal: Prisma client is generated and DB schema is applied in Vercel builds.
//
// Policy:
// - Production/Preview builds MUST use migrations (`prisma migrate deploy`).
// - `prisma db push` is NOT allowed in Vercel builds (non-deterministic).
// - Local/dev uses the same migrate deploy path (no db push fallback).

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function hasMigrations() {
  const dir = path.join(process.cwd(), "prisma", "migrations");
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.some((e) => e.isDirectory());
  } catch {
    return false;
  }
}

function withTempDatabaseUrl(tempUrl, fn) {
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = tempUrl;
  try {
    return fn();
  } finally {
    process.env.DATABASE_URL = original;
  }
}

try {
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n[fatal] DATABASE_URL is not set.\n" +
        "Set DATABASE_URL (pooler) and DIRECT_DATABASE_URL (direct) to Postgres connection strings.\n"
    );
    process.exit(1);
  }

  // Always generate client (postinstall also does this, but keep here for determinism)
  run("npx prisma generate");

  const migrationsPresent = hasMigrations();

  if (migrationsPresent) {
    // IMPORTANT: Use DIRECT_DATABASE_URL for migrations to avoid Neon pooler advisory-lock timeouts.
    const direct = process.env.DIRECT_DATABASE_URL;

    if (!direct) {
      console.error(
        "\n[fatal] DIRECT_DATABASE_URL is not set.\n" +
          "Neon pooled connections often time out acquiring Prisma migrate advisory locks.\n" +
          "Fix:\n" +
          "  1) In Neon, copy the DIRECT (non-pooler) connection string\n" +
          "  2) Set it in Vercel as DIRECT_DATABASE_URL\n"
      );
      process.exit(1);
    }

    withTempDatabaseUrl(direct, () => {
      run("npx prisma migrate deploy");
    });
  } else {
    const msg =
      "\n[fatal] prisma/migrations not found.\n" +
      "        Phase 11 requires migrations committed to the repo.\n" +
      "        Fix:\n" +
      "          1) Run locally (or Codespaces): npx prisma migrate dev --name init\n" +
      "          2) Commit: prisma/migrations and prisma/migrations/migration_lock.toml\n";

    console.error(msg);
    process.exit(1);
  }

  run("next build");
} catch (err) {
  console.error("\n[vercel-build] failed:", err?.message || err);
  process.exit(1);
}
