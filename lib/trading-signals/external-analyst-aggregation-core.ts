import { analystSourceFromUsername, parseExternalAnalystPost } from "@/lib/trading-signals/external-analyst-parser";
import type { ExternalAnalystOverlay, ExternalAnalystParsedPost, ExternalAnalystSource } from "@/types/external-analyst";
import type { ThreeHorizonDirection, ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";
import { isFormallyLockedForecast } from "@/lib/trading-signals/formal-forecast-lock-core";

export type ExternalAnalystStoredObservation = {
  source: ExternalAnalystSource | string;
  username: string;
  post_id: string;
  post_url: string;
  posted_at: Date | string;
  text: string;
  parsed: unknown;
};

const uniqueNumbers = (values: number[]) => Array.from(new Set(values.filter((v) => Number.isFinite(v) && v > 0))).sort((a, b) => a - b);
const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
const label: Record<ExternalAnalystSource, string> = { HALILUYA: "haliluya8911·短线反弹", BTCTW0: "彼得兔BTCTW0·江恩点位周期", BTCKIK: "btckik·山寨发现", MAT78704: "mat78704·方向周期共振", GENERAL_X_RESEARCH: "通用X研究" };

export function resolveFormalExternalOverlayDirection(input: {
  strategyType: ThreeHorizonStrategyType;
  nowMs: number;
  weekly: { status: string; publishedAt: string | null; lockedAt: string | null; direction: ThreeHorizonDirection } | null;
  monthly: { status: string; publishedAt: string | null; lockedAt: string | null; direction: ThreeHorizonDirection } | null;
}): ThreeHorizonDirection {
  const candidates = input.strategyType === "POSITION" ? [input.weekly, input.monthly] : [input.weekly];
  for (const leg of candidates) {
    if (!leg || !isFormallyLockedForecast({ status: leg.status, publishedAt: leg.publishedAt, lockedAt: leg.lockedAt, nowMs: input.nowMs })) continue;
    if (leg.direction === "LONG" || leg.direction === "SHORT") return leg.direction;
  }
  return "NEUTRAL";
}

function relevant(source: ExternalAnalystSource, strategyType: ThreeHorizonStrategyType): boolean {
  if (source === "GENERAL_X_RESEARCH") return false;
  if (source === "BTCKIK") return false;
  if (strategyType === "INTRADAY") return source === "HALILUYA";
  return source === "BTCTW0" || source === "MAT78704";
}

function maxAge(source: ExternalAnalystSource, strategyType: ThreeHorizonStrategyType): number {
  if (source === "HALILUYA") return strategyType === "INTRADAY" ? 72 : 120;
  if (source === "MAT78704") return strategyType === "POSITION" ? 14 * 24 : 7 * 24;
  return strategyType === "POSITION" ? 45 * 24 : 14 * 24;
}

export function buildExternalAnalystOverlayFromRows(input: {
  rows: readonly ExternalAnalystStoredObservation[];
  symbol: string;
  strategyType: ThreeHorizonStrategyType;
  nowMs: number;
}): ExternalAnalystOverlay | null {
  const posts: ExternalAnalystParsedPost[] = [];
  for (const row of input.rows) {
    const source = analystSourceFromUsername(row.username);
    // The registered username is authoritative. Historical collector rows may
    // carry the old forced BTCKIK source, so reparse their original text under
    // the username-derived source instead of trusting either stored source.
    if (!source || !relevant(source, input.strategyType)) continue;
    const postedAt = new Date(row.posted_at).getTime();
    const ageHours = (input.nowMs - postedAt) / 3_600_000;
    if (!Number.isFinite(postedAt) || ageHours < 0 || ageHours > maxAge(source, input.strategyType)) continue;
    const parsed = parseExternalAnalystPost({ source, username: row.username, postId: row.post_id, postUrl: row.post_url, postedAt: new Date(postedAt).toISOString(), text: row.text });
    if (!parsed.researchEligible || parsed.symbols.length !== 1 || parsed.symbols[0] !== input.symbol) continue;
    posts.push(parsed);
  }
  const limited = posts.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)).slice(0, 6);
  if (!limited.length) return null;
  const mat = limited.filter((post) => post.source === "MAT78704");
  const gann = limited.filter((post) => post.source === "BTCTW0");
  const directionRows = mat.length ? mat : limited.filter((post) => post.source !== "BTCTW0" || gann.length > 0);
  const directionScore = directionRows.reduce((score, post) => score + (post.direction === "LONG" ? post.confidence : post.direction === "SHORT" ? -post.confidence : 0), 0);
  const direction: ThreeHorizonDirection = directionScore > 35 ? "LONG" : directionScore < -35 ? "SHORT" : "NEUTRAL";
  return {
    symbol: input.symbol,
    strategyType: input.strategyType,
    direction,
    confidence: Math.min(80, Math.max(35, Math.round(directionRows.reduce((sum, post) => sum + post.confidence, 0) / Math.max(1, directionRows.length)))),
    supportLevels: uniqueNumbers(gann.flatMap((post) => post.supportLevels)),
    resistanceLevels: uniqueNumbers(gann.flatMap((post) => post.resistanceLevels)),
    targetLevels: uniqueNumbers(gann.flatMap((post) => post.targetLevels)),
    invalidationLevels: uniqueNumbers(gann.flatMap((post) => post.invalidationLevels)),
    timeWindows: uniqueStrings(gann.flatMap((post) => post.timeWindows)).slice(0, 8),
    sourceLabels: uniqueStrings(limited.map((post) => label[post.source])),
    sourceUrls: uniqueStrings(limited.map((post) => post.postUrl)).slice(0, 6),
    summaries: uniqueStrings(limited.map((post) => post.summary)).slice(0, 4),
    newestPostedAt: limited[0]?.postedAt ?? new Date(input.nowMs).toISOString(),
    sources: uniqueStrings(limited.map((post) => post.source)) as ExternalAnalystSource[],
    roles: uniqueStrings(limited.map((post) => post.role)) as ExternalAnalystOverlay["roles"],
    observations: limited.map((post) => ({ source: post.source, role: post.role, direction: post.direction, confidence: post.confidence, postedAt: post.postedAt })),
  };
}
