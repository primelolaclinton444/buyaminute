import Ably from "ably";

let _ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  if (_ablyRest) return _ablyRest;
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn("[ably] ABLY_API_KEY is not configured — realtime events will be skipped");
    return null;
  }
  _ablyRest = new Ably.Rest(apiKey);
  return _ablyRest;
}

// Proxy so all call sites (ablyRest.channels.get(...).publish(...)) work
// unchanged, but silently no-op when ABLY_API_KEY is absent.
export const ablyRest = new Proxy({} as Ably.Rest, {
  get(_target, prop) {
    const client = getAblyRest();
    if (!client) {
      // Return a stub that satisfies ablyRest.channels.get(name).publish(event, data)
      if (prop === "channels") {
        return {
          get: () => ({
            publish: async () => {},
          }),
        };
      }
      return () => {};
    }
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
