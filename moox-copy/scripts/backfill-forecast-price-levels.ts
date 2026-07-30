/**
 * Backfill concrete locked price levels into published daily/weekly/stock seeds.
 * Fetches live market data — never invents prices.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  buildLockedLevelsForAsset,
  buildPriceLevelTexts,
  fetchBtcBeijingDayOhlc,
  fetchPreviousSessionOhlc,
  formatAssetPrice,
  type PriceLevelTexts,
} from "../lib/market-data/price-levels";
import { PUBLISHED_DAILY_FORECASTS } from "../lib/data/published-daily-forecasts-20260728";
import { PUBLISHED_WEEKLY_ANALYSES, INTERNAL_WEEKLY_ANALYSES } from "../lib/data/published-weekly-analysis-20260727";
import {
  CHANGXIN_DAILY_FORECASTS,
  CHANGXIN_WEEKLY_ANALYSES,
} from "../lib/data/member-stocks/changxin-688825";

type QuoteMap = Record<string, { quote: string; market: "CRYPTO" | "US" | "CN" | "HK" | "US_FUTURES" }>;

const QUOTES: QuoteMap = {
  BTC: { quote: "BTC-USD", market: "CRYPTO" },
  NDX: { quote: "^NDX", market: "US" },
  "000001.SS": { quote: "000001.SS", market: "CN" },
  HSTECH: { quote: "HSTECH.HK", market: "HK" },
  GLD: { quote: "GLD", market: "US" },
  SPX: { quote: "^GSPC", market: "US" },
  WTI: { quote: "CL=F", market: "US_FUTURES" },
  "688825": { quote: "688825.SS", market: "CN" },
};

function marketOf(symbol: string) {
  return QUOTES[symbol]?.market ?? "US";
}
function quoteOf(symbol: string) {
  return QUOTES[symbol]?.quote ?? symbol;
}

async function levelsFor(
  symbol: string,
  assetName: string,
  directionLabel: string,
  forecastDate: string,
  publishedAt: string
): Promise<PriceLevelTexts | { error: string }> {
  try {
    return await buildLockedLevelsForAsset({
      symbol,
      quoteSymbol: quoteOf(symbol),
      market: marketOf(symbol),
      assetName,
      directionLabel,
      forecastDate,
      publishedAt,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const report: Record<string, unknown> = {
    btcJul27: null as unknown,
    fuzzyFixed: 0,
    failed: [] as string[],
    updatedDaily: [] as string[],
    updatedWeekly: [] as string[],
    updatedStock: [] as string[],
  };

  // BTC Jul 27 Beijing truth
  const btcDay = await fetchBtcBeijingDayOhlc("2026-07-27");
  const hi = formatAssetPrice(btcDay.high, "BTC");
  const lo = formatAssetPrice(btcDay.low, "BTC");
  report.btcJul27 = {
    highRaw: btcDay.high,
    lowRaw: btcDay.low,
    highDisplay: hi.display,
    lowDisplay: lo.display,
    closeRaw: btcDay.close,
    dataSource: btcDay.dataSource,
    barCount: btcDay.barCount,
  };

  // —— Daily forecasts ——
  const dailyOut = [];
  for (const f of PUBLISHED_DAILY_FORECASTS) {
    const lv = await levelsFor(
      f.symbol,
      f.assetName,
      f.directionLabel ?? f.direction,
      f.forecastForDate,
      f.publishedAt
    );
    if ("error" in lv) {
      (report.failed as string[]).push(`${f.id}: ${lv.error}`);
      dailyOut.push({
        ...f,
        supportLevels: f.supportLevels?.length
          ? f.supportLevels
          : ["该条历史预测未保存具体价格，不补录事后价位。"],
        resistanceLevels: f.resistanceLevels?.length
          ? f.resistanceLevels
          : ["该条历史预测未保存具体价格，不补录事后价位。"],
        invalidation: f.invalidation?.includes("未保存具体价格")
          ? f.invalidation
          : `该条历史预测未保存具体价格，不补录事后价位。原表述已停用。`,
        priceLevelsMissing: true,
      });
      continue;
    }
    (report.fuzzyFixed as number) += 1;
    (report.updatedDaily as string[]).push(f.id);
    dailyOut.push({
      ...f,
      supportLevels: lv.supportLevels,
      resistanceLevels: lv.resistanceLevels,
      invalidation: lv.invalidation,
      confirmation: lv.confirmation,
      priceSnapshot: lv.priceSnapshot,
      priceDataSourceLabel: lv.priceDataSourceLabel,
      priceSnapshotAtLabel: lv.priceSnapshotAtLabel,
    });
  }

  // —— Weekly published ——
  const weeklyOut = [];
  for (const w of PUBLISHED_WEEKLY_ANALYSES) {
    const lv = await levelsFor(
      w.symbol,
      w.assetName,
      w.overallDirection,
      w.weekStart,
      w.publishedAt
    );
    if ("error" in lv) {
      (report.failed as string[]).push(`${w.id}: ${lv.error}`);
      weeklyOut.push({
        ...w,
        keySupport: w.keySupport?.length
          ? w.keySupport.map((x) => (/^\d/.test(x) ? x : "该条历史预测未保存具体价格，不补录事后价位。"))
          : ["该条历史预测未保存具体价格，不补录事后价位。"],
        keyResistance: w.keyResistance?.length
          ? w.keyResistance
          : ["该条历史预测未保存具体价格，不补录事后价位。"],
        invalidation: `若价格跌破发布时锁定的关键支撑，并且确认周期收盘仍低于该价位，则${w.overallDirection}判断失效。若历史记录未锁定数字价位：不补录事后价位。`,
      });
      continue;
    }
    (report.fuzzyFixed as number) += 1;
    (report.updatedWeekly as string[]).push(w.id);
    // Prefer prior-day levels as primary; keep secondary numeric if already concrete
    weeklyOut.push({
      ...w,
      keySupport: [lv.supportLevels[0]!],
      keyResistance: [lv.resistanceLevels[0]!],
      invalidation: lv.invalidation.replace("今日", "本周").replace("判断失效", "判断失效"),
      confirmation: lv.confirmation,
      priceSnapshot: lv.priceSnapshot,
      priceDataSourceLabel: lv.priceDataSourceLabel,
      priceSnapshotAtLabel: lv.priceSnapshotAtLabel,
    });
  }

  // —— Changxin ——
  const stockDaily = [];
  for (const f of CHANGXIN_DAILY_FORECASTS) {
    const lv = await levelsFor(
      "688825",
      "长鑫科技",
      f.direction,
      f.forecastDate,
      f.publishedAt
    );
    if ("error" in lv) {
      (report.failed as string[]).push(`${f.id}: ${lv.error}`);
      // New listing — try listing day bar; if fail keep missing notice
      stockDaily.push({
        ...f,
        keySupport: ["该条历史预测未保存具体价格，不补录事后价位。"],
        keyResistance: ["该条历史预测未保存具体价格，不补录事后价位。"],
        invalidation: "该条历史预测未保存具体价格，不补录事后价位。",
        confirmation: undefined,
        priceLevelsMissing: true,
      });
      continue;
    }
    (report.fuzzyFixed as number) += 1;
    (report.updatedStock as string[]).push(f.id);
    stockDaily.push({
      ...f,
      keySupport: lv.supportLevels,
      keyResistance: lv.resistanceLevels,
      invalidation: lv.invalidation,
      confirmation: lv.confirmation,
      priceSnapshot: lv.priceSnapshot,
      priceDataSourceLabel: lv.priceDataSourceLabel,
      priceSnapshotAtLabel: lv.priceSnapshotAtLabel,
      expectedPath: f.expectedPath
        .replace(/前一交易日低点/g, lv.supportLevels[0] ?? "关键支撑")
        .replace(/前一交易日高点/g, lv.resistanceLevels[0] ?? "关键压力"),
    });
  }

  const stockWeekly = [];
  for (const w of CHANGXIN_WEEKLY_ANALYSES) {
    const lv = await levelsFor("688825", "长鑫科技", w.overallDirection, w.weekStart, w.publishedAt);
    if ("error" in lv) {
      (report.failed as string[]).push(`${w.id}: ${lv.error}`);
      stockWeekly.push({
        ...w,
        keySupport: ["该条历史预测未保存具体价格，不补录事后价位。"],
        keyResistance: ["该条历史预测未保存具体价格，不补录事后价位。"],
        invalidation: "该条历史预测未保存具体价格，不补录事后价位。",
      });
      continue;
    }
    (report.fuzzyFixed as number) += 1;
    (report.updatedStock as string[]).push(w.id);
    stockWeekly.push({
      ...w,
      keySupport: lv.supportLevels,
      keyResistance: lv.resistanceLevels,
      invalidation: lv.invalidation.replace("今日", "本周"),
      confirmation: lv.confirmation,
      priceSnapshot: lv.priceSnapshot,
      priceDataSourceLabel: lv.priceDataSourceLabel,
      priceSnapshotAtLabel: lv.priceSnapshotAtLabel,
    });
  }

  // Write JSON sidecar consumed by runtime overlays
  const sidecar = {
    generatedAt: new Date().toISOString(),
    btcJul27: report.btcJul27,
    daily: Object.fromEntries(
      dailyOut.map((f) => [
        f.id,
        {
          supportLevels: f.supportLevels,
          resistanceLevels: f.resistanceLevels,
          invalidation: f.invalidation,
          confirmation: (f as { confirmation?: string }).confirmation,
          priceSnapshot: (f as { priceSnapshot?: unknown }).priceSnapshot,
          priceDataSourceLabel: (f as { priceDataSourceLabel?: string }).priceDataSourceLabel,
          priceSnapshotAtLabel: (f as { priceSnapshotAtLabel?: string }).priceSnapshotAtLabel,
        },
      ])
    ),
    weekly: Object.fromEntries(
      weeklyOut.map((w) => [
        w.id,
        {
          keySupport: w.keySupport,
          keyResistance: w.keyResistance,
          invalidation: w.invalidation,
          confirmation: (w as { confirmation?: string }).confirmation,
          priceSnapshot: (w as { priceSnapshot?: unknown }).priceSnapshot,
          priceDataSourceLabel: (w as { priceDataSourceLabel?: string }).priceDataSourceLabel,
          priceSnapshotAtLabel: (w as { priceSnapshotAtLabel?: string }).priceSnapshotAtLabel,
        },
      ])
    ),
    stockDaily: Object.fromEntries(
      stockDaily.map((f) => [
        f.id,
        {
          keySupport: f.keySupport,
          keyResistance: f.keyResistance,
          invalidation: f.invalidation,
          confirmation: (f as { confirmation?: string }).confirmation,
          expectedPath: f.expectedPath,
          priceSnapshot: (f as { priceSnapshot?: unknown }).priceSnapshot,
          priceDataSourceLabel: (f as { priceDataSourceLabel?: string }).priceDataSourceLabel,
          priceSnapshotAtLabel: (f as { priceSnapshotAtLabel?: string }).priceSnapshotAtLabel,
        },
      ])
    ),
    stockWeekly: Object.fromEntries(
      stockWeekly.map((w) => [
        w.id,
        {
          keySupport: w.keySupport,
          keyResistance: w.keyResistance,
          invalidation: w.invalidation,
          confirmation: (w as { confirmation?: string }).confirmation,
          priceSnapshot: (w as { priceSnapshot?: unknown }).priceSnapshot,
          priceDataSourceLabel: (w as { priceDataSourceLabel?: string }).priceDataSourceLabel,
          priceSnapshotAtLabel: (w as { priceSnapshotAtLabel?: string }).priceSnapshotAtLabel,
        },
      ])
    ),
  };

  const outPath = resolve("lib/data/price-level-overlays.json");
  writeFileSync(outPath, JSON.stringify(sidecar, null, 2), "utf8");
  report.overlayPath = outPath;
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
