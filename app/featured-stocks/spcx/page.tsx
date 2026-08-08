import { permanentRedirect } from "next/navigation";

export default function LegacySpcxFeaturedResearchRedirect() {
  permanentRedirect("/markets/watchlist/spcx");
}
