// scripts/vercel-build.js
// BuyAMinute — Phase 11 Hardening
// Goal: ensure Prisma client is generated and DB schema is applied in Vercel builds.
// - Prefer migrations via `prisma migrate deploy`
// - If no migrations exist yet (repo missing prisma/migrations), fall back to `prisma db push`
//   so production isn't bricked while you bootstrap migrations.

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

try {
  // Always generate client (also runs in postinstall, but keep here for determinism)
  run("npx prisma generate");

  if (hasMigrations()) {
    run("npx prisma migrate deploy");
  } else {
    console.warn(
      "\n[warn] prisma/migrations not found. Falling back to `prisma db push`.\n" +
        "       Recommendation: run `npx prisma migrate dev --name init` locally and commit prisma/migrations."
    );
    run("npx prisma db push");
  }

  run("next build");
} catch (err) {
  console.error("\n[vercel-build] failed:", err?.message || err);
  process.exit(1);
}
