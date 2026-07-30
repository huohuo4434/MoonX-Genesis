/**
 * Upsert published daily forecasts into moonx-data for accuracy eligibility tracking.
 * Uses service role directly (no server-only imports).
 */
import { createClient } from "@supabase/supabase-js";
import { PUBLISHED_DAILY_FORECASTS } from "../lib/data/published-daily-forecasts-20260728";
import {
  DIRECTION_LABELS,
  VERDICT_LABELS,
  type DailyAccuracyDirection,
  type DailyForecastRecord,
  type DailyVerificationResult,
} from "../types/daily-accuracy";
import { loadProductionEnv, normalizeSupabaseUrl } from "./load-env";

loadProductionEnv();

const BUCKET = "moonx-data";
const FILE = "daily-forecasts.json";
const RESULT_FILES = ["daily-verification-results.json", "daily-verifications.json"] as const;

function mapMarket(m: string): DailyForecastRecord["market"] {
  if (m === "crypto") return "CRYPTO";
  if (m === "us") return "US";
  if (m === "us_futures") return "US_FUTURES";
  if (m === "cn") return "CN";
  if (m === "hk") return "HK";
  return "US";
}

function mapDirection(label: string | undefined, fallback: string): DailyAccuracyDirection {
  const s = label ?? fallback;
  if (/观望|ABSTAIN/i.test(s)) return "FLAT";
  if (/先涨后跌|冲高回落|略微看跌|看跌|偏空|回落/.test(s)) return "DOWN";
  if (/区间震荡|震荡整理|中性|低位震荡|观望/.test(s) && !/上涨|上行|反弹/.test(s)) return "FLAT";
  if (/震荡上涨|上涨|探底回升|先跌后涨|修复|上行|宽度/.test(s)) return "UP";
  if (/跌/.test(s)) return "DOWN";
  return "FLAT";
}

function quoteSymbol(symbol: string): string {
  if (symbol === "BTC") return "BTC-USD";
  if (symbol === "NDX") return "^NDX";
  if (symbol === "SPX" || symbol === "^GSPC") return "^GSPC";
  if (symbol === "000001.SS" || symbol === "SSEC") return "000001.SS";
  if (symbol === "HSTECH") return "HSTECH.HK";
  if (symbol === "GLD" || symbol === "XAU") return "GLD";
  if (symbol === "WTI" || symbol === "CL=F") return "CL=F";
  return symbol;
}

function defaultCutoffAt(forecastDate: string, market: DailyForecastRecord["market"]): string {
  if (market === "CRYPTO") return new Date(`${forecastDate}T00:00:00+08:00`).toISOString();
  if (market === "CN" || market === "HK") return new Date(`${forecastDate}T09:30:00+08:00`).toISOString();
  if (market === "US_FUTURES") return new Date(`${forecastDate}T05:30:00+08:00`).toISOString();
  return new Date(`${forecastDate}T13:30:00.000Z`).toISOString();
}

async function main() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!url || !service) throw new Error("missing supabase admin env");

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10 * 1024 * 1024 });
  }

  let records: DailyForecastRecord[] = [];
  const { data: existing } = await admin.storage.from(BUCKET).download(FILE);
  if (existing) {
    try {
      const parsed = JSON.parse(await existing.text()) as { records?: DailyForecastRecord[] };
      records = parsed.records ?? [];
    } catch {
      records = [];
    }
  }

  let written = 0;
  for (const f of PUBLISHED_DAILY_FORECASTS) {
    const isWti = f.symbol === "WTI" || f.symbol === "CL=F";
    const market: DailyForecastRecord["market"] = isWti
      ? "US_FUTURES"
      : f.market === "commodity"
        ? "US"
        : mapMarket(f.market);
    const direction = mapDirection(f.directionLabel, f.direction);
    const eligible = f.accuracyEligible !== false;
    const symbol =
      f.symbol === "000001.SS" ? "SSEC" : f.symbol === "^GSPC" ? "SPX" : isWti ? "WTI" : f.symbol;
    const next: DailyForecastRecord = {
      id: f.id,
      forecastDate: f.forecastForDate,
      assetName: f.assetName,
      symbol,
      market,
      direction,
      directionLabel: /观望/.test(f.directionLabel ?? "") ? "观望" : DIRECTION_LABELS[direction],
      probability: f.confidence,
      summary: [f.summary, !eligible && f.accuracyExclusionReason ? f.accuracyExclusionReason : ""]
        .filter(Boolean)
        .join(" "),
      publishedAt: f.publishedAt,
      cutoffAt: defaultCutoffAt(f.forecastForDate, market),
      status: eligible ? "published" : "invalid",
      originalVersion: f.version,
      source: f.catalysts?.[0] ?? "MoonX",
      isSystemTest: false,
      quoteSymbol: quoteSymbol(f.symbol),
      createdAt: f.publishedAt,
      updatedAt: f.updatedAt ?? f.publishedAt,
      reviewedAt: f.reviewedAt ?? f.publishedAt,
    };
    const idx = records.findIndex((r) => r.id === next.id);
    if (idx >= 0) records[idx] = next;
    else records.unshift(next);
    written += 1;
  }

  // Heal legacy bad Yahoo tickers on any stored row
  for (const r of records) {
    if (r.symbol === "HSTECH" || r.quoteSymbol === "^HSTECH" || r.quoteSymbol === "HSTECH" || r.quoteSymbol === "3033.HK") {
      r.quoteSymbol = "HSTECH.HK";
      r.assetName = "恒生科技指数";
    }
  }

  const payload = {
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);

  // Ensure late/invalid publishes immediately appear as VOID on the accuracy page.
  let voidsWritten = 0;
  for (const resultFile of RESULT_FILES) {
    let results: DailyVerificationResult[] = [];
    const { data: resultData } = await admin.storage.from(BUCKET).download(resultFile);
    if (resultData) {
      try {
        const parsed = JSON.parse(await resultData.text()) as { records?: DailyVerificationResult[] };
        results = parsed.records ?? [];
      } catch {
        results = [];
      }
    }
    for (const f of records) {
      if (f.status !== "invalid") continue;
      const existing = results.find((r) => r.forecastId === f.id);
      if (existing?.verdict === "HIT" || existing?.verdict === "MISS") continue;
      const voidResult: DailyVerificationResult = {
        forecastId: f.id,
        forecastDate: f.forecastDate,
        assetName: f.assetName,
        symbol: f.symbol,
        previousClose: existing?.previousClose ?? 0,
        actualOpen: existing?.actualOpen,
        actualHigh: existing?.actualHigh,
        actualLow: existing?.actualLow,
        actualClose: existing?.actualClose ?? 0,
        actualReturnPct: existing?.actualReturnPct ?? 0,
        actualDirection: existing?.actualDirection ?? "FLAT",
        verdict: "VOID",
        verdictLabel: VERDICT_LABELS.VOID,
        verifiedAt: new Date().toISOString(),
        dataSource: existing?.dataSource ?? "calendar",
        errorMessage: "发布时间超过截止时间，不计入准确率",
        isSystemTest: f.isSystemTest,
      };
      const idx = results.findIndex((r) => r.forecastId === f.id);
      if (idx >= 0) results[idx] = voidResult;
      else results.unshift(voidResult);
      voidsWritten += 1;
    }
    const resultPayload = {
      version: 1 as const,
      updatedAt: new Date().toISOString(),
      records: results,
    };
    const resultBlob = new Blob([JSON.stringify(resultPayload, null, 2)], { type: "application/json" });
    const { error: resultError } = await admin.storage.from(BUCKET).upload(resultFile, resultBlob, {
      upsert: true,
      contentType: "application/json",
    });
    if (resultError) throw new Error(resultError.message);
  }

  console.log(JSON.stringify({ ok: true, written, total: records.length, voidsWritten }));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
