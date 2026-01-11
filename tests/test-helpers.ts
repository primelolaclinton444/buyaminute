import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, describe, it } from "node:test";

type RejectsMatcher = {
  toThrow: (message?: string | RegExp) => Promise<void>;
};

type Matchers = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toBeNull: () => void;
  toBeDefined: () => void;
  toBeGreaterThan: (expected: number) => void;
  toContain: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  rejects: RejectsMatcher;
};

export function expect(actual: unknown): Matchers {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeGreaterThan(expected) {
      assert.ok(typeof actual === "number" && actual > expected);
    },
    toContain(expected) {
      assert.ok(
        Array.isArray(actual)
          ? actual.includes(expected)
          : typeof actual === "string" && actual.includes(String(expected))
      );
    },
    toHaveLength(expected) {
      assert.ok(actual != null && "length" in Object(actual));
      assert.strictEqual((actual as { length: number }).length, expected);
    },
    rejects: {
      async toThrow(message) {
        const matcher =
          message instanceof RegExp ? message : message ? new RegExp(message) : undefined;
        await assert.rejects(Promise.resolve(actual) as Promise<unknown>, matcher);
      },
    },
  };
}

export const beforeAll = before;
export const afterAll = after;
export { beforeEach, afterEach, describe, it };
