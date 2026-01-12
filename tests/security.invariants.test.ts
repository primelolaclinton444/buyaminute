import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

type MatchReport = Record<string, string[]>;

const ROOT = path.resolve(__dirname, "..", "..");
const BANNED_TERMS = [
  "s" + "crypt",
  "crypto." + "s" + "crypt",
  "dev" + ".db",
  "s" + "qlite",
  "better-" + "s" + "qlite3",
  "s" + "qlite3",
];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", ".test-dist", ".git"]);

function shouldSkipDir(name: string) {
  return SKIP_DIRS.has(name);
}

function shouldSkipFile(filePath: string) {
  if (filePath.includes(`${path.sep}prisma${path.sep}migrations${path.sep}`)) {
    return filePath.endsWith(".sql");
  }
  return false;
}

async function walk(dir: string, onFile: (filePath: string) => Promise<void>) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      await walk(fullPath, onFile);
      continue;
    }
    if (entry.isFile()) {
      if (shouldSkipFile(fullPath)) {
        continue;
      }
      await onFile(fullPath);
    }
  }
}

async function scanForBannedTerms() {
  const matches: MatchReport = {};
  await walk(ROOT, async (filePath) => {
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      return;
    }
    const lower = content.toLowerCase();
    const hits = BANNED_TERMS.filter((term) => lower.includes(term));
    if (hits.length > 0) {
      const relative = path.relative(ROOT, filePath);
      matches[relative] = hits;
    }
  });
  return matches;
}

test("security invariants: banned terms are not present", async () => {
  const matches = await scanForBannedTerms();
  const matchEntries = Object.entries(matches);
  if (matchEntries.length > 0) {
    const details = matchEntries
      .map(([file, terms]) => `${file}: ${terms.join(", ")}`)
      .join("\n");
    assert.fail(`Banned terms found:\n${details}`);
  }
  assert.deepEqual(matches, {});
});
