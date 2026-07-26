/**
 * Single source of truth for site-wide identity (name, description, URL).
 * Reference this instead of hardcoding brand strings across metadata,
 * structured data, and UI copy so they can't drift out of sync.
 */
export const siteConfig = {
  name: "MoonX",
  description:
    "MoonX is a premium prediction intelligence platform combining forecasting frameworks, market structure, historical evidence, and verification.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
