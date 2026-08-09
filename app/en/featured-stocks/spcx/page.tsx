import { redirect } from "next/navigation";

/** Legacy English SPCX featured-stock URL. Use a temporary redirect so stale browser/CDN 308 state is not reinforced. */
export default function LegacySpcxFeaturedResearchRedirectEn() {
  redirect("/en/markets/watchlist/spcx");
}
