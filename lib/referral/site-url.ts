/** Production site URL helpers — safe for unit tests (no server-only). */

const CANONICAL = "https://mooxintel.com";

function canonicalizeHost(u: string): string {
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "www.mooxintel.com") return CANONICAL;
    if (parsed.hostname.endsWith("vercel.app")) return CANONICAL;
  } catch {
    /* keep */
  }
  return u;
}

/** Production site URL — never fall back to localhost or legacy vercel.app. */
export function siteBaseUrl(requestOrigin?: string | null): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    requestOrigin,
    CANONICAL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.trim().replace(/\/$/, "");
    if (!u) continue;
    if (/localhost|127\.0\.0\.1/i.test(u)) continue;
    if (/^https?:\/\//i.test(u)) return canonicalizeHost(u);
  }
  return CANONICAL;
}
