"use client";

export type AccountMe = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export type AccountCounts = {
  posts: number;
  notes: number;
  todos: number;
};

export type AccountSummary = {
  me: AccountMe | null;
  counts: AccountCounts | null;
};

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

let cached: { value: AccountSummary; ts: number } | null = null;
let inFlight: Promise<AccountSummary> | null = null;

const TTL_MS = 10_000;

export function getAccountSummary(opts?: { force?: boolean }): Promise<AccountSummary> {
  const force = Boolean(opts?.force);
  const now = Date.now();

  if (!force && cached && now - cached.ts < TTL_MS) {
    return Promise.resolve(cached.value);
  }

  if (!force && inFlight) return inFlight;

  inFlight = fetch("/api/user/account-summary", { cache: "no-store" })
    .then(async (res) => {
      const json = (await res.json()) as ApiResponse<AccountSummary>;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "LOAD_FAILED");
      const value: AccountSummary = {
        me: json?.data?.me ?? null,
        counts: json?.data?.counts ?? null,
      };
      cached = { value, ts: Date.now() };
      return value;
    })
    .catch(() => {
      const fallback: AccountSummary = { me: null, counts: null };
      cached = { value: fallback, ts: Date.now() };
      return fallback;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

