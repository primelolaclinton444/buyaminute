// scripts/vercel-build.js
// BuyAMinute — Phase 11 Hardening
// Goal: Prisma client is generated and DB schema is applied in Vercel builds.
//
// Policy:
// - Production/Preview builds MUST use migrations (`prisma migrate deploy`).
// - `prisma db push` is NOT allowed in Vercel builds (non-deterministic).
// - Local/dev can still fall back to db push while bootstrapping.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
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

function isVercelBuild() {
  // Vercel sets these during builds
  return !!process.env.VERCEL;
}

function isProdOrPreview() {
  // "production" or "preview" are the relevant environments for deploy builds
  return (
    process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview"
  );
}

try {
  if ((isVercelBuild() || isProdOrPreview()) && !process.env.DATABASE_URL) {
    console.error(
      "\n[fatal] DATABASE_URL is not set for this Vercel build.\n" +
        "Add DATABASE_URL (and DIRECT_URL) in Vercel Project Settings.\n"
    );
    process.exit(1);
  }

  // Always generate client (postinstall also does this, but keep here for determinism)
  run("npx prisma generate");

  const migrationsPresent = hasMigrations();
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  if (migrationsPresent) {
    if (!hasDatabaseUrl && !(isVercelBuild() || isProdOrPreview())) {
      console.warn(
        "\n[warn] DATABASE_URL is not set. Skipping prisma migrate deploy for local build.\n" +
          "       Provide DATABASE_URL to run migrations locally."
      );
    } else {
      run("npx prisma migrate deploy");
    }
  } else {
    const msg =
      "\n[fatal] prisma/migrations not found.\n" +
      "        Phase 11 requires migrations committed to the repo.\n" +
      "        Fix:\n" +
      "          1) Run locally (or Codespaces): npx prisma migrate dev --name init\n" +
      "          2) Commit: prisma/migrations and prisma/migrations/migration_lock.toml\n";

    // In Vercel builds (preview/prod), we must fail fast.
    if (isVercelBuild() || isProdOrPreview()) {
      console.error(msg);
      process.exit(1);
    }

    // Local/dev fallback only (never in Vercel)
    console.warn(
      "\n[warn] prisma/migrations not found. Local fallback to `prisma db push`.\n" +
        "       " +
        msg.replace(/\n/g, "\n       ")
    );
    run("npx prisma db push");
  }

  run("next build");
} catch (err) {
  console.error("\n[vercel-build] failed:", err?.message || err);
  process.exit(1);
}
