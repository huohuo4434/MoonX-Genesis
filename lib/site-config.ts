/**
 * Single source of truth for site-wide identity (name, description, URL).
 * Reference this instead of hardcoding brand strings across metadata,
 * structured data, and UI copy so they can't drift out of sync.
 */
function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.trim().replace(/\/$/, "");
    if (!u || /localhost|127\.0\.0\.1/i.test(u)) continue;
    if (/^https?:\/\//i.test(u)) return u;
  }
  // Build-time / SSR fallback — never emit localhost in production pages.
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://moon-x-genesis.vercel.app";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const siteConfig = {
  name: "MOOX",
  description:
    "MOOX is a premium prediction intelligence platform combining forecasting frameworks, market structure, historical evidence, and verification.",
  url: resolveSiteUrl(),
} as const;
