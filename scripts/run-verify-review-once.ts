/**
 * Production one-shot: verify ready forecasts + generate reviews.
 * Designed to run on Vercel build with real service role (no server-only).
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";
import {
  buildHitMissResult,
  buildManualReviewResult,
  buildVoidResult,
  isPublishedBeforeCutoff,
  looksLikeFuturesRoll,
} from "../lib/verification/daily-rules";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy";
import type { DailyReviewRecord, LearningCase, PathVerdict } from "../types/automation";
import { PATH_VERDICT_LABELS } from "../types/automation";
import { buildSimilarCaseKey, inferBiasesFromMiss } from "../lib/automation/learning";
import { isSessionReadyToVerify } from "../lib/verification/session-ready";

loadProductionEnv();

const BUCKET = "moonx-data";

function admin() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !key || key === "[SENSITIVE]") throw new Error("missing supabase admin env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readRecords<T>(file: string): Promise<T[]> {
  const client = admin();
  const { data } = await client.storage.from(BUCKET).download(file);
  if (!data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as { records?: T[] };
    return parsed.records ?? [];
  } catch {
    return [];
  }
}

async function writeRecords<T extends { forecastId?: string; id?: string }>(file: string, records: T[]) {
  const client = admin();
  // Merge with remote so concurrent readers/writers cannot drop newly verified rows.
  const remote = await readRecords<T>(file);
  const merged = new Map<string, T>();
  for (const r of remote) {
    const key = (r as { forecastId?: string; id?: string }).forecastId || (r as { id?: string }).id;
    if (key) merged.set(key, r);
  }
  for (const r of records) {
    const key = r.forecastId || r.id;
    if (key) merged.set(key, r);
  }
  const next = [...merged.values()];
  const payload = { version: 1, updatedAt: new Date().toISOString(), records: next };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const { error } = await client.storage.from(BUCKET).upload(file, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
}

function barDateKey(tsSeconds: number, marketHint?: string): string {
  const d = new Date(tsSeconds * 1000);
  const tz =
    marketHint === "CN" || marketHint === "HK" || marketHint === "asia"
      ? "Asia/Shanghai"
      : "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

import { resolveCanonicalQuoteSymbol, quoteSanityFailure } from "../lib/market-data/quote-symbols";

/** Resolve Yahoo tickers for verification. */
function resolveQuoteSymbol(symbol: string, quoteSymbol: string): string {
  return resolveCanonicalQuoteSymbol(symbol, quoteSymbol);
}

async function fetchYahoo(quoteSymbol: string, forecastDate: string, marketHint?: string) {
  const day = new Date(`${forecastDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 14 * 24 * 60 * 60 * 1000) / 1000);
  const period2 = Math.floor((day.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quoteSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonX/1.0)", Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            meta?: { exchangeTimezoneName?: string };
            indicators?: {
              quote?: Array<{
                open?: (number | null)[];
                high?: (number | null)[];
                low?: (number | null)[];
                close?: (number | null)[];
              }>;
            };
          }>;
        };
      };
      const result = json.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const bars: Array<{ date: string; open: number; high: number; low: number; close: number }> = [];
      if (!result?.timestamp || !quote) return bars;
      const tzName = result.meta?.exchangeTimezoneName ?? "";
      const hint =
        marketHint ??
        (/Shanghai|Hong_Kong|Asia\/Shanghai|Asia\/Hong_Kong/i.test(tzName) ? "asia" : "UTC");
      for (let j = 0; j < result.timestamp.length; j++) {
        const open = quote.open?.[j];
        const high = quote.high?.[j];
        const low = quote.low?.[j];
        const close = quote.close?.[j];
        if (open == null || high == null || low == null || close == null) continue;
        bars.push({
          date: barDateKey(result.timestamp[j]!, hint),
          open,
          high,
          low,
          close,
        });
      }
      if (bars.length === 1) {
        const meta = result.meta as { chartPreviousClose?: number; previousClose?: number } | undefined;
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
        if (typeof prevClose === "number" && Number.isFinite(prevClose) && prevClose > 0) {
          const current = bars[0]!;
          const d = new Date(`${current.date}T12:00:00Z`);
          d.setUTCDate(d.getUTCDate() - 1);
          bars.unshift({
            date: barDateKey(Math.floor(d.getTime() / 1000), hint),
            open: prevClose,
            high: prevClose,
            low: prevClose,
            close: prevClose,
          });
        }
      }
      return bars;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function pickBars(
  bars: Array<{ date: string; open: number; high: number; low: number; close: number }>,
  forecastDate: string
) {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sorted.findIndex((b) => b.date === forecastDate);
  if (idx < 0) {
    const earlier = [...sorted].reverse().find((b) => b.date < forecastDate);
    if (earlier) return { marketClosed: true as const };
    return null;
  }
  if (idx === 0) return null;
  return { previous: sorted[idx - 1]!, current: sorted[idx]! };
}

function upsertResult(
  results: DailyVerificationResult[],
  next: DailyVerificationResult
): DailyVerificationResult[] {
  const idx = results.findIndex((r) => r.forecastId === next.forecastId);
  if (idx >= 0) {
    const copy = [...results];
    copy[idx] = next;
    return copy;
  }
  return [next, ...results];
}

async function main() {
  const now = new Date();
  let forecasts = await readRecords<DailyForecastRecord>("daily-forecasts.json");
  let results = await readRecords<DailyVerificationResult>("daily-verification-results.json");
  if (!results.length) results = await readRecords<DailyVerificationResult>("daily-verifications.json");
  const existing = new Map(results.map((r) => [r.forecastId, r]));

  let verified = 0;
  let voided = 0;
  let manual = 0;
  let skipped = 0;
  let notReady = 0;
  const details: Array<{ id: string; symbol: string; verdict: string; close?: number; quote?: string }> = [];

  for (const forecast of forecasts) {
    if (!["published", "verifying", "verified", "invalid"].includes(forecast.status)) continue;
    // Persist canonical Hang Seng TECH index ticker (never ETF 3033.HK).
    const canonicalQuote = resolveQuoteSymbol(forecast.symbol, forecast.quoteSymbol);
    if (forecast.quoteSymbol !== canonicalQuote || (forecast.symbol === "HSTECH" && forecast.assetName !== "恒生科技指数")) {
      forecast.quoteSymbol = canonicalQuote;
      if (forecast.symbol === "HSTECH") forecast.assetName = "恒生科技指数";
      forecasts = forecasts.map((f) => (f.id === forecast.id ? forecast : f));
    }
    const prior = existing.get(forecast.id);
    const badHstechScale =
      forecast.symbol === "HSTECH" &&
      !!prior &&
      ((prior.actualClose > 0 && prior.actualClose < 1000) ||
        /3033\.HK|3032\.HK/.test(prior.dataSource ?? "") ||
        (prior.previousClose > 0 && prior.previousClose < 1000));
    // Allow re-trying MANUAL_REVIEW and VOID-without-OHLC; lock HIT/MISS and completed VOID
    // Exception: HSTECH with ETF-scale closes must be re-fetched.
    if (prior && (prior.verdict === "HIT" || prior.verdict === "MISS") && !badHstechScale) {
      skipped += 1;
      continue;
    }
    if (
      prior?.verdict === "VOID" &&
      prior.actualClose > 0 &&
      !prior.errorMessage?.includes("发布时间超过截止时间") &&
      !badHstechScale
    ) {
      skipped += 1;
      continue;
    }
    // Re-verify MANUAL_REVIEW / late VOID / bad HSTECH scale that needs sample refresh
    if (prior?.verdict === "MANUAL_REVIEW" || prior?.verdict === "VOID" || badHstechScale) {
      results = results.filter((r) => r.forecastId !== forecast.id);
      existing.delete(forecast.id);
    }

    if (!isPublishedBeforeCutoff(forecast) || forecast.status === "invalid") {
      let voidResult = buildVoidResult(forecast, "发布时间超过截止时间，不计入准确率");
      // Still attach session OHLC as review sample when available (does not enter hit rate).
      try {
        if (isSessionReadyToVerify(forecast.market, forecast.forecastDate, now)) {
          const bars = await fetchYahoo(
            resolveQuoteSymbol(forecast.symbol, forecast.quoteSymbol),
            forecast.forecastDate,
            forecast.market === "CN" || forecast.market === "HK" ? forecast.market : undefined
          );
          const picked = pickBars(bars, forecast.forecastDate);
          if (picked && !("marketClosed" in picked)) {
            voidResult = {
              ...voidResult,
              previousClose: picked.previous.close,
              actualOpen: picked.current.open,
              actualHigh: picked.current.high,
              actualLow: picked.current.low,
              actualClose: picked.current.close,
              actualReturnPct: Number(
                (
                  ((picked.current.close - picked.previous.close) / picked.previous.close) *
                  100
                ).toFixed(4)
              ),
              actualDirection:
                ((picked.current.close - picked.previous.close) / picked.previous.close) * 100 > 0.1
                  ? "UP"
                  : ((picked.current.close - picked.previous.close) / picked.previous.close) * 100 < -0.1
                    ? "DOWN"
                    : "FLAT",
              dataSource: "yahoo-finance",
            };
          }
        }
      } catch {
        /* keep plain VOID */
      }
      results = upsertResult(results, voidResult);
      existing.set(forecast.id, voidResult);
      voided += 1;
      details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "VOID" });
      continue;
    }

    if (!isSessionReadyToVerify(forecast.market, forecast.forecastDate, now)) {
      notReady += 1;
      continue;
    }

    try {
      const hint = forecast.market === "CN" || forecast.market === "HK" ? forecast.market : undefined;
      const bars = await fetchYahoo(
        resolveQuoteSymbol(forecast.symbol, forecast.quoteSymbol),
        forecast.forecastDate,
        hint
      );
      const picked = pickBars(bars, forecast.forecastDate);
      if (!picked) {
        const r = buildManualReviewResult(forecast, "缺少K线", "yahoo-finance");
        results = upsertResult(results, r);
        existing.set(forecast.id, r);
        manual += 1;
        details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "MANUAL_REVIEW" });
        continue;
      }
      if ("marketClosed" in picked) {
        const r = buildVoidResult(forecast, "休市，不计入准确率", "calendar");
        results = upsertResult(results, r);
        existing.set(forecast.id, r);
        voided += 1;
        details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "VOID" });
        continue;
      }
      const quoteSym = resolveQuoteSymbol(forecast.symbol, forecast.quoteSymbol);
      const sanity = quoteSanityFailure({
        symbol: forecast.symbol,
        quoteSymbol: quoteSym,
        close: picked.current.close,
        previousClose: picked.previous.close,
        high: picked.current.high,
        low: picked.current.low,
      });
      if (sanity) {
        const r = buildManualReviewResult(forecast, sanity, `yahoo-finance:${quoteSym}`);
        results = upsertResult(results, r);
        existing.set(forecast.id, r);
        manual += 1;
        details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "MANUAL_REVIEW" });
        continue;
      }
      if (
        (forecast.symbol === "WTI" || forecast.market === "US_FUTURES") &&
        looksLikeFuturesRoll(picked.previous.close, picked.current.open, picked.current.close)
      ) {
        const r = buildManualReviewResult(forecast, "疑似连续合约换月影响", "yahoo-finance");
        results = upsertResult(results, r);
        existing.set(forecast.id, r);
        manual += 1;
        details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "MANUAL_REVIEW" });
        continue;
      }
      const result = buildHitMissResult({
        record: forecast,
        previousClose: picked.previous.close,
        actualOpen: picked.current.open,
        actualHigh: picked.current.high,
        actualLow: picked.current.low,
        actualClose: picked.current.close,
        dataSource: `yahoo-finance:${quoteSym}`,
      });
      results = upsertResult(results, result);
      existing.set(forecast.id, result);
      verified += 1;
      details.push({
        id: forecast.id,
        symbol: forecast.symbol,
        verdict: result.verdict,
        close: result.actualClose,
        quote: quoteSym,
      });
    } catch (err) {
      const r = buildManualReviewResult(
        forecast,
        err instanceof Error ? err.message : String(err),
        "unavailable"
      );
      results = upsertResult(results, r);
      existing.set(forecast.id, r);
      manual += 1;
      details.push({ id: forecast.id, symbol: forecast.symbol, verdict: "MANUAL_REVIEW" });
    }
  }

  // Guarantee every late/invalid forecast has a VOID row before persist.
  for (const forecast of forecasts) {
    if (!["published", "verifying", "verified", "invalid"].includes(forecast.status)) continue;
    if (forecast.status === "invalid" || !isPublishedBeforeCutoff(forecast)) {
      const existing = results.find((r) => r.forecastId === forecast.id);
      if (!existing || existing.verdict === "MANUAL_REVIEW") {
        results = upsertResult(
          results,
          buildVoidResult(forecast, "发布时间超过截止时间，不计入准确率")
        );
      }
    }
  }

  await writeRecords("daily-forecasts.json", forecasts);
  await writeRecords("daily-verification-results.json", results);
  await writeRecords("daily-verifications.json", results);

  let reviews = await readRecords<DailyReviewRecord>("daily-reviews.json");
  let cases = await readRecords<LearningCase>("learning-cases.json");
  const byId = new Map(forecasts.map((f) => [f.id, f]));
  let reviewsCreated = 0;

  for (const result of results) {
    if (result.verdict !== "HIT" && result.verdict !== "MISS") continue;
    if (reviews.some((r) => r.forecastId === result.forecastId)) continue;
    const forecast = byId.get(result.forecastId);
    if (!forecast) continue;
    const pathVerdict: PathVerdict = "INSUFFICIENT_DATA";
    const biases =
      result.verdict === "MISS"
        ? inferBiasesFromMiss({
            predicted: forecast.direction,
            actual: result.actualDirection,
            sourceType: forecast.source?.includes("周期") ? "cycle_derivation" : undefined,
            confidence: forecast.probability,
          })
        : [];
    const review: DailyReviewRecord = {
      id: `review-${result.forecastId}`,
      forecastId: result.forecastId,
      assetName: result.assetName,
      symbol: result.symbol,
      forecastDate: result.forecastDate,
      originalForecast: {
        direction: forecast.direction,
        directionLabel: forecast.directionLabel,
        confidence: forecast.probability,
        summary: forecast.summary,
      },
      actualResult: {
        returnPct: result.actualReturnPct,
        actualDirection: result.actualDirection,
        close: result.actualClose,
        previousClose: result.previousClose,
      },
      directionVerdict: result.verdict,
      pathVerdict,
      pathVerdictLabel: PATH_VERDICT_LABELS[pathVerdict],
      whatWasCorrect:
        result.verdict === "HIT"
          ? `方向判断${forecast.directionLabel}与收盘方向一致。`
          : "方向未命中。",
      whatWasWrong:
        result.verdict === "MISS"
          ? `收盘方向为${result.actualDirection}（${result.actualReturnPct.toFixed(2)}%）。`
          : "方向命中。",
      interpretationBiases: biases,
      marketOverrides: [],
      lessonSummary:
        result.verdict === "HIT"
          ? "保持该结构下的方向框架。"
          : biases[0]?.evidence ?? "优先检查时间拆解与旺衰解读。",
      futureCaution: "下次遇到相似结构时，不机械反向。",
      confidenceAdjustment: result.verdict === "MISS" ? -3 : 1,
      similarCaseKey: buildSimilarCaseKey({
        assetClass: forecast.market,
        horizon: "daily",
        direction: forecast.direction,
        marketRegime: pathVerdict,
        structures: biases.map((b) => b.code),
      }),
      createdAt: now.toISOString(),
    };
    reviews.unshift(review);
    cases.unshift({
      id: `case-${result.forecastId}`,
      assetClass: forecast.market,
      assetName: forecast.assetName,
      horizon: "daily",
      keyStructures: biases.map((b) => b.code),
      marketRegime: pathVerdict,
      forecastDirection: forecast.direction,
      actualDirection: result.actualDirection,
      verdict: result.verdict,
      interpretationBiases: biases,
      lessonSummary: review.lessonSummary,
      futureCaution: review.futureCaution,
      confidenceAdjustment: review.confidenceAdjustment,
      similarCaseKey: review.similarCaseKey,
      createdAt: now.toISOString(),
    });
    reviewsCreated += 1;
  }

  await writeRecords("daily-reviews.json", reviews);
  await writeRecords("learning-cases.json", cases);

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified,
        voided,
        manual,
        skipped,
        notReady,
        reviewsCreated,
        details,
        hit: results.filter((r) => r.verdict === "HIT").length,
        miss: results.filter((r) => r.verdict === "MISS").length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
