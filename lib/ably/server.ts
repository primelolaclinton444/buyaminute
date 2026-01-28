import Ably from "ably";

const apiKey = process.env.ABLY_API_KEY;

if (!apiKey) {
  throw new Error("ABLY_API_KEY is not configured");
}

export const ablyRest = new Ably.Rest(apiKey);
