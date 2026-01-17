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
    videoAllowed: boolean;
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

export type PublicProfileResponse = {
  ok: boolean;
  userId: string;
  earningsVisible: boolean;
  totalEarningsTokens?: number;
  minutesSold?: number;
};

export type EarningsPrivacyResponse = {
  ok: boolean;
  user: {
    id: string;
    earningsVisible: boolean;
    earningsVisibilityLockedUntil: string | null;
  };
};

export type WalletTransactionType =
  | "deposit"
  | "hold"
  | "release"
  | "call_settlement"
  | "withdrawal_request"
  | "withdrawal_paid";

export type WalletTransaction = {
  id: string;
  type: WalletTransactionType;
  amountTokens: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
};

export type WalletSummary = {
  totalTokens: number;
  availableTokens: number;
  onHoldTokens: number;
  pendingTokens: number;
  withdrawalAddressOnFile: boolean;
  latestWithdrawal: {
    status: "none" | "pending" | "sent" | "failed";
    amountTokens?: number;
    createdAt?: string;
    processedAt?: string | null;
  };
};

export type WalletDepositInfo = {
  network: string;
  address: string;
  memo: string | null;
};

export type WalletTransactionsResponse = {
  transactions: WalletTransaction[];
  nextCursor: string | null;
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
  getPublicProfile: (username: string) =>
    apiFetch<PublicProfileResponse>(
      `/api/profile/public?username=${encodeURIComponent(username)}`
    ),
};

export const userApi = {
  setEarningsPrivacy: (earningsVisible: boolean) =>
    apiFetch<EarningsPrivacyResponse>("/api/user/privacy/earnings", {
      method: "POST",
      body: JSON.stringify({ earningsVisible }),
    }),
};

export const walletApi = {
  getSummary: () => apiFetch<WalletSummary>("/api/wallet/summary"),
  getDepositInfo: () => apiFetch<WalletDepositInfo>("/api/wallet/deposit-info"),
  getTransactions: (params?: { cursor?: string | null; type?: WalletTransactionType }) => {
    const search = new URLSearchParams();
    if (params?.cursor) search.set("cursor", params.cursor);
    if (params?.type) search.set("type", params.type);
    const query = search.toString();
    return apiFetch<WalletTransactionsResponse>(
      `/api/wallet/transactions${query ? `?${query}` : ""}`
    );
  },
  withdraw: (amountTokens: number) =>
    apiFetch<{ ok: boolean; withdrawalId?: string }>("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amountTokens }),
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
