/**
 * Routes that must never be publicly crawlable or readable by non-admins.
 * Guests and members receive a standard 404.
 */
export const ADMIN_ONLY_ROUTE_PREFIXES = [
  "/research",
  "/timeline",
  "/markets/watchlist",
  "/forecasts",
  "/verification/long-term",
  "/verification/learning",
  "/member-preview",
] as const;

export function isAdminOnlyPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return ADMIN_ONLY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}
