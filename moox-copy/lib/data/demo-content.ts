/**
 * Illustrative homepage content only.
 *
 * Every value here is fabricated for layout/design purposes — there is no
 * live market feed, forecasting engine, or research pipeline behind it.
 * Anything rendered from this file must stay visibly labeled "Demo" in
 * the UI so it can never be mistaken for real market or forecast data.
 */

export type ForecastDirection = "up" | "down" | "neutral";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DemoForecast {
  id: string;
  asset: string;
  symbol: string;
  direction: ForecastDirection;
  /** Human-readable forecast window, e.g. "Aug 1 – Oct 31, 2026". */
  windowLabel: string;
  /** 0–100 */
  confidenceScore: number;
  /** 0–100 */
  evidenceScore: number;
  /** 0–100 */
  agreementScore: number;
  riskLevel: RiskLevel;
  /** ISO date the forecast is scheduled to be verified against the outcome. */
  verificationDate: string;
}

export const demoForecasts: DemoForecast[] = [
  {
    id: "btc-2026-q3",
    asset: "Bitcoin",
    symbol: "BTC",
    direction: "up",
    windowLabel: "Aug 1 – Oct 31, 2026",
    confidenceScore: 78,
    evidenceScore: 84,
    agreementScore: 71,
    riskLevel: "medium",
    verificationDate: "2026-11-05",
  },
  {
    id: "tsla-2026-q3",
    asset: "Tesla",
    symbol: "TSLA",
    direction: "down",
    windowLabel: "Jul 15 – Sep 15, 2026",
    confidenceScore: 62,
    evidenceScore: 69,
    agreementScore: 58,
    riskLevel: "high",
    verificationDate: "2026-09-20",
  },
  {
    id: "spacex-2026-q4",
    asset: "SpaceX",
    symbol: "SPACEX",
    direction: "neutral",
    windowLabel: "Sep 1 – Dec 31, 2026",
    confidenceScore: 55,
    evidenceScore: 61,
    agreementScore: 64,
    riskLevel: "medium",
    verificationDate: "2027-01-10",
  },
];

export interface DemoResearchArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  readingTimeMinutes: number;
}

export const demoResearchArticles: DemoResearchArticle[] = [
  {
    id: "framework-divergence",
    category: "Methodology",
    title: "Why forecasting frameworks disagree — and what to do about it",
    summary:
      "A look at how MoonX reconciles conflicting signals across multiple forecasting frameworks into a single, evidence-weighted view.",
    readingTimeMinutes: 7,
  },
  {
    id: "evidence-scoring",
    category: "Evidence",
    title: "Scoring the quality of evidence, not just its quantity",
    summary:
      "Evidence score is not a vote count. Here's the structure MoonX uses to weigh source reliability, recency, and independence.",
    readingTimeMinutes: 5,
  },
  {
    id: "verification-loop",
    category: "Verification",
    title: "Closing the loop: how forecasts get graded after the fact",
    summary:
      "Every forecast on MoonX carries a verification date. This is what happens when that date arrives — and why it matters.",
    readingTimeMinutes: 6,
  },
];

export type AssetStatus = "bullish" | "neutral" | "bearish";
export type ForecastPeriod = "7 Days" | "1 Month" | "3 Months" | "Long Term";

export interface DemoAssetIntelligence {
  id: string;
  symbol: string;
  name: string;
  status: AssetStatus;
  forecastPeriod: ForecastPeriod;
  /** 0–100 */
  confidenceScore: number;
  /** 0–100 */
  evidenceScore: number;
  /** ISO date this snapshot was last refreshed. */
  lastUpdate: string;
}

export const demoAssetIntelligence: DemoAssetIntelligence[] = [
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    status: "bullish",
    forecastPeriod: "3 Months",
    confidenceScore: 72,
    evidenceScore: 68,
    lastUpdate: "2026-07-20",
  },
  {
    id: "ixic",
    symbol: "IXIC",
    name: "Nasdaq Composite",
    status: "neutral",
    forecastPeriod: "1 Month",
    confidenceScore: 58,
    evidenceScore: 61,
    lastUpdate: "2026-07-22",
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla",
    status: "bearish",
    forecastPeriod: "7 Days",
    confidenceScore: 64,
    evidenceScore: 59,
    lastUpdate: "2026-07-24",
  },
  {
    id: "spcx",
    symbol: "SPCX",
    name: "SpaceX",
    status: "bullish",
    forecastPeriod: "Long Term",
    confidenceScore: 55,
    evidenceScore: 62,
    lastUpdate: "2026-07-18",
  },
  {
    id: "xau",
    symbol: "XAU",
    name: "Gold",
    status: "neutral",
    forecastPeriod: "1 Month",
    confidenceScore: 60,
    evidenceScore: 66,
    lastUpdate: "2026-07-21",
  },
];

export interface DemoFrameworkScore {
  name: string;
  /** 0–100, rendered as a progress bar fill. */
  score: number;
}

export interface DemoForecastDetail {
  asset: string;
  symbol: string;
  timeHorizon: string;
  consensus: ForecastDirection;
  frameworks: DemoFrameworkScore[];
}

export const demoForecastDetail: DemoForecastDetail = {
  asset: "Bitcoin",
  symbol: "BTC",
  timeHorizon: "Next 3 Months",
  consensus: "up",
  frameworks: [
    { name: "Technical Structure", score: 74 },
    { name: "Cycle Analysis", score: 68 },
    { name: "Sentiment", score: 61 },
    { name: "Macro Environment", score: 55 },
  ],
};

export interface DemoAssetCategory {
  id: string;
  name: string;
  description: string;
}

export const demoAssetCategories: DemoAssetCategory[] = [
  { id: "crypto", name: "Crypto", description: "Bitcoin, Ethereum, and major digital assets." },
  { id: "us-stocks", name: "US Stocks", description: "Large-cap and growth equities listed in the US." },
  { id: "china-stocks", name: "China Stocks", description: "Mainland and Hong Kong-listed equities." },
  { id: "commodities", name: "Commodities", description: "Gold, oil, and other physical markets." },
  { id: "indexes", name: "Indexes", description: "Broad benchmarks like the Nasdaq and S&P 500." },
];

export interface DemoVerificationStep {
  id: string;
  label: string;
  description: string;
}

/** The four-stage flow shown in the "Forecast Verification" section. */
export const demoVerificationSteps: DemoVerificationStep[] = [
  {
    id: "published",
    label: "Prediction Published",
    description: "Forecast enters the system with an initial framework analysis and evidence set.",
  },
  {
    id: "movement",
    label: "Market Movement",
    description: "The market moves through the forecast window while the original claim stays locked.",
  },
  {
    id: "recorded",
    label: "Result Recorded",
    description: "The outcome is logged permanently against the forecast's original, versioned prediction.",
  },
  {
    id: "updated",
    label: "Historical Performance Updated",
    description: "The recorded result feeds into MoonX's public, auditable track record.",
  },
];
