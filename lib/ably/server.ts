import Ably from "ably";

const apiKey = process.env.ABLY_API_KEY;

if (!apiKey) {
  console.warn("[ably] ABLY_API_KEY is not configured — realtime events will be skipped");
}

export const ablyRest = apiKey
  ? new Ably.Rest(apiKey)
  : {
      channels: {
        get: () => ({
          publish: async () => {},
        }),
      },
    } as unknown as Ably.Rest;
