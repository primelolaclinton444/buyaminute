export async function callProtectedApi(path: string, init: RequestInit = {}) {
  const base = process.env.APP_URL;
  const key = process.env.INTERNAL_API_KEY;

  if (!base) throw new Error("APP_URL missing");
  if (!key) throw new Error("INTERNAL_API_KEY missing");

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
