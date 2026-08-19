"use client";

// MOOX_V7208_SESSION_LITE_DEDUPE

export const SESSION_LITE_CACHE_KEY = "moox_nav_session_v2";
const CACHE_TTL_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4_000;

export type SessionLite = {
  authenticated: boolean;
  email: string | null;
  isAdmin: boolean;
  isActiveMember: boolean;
  cachedAt: number;
};

let memoryCache: SessionLite | null = null;
let inflight: Promise<SessionLite> | null = null;

function normalize(payload: unknown): Omit<SessionLite, "cachedAt"> {
  const row = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const authenticated = row.authenticated === true;
  return {
    authenticated,
    email: authenticated && typeof row.email === "string" ? row.email : null,
    isAdmin: authenticated && row.isAdmin === true,
    isActiveMember: authenticated && row.isActiveMember === true,
  };
}

function validCached(value: unknown): SessionLite | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<SessionLite>;
  if (
    typeof row.cachedAt !== "number" ||
    typeof row.authenticated !== "boolean" ||
    typeof row.isAdmin !== "boolean" ||
    typeof row.isActiveMember !== "boolean" ||
    (row.email !== null && typeof row.email !== "string")
  ) return null;
  return {
    cachedAt: row.cachedAt,
    authenticated: row.authenticated,
    email: row.email ?? null,
    isAdmin: row.isAdmin,
    isActiveMember: row.isActiveMember,
  };
}

export function peekSessionLite(): SessionLite | null {
  if (memoryCache) return memoryCache;
  try {
    const raw = window.sessionStorage.getItem(SESSION_LITE_CACHE_KEY);
    if (!raw) return null;
    const parsed = validCached(JSON.parse(raw));
    if (!parsed || Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(SESSION_LITE_CACHE_KEY);
      return null;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function remember(session: SessionLite): SessionLite {
  memoryCache = session;
  try {
    window.sessionStorage.setItem(SESSION_LITE_CACHE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage may be unavailable in privacy mode.
  }
  return session;
}

export async function loadSessionLite(maxAgeMs = 30_000): Promise<SessionLite> {
  const cached = peekSessionLite();
  if (cached && Date.now() - cached.cachedAt <= maxAgeMs) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/auth/session-lite", {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("session-lite unavailable");
      const next = normalize(await response.json());
      return remember({ ...next, cachedAt: Date.now() });
    } catch {
      if (cached) return cached;
      return remember({ authenticated: false, email: null, isAdmin: false, isActiveMember: false, cachedAt: Date.now() });
    } finally {
      window.clearTimeout(timer);
      inflight = null;
    }
  })();

  return inflight;
}

export function clearSessionLite(): void {
  memoryCache = null;
  inflight = null;
  try {
    window.sessionStorage.removeItem(SESSION_LITE_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
