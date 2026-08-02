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
    if (/^https?:\/\//i.test(u)) {
      // Canonical production host — never leave www or legacy vercel.app as metadataBase.
      try {
        const parsed = new URL(u);
        if (parsed.hostname === "www.mooxintel.com") return "https://mooxintel.com";
        if (parsed.hostname.endsWith("vercel.app") && process.env.VERCEL_ENV === "production") {
          return "https://mooxintel.com";
        }
      } catch {
        /* keep u */
      }
      return u;
    }
  }
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://mooxintel.com";
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const siteConfig = {
  name: "MOOX Intelligence",
  shortName: "MOOX",
  description:
    "MOOX融合市场数据、AI分析、技术结构与六爻研究，提供日度、周度、月度市场判断及公开历史验证。",
  url: resolveSiteUrl(),
} as const;
