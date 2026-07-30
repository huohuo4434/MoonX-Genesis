/**
 * Public marketing social cards for daily forecasts.
 * Never include member-only, I Ching source, weights, or detailed path fields.
 */

export type SocialCardPlatform = "x" | "telegram" | "web";

export type SocialCardStatus = "ready" | "empty" | "failed";

/** Fields allowed on a public marketing card. */
export type SocialCardPublicPayload = {
  brand: "MOOX";
  forecastDate: string;
  assetName: string;
  symbol: string;
  direction: string;
  /** Single public probability line, e.g. "上涨 48%" or "置信度 62%" */
  probability: string;
  support: string;
  resistance: string;
  /** One-line public summary — not member evidence / path detail. */
  summary: string;
};

export type SocialCardRecord = {
  id: string;
  forecastDate: string;
  assetId: string;
  forecastId?: string;
  /** Same 1200×675 asset used for X / Telegram / website. */
  platforms: SocialCardPlatform[];
  width: 1200;
  height: 675;
  payload: SocialCardPublicPayload;
  /** Relative image URL served by the OG route. */
  imageUrl: string;
  shareUrl: string;
  status: SocialCardStatus;
  createdAt: string;
  updatedAt: string;
  source: "cron" | "admin" | "on-demand";
  error?: string;
};

export type SocialCardBatch = {
  forecastDate: string;
  generatedAt: string;
  cardIds: string[];
  count: number;
};
