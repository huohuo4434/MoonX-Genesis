import type { XOpinionDirection } from "@/types/x-opinion-matrix";

export const X_SOURCE_SCORE_VERSION = "X_SOURCE_DIRECTION_V1";
export const X_SOURCE_MINIMUM_SAMPLES = 10;
export const X_SOURCE_VERIFIABLE_SYMBOLS = ["BTC", "ETH", "SPX", "NDX", "SHCOMP", "HSTECH", "GOLD", "SILVER", "WTI"] as const;

export type XSourceVerificationHorizon = "SHORT" | "MEDIUM" | "LONG";
export type XSourceVerificationStatus = "PENDING" | "HIT" | "PARTIAL" | "MISS" | "VOID";

export type XSourceVerificationSample = {
  id: string;
  username: string;
  postId: string;
  symbol: string;
  horizon: XSourceVerificationHorizon;
  forecastDate: string;
  lockedDirection: Exclude<XOpinionDirection, "NEUTRAL">;
  lockedConfidence: number;
  lockedAt: string;
  postedAt: string;
  status: XSourceVerificationStatus;
  actualDirection: "UP" | "DOWN" | "FLAT" | null;
  actualReturnPct: number | null;
  score: number | null;
  scoreVersion: string;
  verifiedAt: string | null;
};

export type XSourceVerificationStats = {
  username: string;
  symbol: string;
  horizon: XSourceVerificationHorizon | "ALL";
  sampleCount: number;
  hitCount: number;
  partialCount: number;
  missCount: number;
  weightedHitRatePct: number | null;
  promotionWeightPct: 0 | 1 | 2 | 3;
  maturity: "BUILDING" | "VERIFIED";
};

export function isXSourceVerifiableSymbol(value: string): boolean {
  return (X_SOURCE_VERIFIABLE_SYMBOLS as readonly string[]).includes(value.trim().toUpperCase());
}

export function canonicalXSourceActualSymbol(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/USDT$/, "");
  const aliases: Record<string, string> = {
    BITCOIN: "BTC", ETHEREUM: "ETH", QQQ: "NDX", NASDAQ100: "NDX", SPY: "SPX",
    SP500: "SPX", GSPC: "SPX", XAU: "GOLD", XAUUSD: "GOLD", GCF: "GOLD", XAG: "SILVER",
    XAGUSD: "SILVER", SIF: "SILVER", CL: "WTI", CLF: "WTI",
    SSEC: "SHCOMP", SSE: "SHCOMP", SHCOMP: "SHCOMP", "000001SS": "SHCOMP",
  };
  return aliases[normalized] ?? normalized;
}

function dateKey(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function verificationHorizon(value: unknown): XSourceVerificationHorizon {
  if (value === "INTRADAY" || value === "SHORT") return "SHORT";
  if (value === "POSITION" || value === "LONG") return "LONG";
  return "MEDIUM";
}

/** One post counts as one sample per asset. Broad ranges use their end date. */
export function selectXVerificationDate(input: {
  targetDates: readonly string[];
  horizon: XSourceVerificationHorizon;
  lockedDate: string;
}): string | null {
  const future = [...new Set(input.targetDates.map(dateKey).filter((value): value is string => Boolean(value)))]
    .filter((value) => value > input.lockedDate)
    .sort();
  if (!future.length) return null;
  return input.horizon === "SHORT" ? future[0]! : future.at(-1)!;
}

export function scoreXSourceDirection(
  predicted: Exclude<XOpinionDirection, "NEUTRAL">,
  actual: "UP" | "DOWN" | "FLAT",
): { status: Exclude<XSourceVerificationStatus, "PENDING" | "VOID">; score: 0 | 0.5 | 1 } {
  if ((predicted === "LONG" && actual === "UP") || (predicted === "SHORT" && actual === "DOWN")) {
    return { status: "HIT", score: 1 };
  }
  if (actual === "FLAT") return { status: "PARTIAL", score: 0.5 };
  return { status: "MISS", score: 0 };
}

export function xSourcePromotionWeight(sampleCount: number, weightedHitRatePct: number | null): 0 | 1 | 2 | 3 {
  if (sampleCount < X_SOURCE_MINIMUM_SAMPLES || weightedHitRatePct == null || !Number.isFinite(weightedHitRatePct)) return 0;
  if (weightedHitRatePct >= 70) return 3;
  if (weightedHitRatePct >= 65) return 2;
  if (weightedHitRatePct >= 60) return 1;
  return 0;
}

function summarize(
  rows: readonly XSourceVerificationSample[],
  username: string,
  symbol: string,
  horizon: XSourceVerificationHorizon | "ALL",
): XSourceVerificationStats {
  const completed = rows.filter((row) => row.status === "HIT" || row.status === "PARTIAL" || row.status === "MISS");
  const hitCount = completed.filter((row) => row.status === "HIT").length;
  const partialCount = completed.filter((row) => row.status === "PARTIAL").length;
  const missCount = completed.filter((row) => row.status === "MISS").length;
  const sampleCount = completed.length;
  const weightedHitRatePct = sampleCount ? Math.round(((hitCount + partialCount * 0.5) / sampleCount) * 1000) / 10 : null;
  const promotionWeightPct = xSourcePromotionWeight(sampleCount, weightedHitRatePct);
  return {
    username,
    symbol,
    horizon,
    sampleCount,
    hitCount,
    partialCount,
    missCount,
    weightedHitRatePct,
    promotionWeightPct,
    maturity: sampleCount >= X_SOURCE_MINIMUM_SAMPLES ? "VERIFIED" : "BUILDING",
  };
}

/** Build exact source+asset+horizon stats plus source+asset ALL and source ALL summaries. */
export function buildXSourceVerificationStats(rows: readonly XSourceVerificationSample[]): XSourceVerificationStats[] {
  const currentRows = rows.filter((row) => row.scoreVersion === X_SOURCE_SCORE_VERSION);
  const result: XSourceVerificationStats[] = [];
  const exact = new Map<string, XSourceVerificationSample[]>();
  for (const row of currentRows) {
    const key = `${row.username.toLowerCase()}|${row.symbol.toUpperCase()}|${row.horizon}`;
    const bucket = exact.get(key) ?? [];
    bucket.push(row);
    exact.set(key, bucket);
  }
  for (const [key, bucket] of exact) {
    const [username, symbol, horizon] = key.split("|") as [string, string, XSourceVerificationHorizon];
    result.push(summarize(bucket, username, symbol, horizon));
  }

  const assetAll = new Map<string, XSourceVerificationSample[]>();
  const sourceAll = new Map<string, XSourceVerificationSample[]>();
  for (const row of currentRows) {
    const username = row.username.toLowerCase();
    const symbol = row.symbol.toUpperCase();
    const assetKey = `${username}|${symbol}`;
    assetAll.set(assetKey, [...(assetAll.get(assetKey) ?? []), row]);
    sourceAll.set(username, [...(sourceAll.get(username) ?? []), row]);
  }
  for (const [key, bucket] of assetAll) {
    const [username, symbol] = key.split("|") as [string, string];
    result.push(summarize(bucket, username, symbol, "ALL"));
  }
  for (const [username, bucket] of sourceAll) result.push(summarize(bucket, username, "ALL", "ALL"));
  return result;
}

export function xSourceVerificationKey(username: string, symbol: string, horizon: XSourceVerificationHorizon | "ALL"): string {
  return `${username.replace(/^@/, "").trim().toLowerCase()}|${symbol.toUpperCase()}|${horizon}`;
}
