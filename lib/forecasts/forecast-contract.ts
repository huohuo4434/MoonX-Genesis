import type { DailyForecast, DailyForecastMarket } from "@/types/daily-forecast";
import { formatDateChina } from "@/lib/utils/datetime";
import {
  canonicalAssetCode,
  canonicalAssetId,
  getAssetPresentation,
} from "@/lib/presentation/asset-catalog";
import {
  normalizeDailyLanguage,
  signalStrengthFromConfidence,
} from "@/lib/forecasts/daily-language";
import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";

export const FORECAST_PATH_FORBIDDEN_TERMS = [
  "妻财",
  "官鬼",
  "世爻",
  "应爻",
  "父母爻",
  "兄弟爻",
  "子孙爻",
  "月建",
  "日辰",
  "旬空",
  "入墓",
  "月破",
  "动爻",
  "变爻",
  "主卦",
  "变卦",
  "六爻",
] as const;

const PATH_SPLIT = /(?:\s*[→➡]\s*|[。；;\n]+)/;

export type ForecastCandidateSource = "STORE" | "CURATED" | "GENERATED" | "FALLBACK";

export type ForecastCandidate = {
  forecast: DailyForecast;
  source: ForecastCandidateSource;
};

function sessionCode(market: DailyForecastMarket): string {
  if (market === "crypto") return "CRYPTO";
  if (market === "us") return "US";
  if (market === "cn") return "CN";
  if (market === "hk") return "HK";
  return "COMMODITY";
}

export function forecastTargetSessionKey(forecast: Pick<DailyForecast, "market" | "forecastForDate">): string {
  return `${sessionCode(forecast.market)}-${forecast.forecastForDate}`;
}

export function forecastIdentityKey(
  forecast: Pick<DailyForecast, "assetId" | "symbol" | "market" | "forecastForDate">
): string {
  const code = canonicalAssetCode(forecast.symbol || forecast.assetId);
  return `${code}:${forecastTargetSessionKey(forecast)}`;
}

export function targetSessionLabel(
  market: DailyForecastMarket,
  dateIso: string,
  symbol?: string
): string {
  const date = formatDateChina(dateIso);
  const code = canonicalAssetCode(symbol ?? "");
  if (market === "crypto") return `${date} · 北京时间自然日`;
  if (market === "cn") return `${date} · A股交易时段`;
  if (market === "hk") return `${date} · 港股交易时段`;
  if (market === "us") return `${date} · 美股常规交易时段`;
  if (code === "GOLD") return `${date} · COMEX国际金价交易日`;
  if (code === "SILVER") return `${date} · COMEX国际银价交易日`;
  if (code === "WTI") return `${date} · NYMEX WTI近月连续合约交易日`;
  return `${date} · 商品交易时段`;
}

export function containsForecastPathMethodTerms(value: string | null | undefined): boolean {
  const text = String(value ?? "");
  return FORECAST_PATH_FORBIDDEN_TERMS.some((term) => text.includes(term));
}

/**
 * Keep the public market path free of methodology terms. Methodology belongs in
 * evidence fields; path text must describe observable market movement only.
 */
export function sanitizeForecastPathText(value: string | null | undefined): string {
  const normalized = normalizeDailyLanguage(value);
  if (!normalized) return "";
  const pieces = normalized
    .split(PATH_SPLIT)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .filter((piece) => !containsForecastPathMethodTerms(piece));
  return pieces.join(" → ");
}

export function sanitizeForecastPathList(values: string[] | null | undefined): string[] {
  const result: string[] = [];
  for (const raw of values ?? []) {
    const cleaned = sanitizeForecastPathText(raw);
    if (!cleaned) continue;
    for (const piece of cleaned.split(/\s*→\s*/).filter(Boolean)) {
      if (!result.includes(piece)) result.push(piece);
    }
  }
  return result;
}

function normalizeProbabilitySet(
  values: DailyForecast["probabilities"]
): DailyForecast["probabilities"] {
  if (!values) return undefined;
  const up = Math.max(0, Math.round(Number(values.up) || 0));
  const flat = Math.max(0, Math.round(Number(values.flat) || 0));
  const down = Math.max(0, Math.round(Number(values.down) || 0));
  const total = up + flat + down;
  if (total <= 0) return { up: 0, flat: 100, down: 0 };
  if (total === 100) return { up, flat, down };
  const nextUp = Math.round((up / total) * 100);
  const nextFlat = Math.round((flat / total) * 100);
  return { up: nextUp, flat: nextFlat, down: Math.max(0, 100 - nextUp - nextFlat) };
}

export function normalizeForecastContract(forecast: DailyForecast): DailyForecast {
  const presentation = getAssetPresentation(forecast.symbol) ?? getAssetPresentation(forecast.assetId);
  const expectedPath = sanitizeForecastPathList(forecast.expectedPath);
  const intradayRhythm = sanitizeForecastPathList(forecast.intradayRhythm);
  const pathBias =
    sanitizeForecastPathText(forecast.pathBias) ||
    intradayRhythm.join(" → ") ||
    expectedPath.join(" → ") ||
    "运行路径待技术确认";
  const confidence = Math.max(0, Math.min(100, Math.round(forecast.confidence)));
  const canonicalCode = presentation?.symbol ?? canonicalAssetCode(forecast.symbol);
  const canonicalId = presentation?.assetId ?? canonicalAssetId(forecast.assetId || forecast.symbol);
  const hasTechnicalConfirmation = Boolean(
    forecast.supportLevels?.length &&
      forecast.resistanceLevels?.length &&
      forecast.confirmation &&
      forecast.invalidation
  );

  return {
    ...forecast,
    assetId: canonicalId,
    assetName: presentation?.nameZh ?? forecast.assetName,
    symbol: canonicalCode,
    targetSessionKey: forecastTargetSessionKey(forecast),
    targetSessionLabel: targetSessionLabel(forecast.market, forecast.forecastForDate, canonicalCode),
    tradingSessionLabel: targetSessionLabel(forecast.market, forecast.forecastForDate, canonicalCode),
    directionLabel: normalizeFormalDirection(forecast.directionLabel ?? forecast.direction),
    confidence,
    probabilities: normalizeProbabilitySet(forecast.probabilities),
    expectedPath,
    intradayRhythm,
    pathBias,
    signalStrength: forecast.signalStrength ?? signalStrengthFromConfidence(confidence),
    waitForConfirmation: forecast.waitForConfirmation ?? !hasTechnicalConfirmation,
  };
}

const SOURCE_RANK: Record<ForecastCandidateSource, number> = {
  STORE: 4,
  CURATED: 3,
  GENERATED: 2,
  FALLBACK: 1,
};

const STATUS_RANK: Record<DailyForecast["status"], number> = {
  verified: 7,
  revised: 6,
  published: 5,
  expired: 4,
  reviewed: 3,
  scheduled: 2,
  draft: 1,
};

function timestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareCandidates(left: ForecastCandidate, right: ForecastCandidate): number {
  const leftForecast = left.forecast;
  const rightForecast = right.forecast;
  return (
    SOURCE_RANK[left.source] - SOURCE_RANK[right.source] ||
    leftForecast.version - rightForecast.version ||
    STATUS_RANK[leftForecast.status] - STATUS_RANK[rightForecast.status] ||
    timestamp(leftForecast.updatedAt ?? leftForecast.publishedAt) -
      timestamp(rightForecast.updatedAt ?? rightForecast.publishedAt)
  );
}

/**
 * Select one current forecast for every asset + target session. Old versions stay
 * in storage/history, but homepage/member/detail views receive one final answer.
 */
export function mergeCanonicalForecastCandidates(candidates: ForecastCandidate[]): DailyForecast[] {
  const selected = new Map<string, ForecastCandidate>();
  for (const candidate of candidates) {
    const normalized = normalizeForecastContract(candidate.forecast);
    const next = { ...candidate, forecast: normalized };
    const key = forecastIdentityKey(normalized);
    const current = selected.get(key);
    if (!current || compareCandidates(next, current) > 0) {
      if (
        current &&
        normalizeFormalDirection(current.forecast.directionLabel ?? current.forecast.direction) !==
          normalizeFormalDirection(normalized.directionLabel ?? normalized.direction)
      ) {
        console.warn(
          `[forecast-consistency] ${key} has conflicting directions; selected ${normalized.id} over ${current.forecast.id}.`
        );
      }
      selected.set(key, next);
    }
  }
  return [...selected.values()].map((entry) => entry.forecast);
}
