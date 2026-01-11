// scripts/require-database-url.js
// Fail fast if DATABASE_URL is missing (Postgres-only).

if (!process.env.DATABASE_URL) {
  console.error(
    "\n[fatal] DATABASE_URL is not set.\n" +
      "Set DATABASE_URL (and DIRECT_URL if required) to a Postgres connection string.\n"
  );
  process.exit(1);
}
