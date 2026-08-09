import { redirect } from "next/navigation";

/** Legacy SPCX featured-stock URL. Use a temporary redirect so stale browser/CDN 308 state is not reinforced. */
export default function LegacySpcxFeaturedResearchRedirect() {
  redirect("/markets/watchlist/spcx");
}
