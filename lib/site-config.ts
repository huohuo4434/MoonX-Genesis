function resolveSiteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL];
  for (const raw of candidates) {
    if (!raw) continue;
    const value = raw.trim().replace(/\/$/, "");
    if (!value || /localhost|127\.0\.0\.1/i.test(value)) continue;
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        if (parsed.hostname === "www.mooxintel.com") return "https://mooxintel.com";
        if (parsed.hostname.endsWith("vercel.app") && process.env.VERCEL_ENV === "production") return "https://mooxintel.com";
      } catch { /* keep value */ }
      return value;
    }
  }
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") return "https://mooxintel.com";
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const siteConfig = {
  name: "MOOX Intelligence",
  shortName: "MOOX",
  description: "先判方向，再等确认。MOOX并列研究六爻与奇门方向，以共振或分歧校准信心，再结合技术结构与公开验证提供可追溯的市场情景判断。",
  url: resolveSiteUrl(),
  supportEmail: process.env.MOOX_SUPPORT_EMAIL?.trim() || "jackzwin999@gmail.com",
  billingEmail: process.env.MOOX_BILLING_EMAIL?.trim() || "jackzwin999@gmail.com",
  privacyEmail: process.env.MOOX_PRIVACY_EMAIL?.trim() || "jackzwin999@gmail.com",
  telegram: "@jackuwin",
  orderPrefix: "MOOX",
} as const;
