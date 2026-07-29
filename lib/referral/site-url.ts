/** Production site URL helpers — safe for unit tests (no server-only). */

/** Production site URL — never fall back to localhost. */
export function siteBaseUrl(requestOrigin?: string | null): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin,
    "https://moon-x-genesis.vercel.app",
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.trim().replace(/\/$/, "");
    if (!u) continue;
    if (/localhost|127\.0\.0\.1/i.test(u)) continue;
    if (/^https?:\/\//i.test(u)) return u;
  }
  return "https://moon-x-genesis.vercel.app";
}
