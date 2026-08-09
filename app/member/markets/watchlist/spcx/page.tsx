import { redirect } from "next/navigation";

/**
 * SPCX legacy compatibility route.
 * Legacy member watchlist prefix -> canonical SPCX research.
 * Keep this static route so it wins over generic [id]/[slug] pages that may return a 404.
 */
export default function SpcxCompatibilityRedirect() {
  redirect("/markets/watchlist/spcx");
}
