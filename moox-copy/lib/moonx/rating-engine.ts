/**
 * Maps a MoonX Weighted Research Score (-100…100) to a human rating label.
 * Watch / New Listing Bullish Watch are special listing-state ratings.
 */
import type { MoonXDirection, MoonXLocalizedText, MoonXRatingLabel, MoonXWatchlistSettings } from "./types";

export function scoreToRatingLabel(score: number): MoonXRatingLabel {
  if (score >= 61) return "Strong Bullish";
  if (score >= 26) return "Bullish";
  if (score >= -25) return "Neutral";
  if (score >= -60) return "Bearish";
  return "Strong Bearish";
}

export function scoreToDirection(score: number): Exclude<MoonXDirection, "watch"> {
  if (score >= 61) return "strong-bullish";
  if (score >= 26) return "bullish";
  if (score >= -25) return "neutral";
  if (score >= -60) return "bearish";
  return "strong-bearish";
}

const NEW_LISTING_BULLISH_WATCH: MoonXLocalizedText = {
  zhCN: "新上市看涨观察",
  zhTW: "新上市看漲觀察",
  en: "New Listing Bullish Watch",
};

const WATCH_LABEL: MoonXLocalizedText = {
  zhCN: "观察",
  zhTW: "觀察",
  en: "Watch",
};

/**
 * Resolve the active strategic-watchlist rating.
 * Activation rule: when listingStatus is manually changed from preIPO → listed
 * and activateOnListing is true, default rating becomes Bullish with
 * "New Listing Bullish Watch" label.
 */
export function resolveWatchlistRating(settings: MoonXWatchlistSettings): {
  rating: string;
  ratingLabel: MoonXLocalizedText;
} {
  if (settings.listingStatus === "listed" && settings.activateOnListing) {
    return {
      rating: "bullish",
      ratingLabel: settings.ratingLabel ?? NEW_LISTING_BULLISH_WATCH,
    };
  }

  if (settings.rating === "watch" || settings.listingStatus === "preIPO") {
    return {
      rating: "watch",
      ratingLabel: settings.ratingLabel ?? WATCH_LABEL,
    };
  }

  const labelMap: Record<string, MoonXLocalizedText> = {
    bullish: { zhCN: "看涨", zhTW: "看漲", en: "Bullish" },
    "strong-bullish": { zhCN: "强烈看涨", zhTW: "強烈看漲", en: "Strong Bullish" },
    neutral: { zhCN: "中性", zhTW: "中性", en: "Neutral" },
    bearish: { zhCN: "看跌", zhTW: "看跌", en: "Bearish" },
    "strong-bearish": { zhCN: "强烈看跌", zhTW: "強烈看跌", en: "Strong Bearish" },
  };

  return {
    rating: settings.rating,
    ratingLabel: settings.ratingLabel ?? labelMap[settings.rating] ?? WATCH_LABEL,
  };
}

/** Implied market cap only when price + totalShares are both available. */
export function computeImpliedMarketCap(
  price: number | null | undefined,
  totalShares: number | null | undefined
): number | null {
  if (price == null || totalShares == null || price <= 0 || totalShares <= 0) return null;
  return price * totalShares;
}
