/**
 * MoonX Featured Stocks — long-term observation list (max 5).
 * Not stock tips / call-outs. Public thesis + member forecast gates.
 */

export type FeaturedStarRating = 1 | 2 | 3 | 4 | 5;

export type FeaturedThesisScore = {
  label: string;
  stars: FeaturedStarRating;
};

export type FeaturedResearchUpdate = {
  lastUpdated: string; // YYYY-MM-DD
  researchCount: number;
  /** Display string e.g. "62%" or "样本积累中" */
  historicalAccuracyLabel: string;
};

export type FeaturedStock = {
  id: string;
  name: string;
  nameEn?: string;
  symbol: string;
  marketLabel: string;
  convictionStars: FeaturedStarRating;
  tags: string[];
  whyWatch: string[];
  thesisScores: FeaturedThesisScore[];
  catalysts: string[];
  longTermRating: string;
  ratingNote: string;
  /** Optional deep-link for members (existing member stock page). */
  memberDetailHref?: string;
  research: FeaturedResearchUpdate;
};

export type FeaturedMemberForecastLock = {
  key: string;
  labelZh: string;
  labelEn: string;
};
