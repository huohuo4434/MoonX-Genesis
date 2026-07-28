/**
 * One-shot production fix: re-verify Hang Seng TECH Index with HSTECH.HK.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";
import { buildHitMissResult, buildManualReviewResult } from "../lib/verification/daily-rules";
import { resolveCanonicalQuoteSymbol, quoteSanityFailure } from "../lib/market-data/quote-symbols";
import type { DailyForecastRecord, DailyVerificationResult } from "../types/daily-accuracy";

loadProductionEnv();

const BUCKET = "moonx-data";

function admin() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !key || key === "[SENSITIVE]") throw new Error("missing supabase admin env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readRecords<T>(file: string): Promise<T[]> {
  const { data } = await admin().storage.from(BUCKET).download(file);
  if (!data) return [];
  try {
    return (JSON.parse(await data.text()) as { records?: T[] }).records ?? [];
  } catch {
    return [];
  }
}

async function writeRecords<T>(file: string, records: T[]) {
  const payload = { version: 1, updatedAt: new Date().toISOString(), records };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const { error } = await admin().storage.from(BUCKET).upload(file, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
}

async function fetchHstech(forecastDate: string) {
  const quoteSymbol = "HSTECH.HK";
  const day = new Date(`${forecastDate}T12:00:00Z`);
  const period1 = Math.floor((day.getTime() - 14 * 864e5) / 1000);
  const period2 = Math.floor((day.getTime() + 2 * 864e5) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quoteSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonX/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: {
          exchangeTimezoneName?: string;
          chartPreviousClose?: number;
          previousClose?: number;
        };
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
  if (!result?.timestamp?.length || !quote) throw new Error("empty chart");
  const tz = "Asia/Shanghai";
  const bars: Array<{ date: string; open: number; high: number; low: number; close: number }> = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(result.timestamp[i]! * 1000));
    bars.push({ date, open: o, high: h, low: l, close: c });
  }
  if (bars.length === 1) {
    const prev = result.meta?.chartPreviousClose ?? result.meta?.previousClose;
    if (typeof prev === "number" && prev > 0) {
      const cur = bars[0]!;
      const d = new Date(`${cur.date}T12:00:00+08:00`);
      d.setDate(d.getDate() - 1);
      const prevDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      bars.unshift({ date: prevDate, open: prev, high: prev, low: prev, close: prev });
    }
  }
  const current = bars.find((b) => b.date === forecastDate);
  const previous = [...bars].reverse().find((b) => b.date < forecastDate);
  if (!current || !previous) throw new Error(`missing bars for ${forecastDate}`);
  return { previous, current, quoteSymbol };
}

async function main() {
  const forecasts = await readRecords<DailyForecastRecord>("daily-forecasts.json");
  let results = await readRecords<DailyVerificationResult>("daily-verification-results.json");
  if (!results.length) results = await readRecords<DailyVerificationResult>("daily-verifications.json");

  const targets = forecasts.filter((f) => f.symbol === "HSTECH" && f.forecastDate <= "2026-07-28");
  const report: unknown[] = [];

  for (const forecast of targets) {
    forecast.quoteSymbol = resolveCanonicalQuoteSymbol(forecast.symbol, forecast.quoteSymbol);
    forecast.assetName = "恒生科技指数";
    try {
      const { previous, current, quoteSymbol } = await fetchHstech(forecast.forecastDate);
      const sanity = quoteSanityFailure({
        symbol: forecast.symbol,
        quoteSymbol,
        close: current.close,
        previousClose: previous.close,
        high: current.high,
        low: current.low,
      });
      const next = sanity
        ? buildManualReviewResult(forecast, sanity, `yahoo-finance:${quoteSymbol}`)
        : buildHitMissResult({
            record: forecast,
            previousClose: previous.close,
            actualOpen: current.open,
            actualHigh: current.high,
            actualLow: current.low,
            actualClose: current.close,
            dataSource: `yahoo-finance:${quoteSymbol}`,
          });
      const idx = results.findIndex((r) => r.forecastId === forecast.id);
      if (idx >= 0) results[idx] = next;
      else results.unshift(next);
      report.push({
        id: forecast.id,
        verdict: next.verdict,
        close: next.actualClose,
        previousClose: next.previousClose,
        returnPct: next.actualReturnPct,
        dataSource: next.dataSource,
      });
    } catch (err) {
      report.push({ id: forecast.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  await writeRecords(
    "daily-forecasts.json",
    forecasts.map((f) =>
      f.symbol === "HSTECH" ? { ...f, quoteSymbol: "HSTECH.HK", assetName: "恒生科技指数" } : f
    )
  );
  await writeRecords("daily-verification-results.json", results);
  await writeRecords("daily-verifications.json", results);
  console.log(JSON.stringify({ ok: true, report }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
