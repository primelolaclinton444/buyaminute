// FIX (Bug 4): Improved error messages so misconfigured deployments surface
// which env var is missing rather than a generic "APP_URL missing" that
// makes it hard to diagnose why the receiver dashboard / wallet / pings are
// broken in production.
export async function callProtectedApi(
  path: string,
  init: RequestInit = {},
  options: { baseUrl?: string } = {},
) {
  const base = options.baseUrl ?? process.env.APP_URL;
  const key = process.env.INTERNAL_API_KEY;

  if (!base) {
    throw new Error(
      "APP_URL environment variable is not set. " +
      "This is required for internal API calls between Next.js routes. " +
      "Set APP_URL to your deployment URL (e.g. https://yourapp.vercel.app) " +
      "or http://localhost:3000 in development."
    );
  }
  if (!key) {
    throw new Error(
      "INTERNAL_API_KEY environment variable is not set. " +
      "This is required to authenticate internal API calls between routes. " +
      "Generate a random secret and set it in your deployment environment."
    );
  }

  const url = path.startsWith("http") ? path : `${base}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "x-internal-key": key,
    },
    cache: "no-store",
  });
}
