export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

export type BrowseProfile = {
  id: string;
  name: string;
  username: string;
  rate: number;
  tagline: string;
  categories: string[];
  status: "available" | "busy" | "offline";
};

export type BrowseResponse = {
  categories: string[];
  featured: BrowseProfile[];
  profiles: BrowseProfile[];
};

export type ProfileResponse = {
  profile: BrowseProfile & {
    bio: string;
    responseTime: string;
    languages: string[];
    reviews: Array<{
      id: string;
      author: string;
      rating: number;
      quote: string;
    }>;
  };
};

export type WalletTransaction = {
  id: string;
  type: "deposit" | "withdrawal" | "earning";
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
};

export type WalletSummary = {
  balanceTokens: number;
  availableUsd: number;
  transactions: WalletTransaction[];
};

export type SettingsPayload = {
  displayName: string;
  email: string;
  timezone: string;
  marketingOptIn: boolean;
};

export type SettingsResponse = {
  settings: SettingsPayload;
};

export type PingRequest = {
  id: string;
  requester: string;
  topic: string;
  status: "new" | "accepted" | "missed" | "completed";
  createdAt: string;
};

export type PingsResponse = {
  pings: PingRequest[];
};

export type NewPingPayload = {
  topic: string;
  requestedFor: string;
};

export class ApiError extends Error {
  status: number;
  info?: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

async function apiFetch<T>(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === "string" && data
        ? data
        : (data as { error?: { message?: string } })?.error?.message ??
          `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const authApi = {
  getSession: () => apiFetch<AuthSession>("/api/auth/session"),
  login: (payload: LoginPayload) =>
    apiFetch<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  signup: (payload: SignupPayload) =>
    apiFetch<AuthSession>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiFetch<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    }),
};

export const browseApi = {
  getBrowse: () => apiFetch<BrowseResponse>("/api/browse"),
};

export const profileApi = {
  getProfile: (username: string) =>
    apiFetch<ProfileResponse>(`/api/profile?username=${encodeURIComponent(username)}`),
};

export const walletApi = {
  getWallet: () => apiFetch<WalletSummary>("/api/wallet"),
  withdraw: (amount: number) =>
    apiFetch<{ success: boolean }>("/api/wallet", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};

export const settingsApi = {
  getSettings: () => apiFetch<SettingsResponse>("/api/settings"),
  updateSettings: (payload: SettingsPayload) =>
    apiFetch<SettingsResponse>("/api/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const pingsApi = {
  getPings: () => apiFetch<PingsResponse>("/api/pings"),
  createPing: (payload: NewPingPayload) => {
    const idempotencyKey =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : undefined;
    return apiFetch<{ ping: PingRequest }>("/api/pings", {
      method: "POST",
      headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    });
  },
};
