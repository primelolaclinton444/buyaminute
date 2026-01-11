const { execSync } = require("node:child_process");
const path = require("node:path");
const Module = require("node:module");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "\n[fatal] DATABASE_URL is not set for tests.\n" +
      "Set DATABASE_URL to a Postgres test database before running tests.\n"
  );
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const resolvedPath = path.join(__dirname, "..", ".test-dist", request.slice(2));
    return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
  }
  if (request.endsWith(".css")) {
    const parentDir = parent?.filename ? path.dirname(parent.filename) : __dirname;
    const sourceDir = parentDir.replace(
      path.join(__dirname, "..", ".test-dist"),
      path.join(__dirname, "..")
    );
    const resolvedPath = path.resolve(sourceDir, request);
    return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".css"] = (module) => {
  module.exports = {};
};

execSync("npx prisma migrate reset --force --skip-generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

execSync("npx prisma generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
