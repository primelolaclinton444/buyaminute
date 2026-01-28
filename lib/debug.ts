export const debugOn = process.env.DEBUG_ABLY === "1";

export function dlog(...args: unknown[]) {
  if (!debugOn) return;
  console.log(...args);
}
