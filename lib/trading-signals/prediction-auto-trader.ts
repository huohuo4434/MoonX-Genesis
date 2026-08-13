import "server-only";

import { randomUUID } from "crypto";
import {
  buildAdminFullCycleSnapshot,
  listCodeBackedForecastRowsForAssets,
} from "@/lib/admin/full-cycle-control";
import {
  getBitgetDemoDashboard,
  getBitgetMirrorSettings,
  syncBitgetDemoOrders,
} from "@/lib/bitget/demo-connector";
import { getChinaDateKey } from "@/lib/date/china-date";
import { runDailyForecastPipeline } from "@/lib/forecasts/daily-pipeline";
import { generateDailyFromWeekly } from "@/lib/forecasts/weekly-to-daily";
import { getCryptoPointGuidance } from "@/lib/forecasts/crypto-point-guidance";
import { getCrypto15mMarketContext } from "@/lib/market-data/crypto-candles";
import { prisma } from "@/lib/prisma";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import {
  listGeneratedDailiesForDate,
  listWeeklyForecastSources,
} from "@/lib/weekly-source/store";
import {
  createTradeSignal,
  getTradeSignalById,
} from "@/lib/trading-signals/store";
import {
  ensureTradingV2Tables,
  getPaperAccount,
  monitorTradeSignal,
} from "@/lib/trading-signals/v2-store";
import type { AdminCycleForecastRow } from "@/types/admin-full-cycle";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type {
  PredictionAutoDecision,
  PredictionAutoDirection,
  PredictionAutoRunLog,
  PredictionAutoRunReport,
  PredictionAutoRunStatus,
  PredictionAutoSetup,
  PredictionAutoSymbol,
  PredictionAutoTraderDashboard,
  PredictionAutoTraderSettings,
  PredictionForecastLeg,
  PredictionMarketContext,
  PredictionStrategyPlan,
} from "@/types/prediction-auto-trader";
import { loadForecastSourcesForScope } from "@/lib/trading-signals/forecast-read-scope-core";
import { resolveWeeklyAuthoritySetup } from "@/lib/trading-signals/authoritative-market-structure-core";

type DbSettings = {
  enabled: boolean;
  btc_enabled: boolean;
  eth_enabled: boolean;
  watch_symbols: unknown;
  strategy_interval_minutes: number;
  position_pct: number;
  stop_loss_pct: number;
  target_1_pct: number;
  target_2_pct: number;
  target_3_pct: number;
  min_dip_pct: number;
  rebound_confirm_pct: number;
  min_rally_pct: number;
  reversal_confirm_pct: number;
  min_forecast_confidence: number;
  max_trades_per_symbol_day: number;
  require_daily_weekly_alignment: boolean;
  started_at: Date | string | null;
  last_run_at: Date | string | null;
  last_full_scan_at: Date | string | null;
  last_run_source: string | null;
  last_message: string;
  updated_at: Date | string;
};

type DbRun = {
  id: string;
  symbol: PredictionAutoSymbol;
  trading_date: string | Date;
  status: PredictionAutoRunStatus;
  action: string;
  direction: PredictionAutoDirection;
  price: number | null;
  weekly_forecast_id: string | null;
  daily_forecast_id: string | null;
  signal_id: string | null;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: Date | string;
};

type PathPattern =
  | "UP_THEN_DOWN"
  | "DOWN_THEN_UP"
  | "UP"
  | "DOWN"
  | "NEUTRAL";

type SymbolMeta = {
  assetId: string;
  assetName: string;
  tradeSymbol: string;
};

const SYMBOL_CATALOG: Record<string, SymbolMeta> = {
  BTC: { assetId: "bitcoin", assetName: "比特币", tradeSymbol: "BTC" },
  ETH: { assetId: "eth", assetName: "以太坊", tradeSymbol: "ETH" },
  SOL: { assetId: "solana", assetName: "Solana", tradeSymbol: "SOL" },
  BNB: { assetId: "bnb", assetName: "BNB", tradeSymbol: "BNB" },
  XRP: { assetId: "xrp", assetName: "XRP", tradeSymbol: "XRP" },
  DOGE: { assetId: "dogecoin", assetName: "狗狗币", tradeSymbol: "DOGE" },
  ADA: { assetId: "cardano", assetName: "Cardano", tradeSymbol: "ADA" },
  AVAX: { assetId: "avalanche", assetName: "Avalanche", tradeSymbol: "AVAX" },
  LINK: { assetId: "chainlink", assetName: "Chainlink", tradeSymbol: "LINK" },
  HYPE: { assetId: "hype", assetName: "Hyperliquid", tradeSymbol: "HYPE" },
  MU: { assetId: "mu", assetName: "美光科技", tradeSymbol: "MU" },
  QQQ: { assetId: "nasdaq-100", assetName: "纳斯达克100", tradeSymbol: "QQQ" },
  XAUT: { assetId: "gold", assetName: "黄金", tradeSymbol: "XAUT" },
  XAG: { assetId: "silver", assetName: "白银", tradeSymbol: "XAG" },
  GOOGL: { assetId: "googl", assetName: "Alphabet", tradeSymbol: "GOOGL" },
  CL: { assetId: "wti-crude", assetName: "WTI原油", tradeSymbol: "CL" },
  SPY: { assetId: "sp500", assetName: "标普500", tradeSymbol: "SPY" },
  SNDK: { assetId: "sandisk", assetName: "SanDisk", tradeSymbol: "SNDK" },
  MSFT: { assetId: "msft", assetName: "微软", tradeSymbol: "MSFT" },
};

const DEFAULT_WATCH_SYMBOLS = ["BTC", "ETH"];
const EXPECTED_SERVER_INTERVAL_MINUTES = 1;

function normalizeSymbol(value: string): PredictionAutoSymbol {
  const normalized = value.trim().toUpperCase().replace(/[-_\/\s]/g, "");
  const base = normalized.endsWith("USDT") ? normalized.slice(0, -4) : normalized;
  if (!/^[A-Z0-9]{2,15}$/.test(base)) throw new Error(`币种代码${value}格式无效`);
  return base;
}

function normalizeWatchSymbols(value: unknown, fallback = DEFAULT_WATCH_SYMBOLS): string[] {
  const raw = Array.isArray(value) ? value : fallback;
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    try {
      const symbol = normalizeSymbol(item);
      if (!result.includes(symbol)) result.push(symbol);
    } catch {
      // 忽略旧数据中的无效币种。
    }
    if (result.length >= 10) break;
  }
  return result.length ? result : [...fallback];
}

function symbolMeta(symbol: PredictionAutoSymbol): SymbolMeta {
  const normalized = normalizeSymbol(symbol);
  return (
    SYMBOL_CATALOG[normalized] ?? {
      assetId: normalized.toLowerCase(),
      assetName: normalized,
      tradeSymbol: normalized,
    }
  );
}

const DEFAULT_SETTINGS: PredictionAutoTraderSettings = {
  enabled: false,
  watchSymbols: [...DEFAULT_WATCH_SYMBOLS],
  btcEnabled: true,
  ethEnabled: true,
  strategyIntervalMinutes: 5,
  positionPct: 2,
  stopLossPct: 1,
  target1Pct: 1.5,
  target2Pct: 2.5,
  target3Pct: 3.5,
  minDipPct: 0.6,
  reboundConfirmPct: 0.25,
  minRallyPct: 0.6,
  reversalConfirmPct: 0.25,
  minForecastConfidence: 55,
  maxTradesPerSymbolDay: 1,
  requireDailyWeeklyAlignment: true,
  startedAt: null,
  lastRunAt: null,
  lastFullScanAt: null,
  lastRunSource: "UNKNOWN",
  lastMessage: "尚未运行",
  updatedAt: new Date(0).toISOString(),
};

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function runSource(value: string | null | undefined): "CRON" | "ADMIN" | "BROWSER" | "UNKNOWN" {
  return value === "CRON" || value === "ADMIN" || value === "BROWSER" ? value : "UNKNOWN";
}

function mapSettings(row: DbSettings | undefined): PredictionAutoTraderSettings {
  if (!row) return { ...DEFAULT_SETTINGS, watchSymbols: [...DEFAULT_WATCH_SYMBOLS] };
  const legacyFallback = [
    ...(row.btc_enabled ? ["BTC"] : []),
    ...(row.eth_enabled ? ["ETH"] : []),
  ];
  const watchSymbols = normalizeWatchSymbols(
    row.watch_symbols,
    legacyFallback.length ? legacyFallback : DEFAULT_WATCH_SYMBOLS
  );
  return {
    enabled: Boolean(row.enabled),
    watchSymbols,
    btcEnabled: watchSymbols.includes("BTC"),
    ethEnabled: watchSymbols.includes("ETH"),
    strategyIntervalMinutes: Math.max(1, Math.min(15, Number(row.strategy_interval_minutes || 5))),
    positionPct: Number(row.position_pct),
    stopLossPct: Number(row.stop_loss_pct),
    target1Pct: Number(row.target_1_pct),
    target2Pct: Number(row.target_2_pct),
    target3Pct: Number(row.target_3_pct),
    minDipPct: Number(row.min_dip_pct),
    reboundConfirmPct: Number(row.rebound_confirm_pct),
    minRallyPct: Number(row.min_rally_pct),
    reversalConfirmPct: Number(row.reversal_confirm_pct),
    minForecastConfidence: Number(row.min_forecast_confidence),
    maxTradesPerSymbolDay: Number(row.max_trades_per_symbol_day),
    requireDailyWeeklyAlignment: Boolean(row.require_daily_weekly_alignment),
    startedAt: iso(row.started_at),
    lastRunAt: iso(row.last_run_at),
    lastFullScanAt: iso(row.last_full_scan_at),
    lastRunSource: runSource(row.last_run_source),
    lastMessage: row.last_message || "尚未运行",
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapRun(row: DbRun): PredictionAutoRunLog {
  const tradingDate =
    row.trading_date instanceof Date
      ? row.trading_date.toISOString().slice(0, 10)
      : String(row.trading_date).slice(0, 10);
  return {
    id: row.id,
    symbol: row.symbol,
    tradingDate,
    status: row.status,
    action: row.action,
    direction: row.direction,
    price: row.price == null ? null : Number(row.price),
    weeklyForecastId: row.weekly_forecast_id,
    dailyForecastId: row.daily_forecast_id,
    signalId: row.signal_id,
    reason: row.reason,
    payload: row.payload,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

let ensured = false;
export async function ensurePredictionAutoTraderTables(): Promise<boolean> {
  if (!(await ensureTradingV2Tables()) || !prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_prediction_auto_settings (
        id TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        btc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        eth_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        watch_symbols JSONB NOT NULL DEFAULT '["BTC","ETH"]'::jsonb,
        strategy_interval_minutes INTEGER NOT NULL DEFAULT 5,
        position_pct DOUBLE PRECISION NOT NULL DEFAULT 2,
        stop_loss_pct DOUBLE PRECISION NOT NULL DEFAULT 1,
        target_1_pct DOUBLE PRECISION NOT NULL DEFAULT 1.5,
        target_2_pct DOUBLE PRECISION NOT NULL DEFAULT 2.5,
        target_3_pct DOUBLE PRECISION NOT NULL DEFAULT 3.5,
        min_dip_pct DOUBLE PRECISION NOT NULL DEFAULT 0.6,
        rebound_confirm_pct DOUBLE PRECISION NOT NULL DEFAULT 0.25,
        min_rally_pct DOUBLE PRECISION NOT NULL DEFAULT 0.6,
        reversal_confirm_pct DOUBLE PRECISION NOT NULL DEFAULT 0.25,
        min_forecast_confidence DOUBLE PRECISION NOT NULL DEFAULT 55,
        max_trades_per_symbol_day INTEGER NOT NULL DEFAULT 1,
        require_daily_weekly_alignment BOOLEAN NOT NULL DEFAULT TRUE,
        started_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        last_full_scan_at TIMESTAMPTZ,
        last_run_source TEXT,
        last_message TEXT NOT NULL DEFAULT '尚未运行',
        run_lock_until TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_prediction_auto_settings
        ADD COLUMN IF NOT EXISTS watch_symbols JSONB NOT NULL DEFAULT '["BTC","ETH"]'::jsonb,
        ADD COLUMN IF NOT EXISTS strategy_interval_minutes INTEGER NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS last_full_scan_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_run_source TEXT
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO trade_prediction_auto_settings (id)
      VALUES ('default') ON CONFLICT (id) DO NOTHING
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE trade_prediction_auto_settings
      SET watch_symbols = CASE
        WHEN watch_symbols IS NULL OR jsonb_array_length(watch_symbols) = 0
        THEN to_jsonb(ARRAY_REMOVE(ARRAY[
          CASE WHEN btc_enabled THEN 'BTC' ELSE NULL END,
          CASE WHEN eth_enabled THEN 'ETH' ELSE NULL END
        ], NULL))
        ELSE watch_symbols
      END
      WHERE id = 'default'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_prediction_auto_runs (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        trading_date DATE NOT NULL,
        status TEXT NOT NULL,
        action TEXT NOT NULL,
        direction TEXT NOT NULL,
        price DOUBLE PRECISION,
        weekly_forecast_id TEXT,
        daily_forecast_id TEXT,
        signal_id TEXT,
        reason TEXT NOT NULL DEFAULT '',
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_prediction_auto_runs_time_idx
      ON trade_prediction_auto_runs(created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS trade_prediction_auto_runs_symbol_date_idx
      ON trade_prediction_auto_runs(symbol, trading_date, status)
    `);
    ensured = true;
    return true;
  } catch (error) {
    console.error("Prediction auto trader tables unavailable", error);
    return false;
  }
}

export async function getPredictionAutoTraderSettings(
  options: { readOnly?: boolean } = {}
): Promise<PredictionAutoTraderSettings> {
  if (!prisma) {
    return { ...DEFAULT_SETTINGS, watchSymbols: [...DEFAULT_WATCH_SYMBOLS] };
  }
  if (!options.readOnly && !(await ensurePredictionAutoTraderTables())) {
    return { ...DEFAULT_SETTINGS, watchSymbols: [...DEFAULT_WATCH_SYMBOLS] };
  }
  const rows = await prisma.$queryRawUnsafe<DbSettings[]>(
    `SELECT * FROM trade_prediction_auto_settings WHERE id = 'default' LIMIT 1`
  );
  if (options.readOnly && !rows[0]) {
    throw new Error("预测自动交易设置缺失，实盘扫描禁止使用默认值");
  }
  return mapSettings(rows[0]);
}

export type PredictionAutoSettingsUpdate = Pick<
  PredictionAutoTraderSettings,
  | "watchSymbols"
  | "strategyIntervalMinutes"
  | "positionPct"
  | "stopLossPct"
  | "target1Pct"
  | "target2Pct"
  | "target3Pct"
  | "minDipPct"
  | "reboundConfirmPct"
  | "minRallyPct"
  | "reversalConfirmPct"
  | "minForecastConfidence"
  | "maxTradesPerSymbolDay"
  | "requireDailyWeeklyAlignment"
>;

export async function updatePredictionAutoTraderSettings(
  input: PredictionAutoSettingsUpdate
): Promise<PredictionAutoTraderSettings> {
  if (!(await ensurePredictionAutoTraderTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const watchSymbols = normalizeWatchSymbols(input.watchSymbols);
  const watchJson = JSON.stringify(watchSymbols);
  await prisma.$executeRaw`
    UPDATE trade_prediction_auto_settings SET
      watch_symbols = ${watchJson}::jsonb,
      btc_enabled = ${watchSymbols.includes("BTC")},
      eth_enabled = ${watchSymbols.includes("ETH")},
      strategy_interval_minutes = ${input.strategyIntervalMinutes},
      position_pct = ${input.positionPct},
      stop_loss_pct = ${input.stopLossPct},
      target_1_pct = ${input.target1Pct},
      target_2_pct = ${input.target2Pct},
      target_3_pct = ${input.target3Pct},
      min_dip_pct = ${input.minDipPct},
      rebound_confirm_pct = ${input.reboundConfirmPct},
      min_rally_pct = ${input.minRallyPct},
      reversal_confirm_pct = ${input.reversalConfirmPct},
      min_forecast_confidence = ${input.minForecastConfidence},
      max_trades_per_symbol_day = ${input.maxTradesPerSymbolDay},
      require_daily_weekly_alignment = ${input.requireDailyWeeklyAlignment},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  return getPredictionAutoTraderSettings();
}

export async function setPredictionAutoTraderEnabled(
  enabled: boolean
): Promise<PredictionAutoTraderSettings> {
  if (!(await ensurePredictionAutoTraderTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  if (enabled) {
    const dashboard = await getBitgetDemoDashboard();
    if (!dashboard.settings.enabled) {
      throw new Error("请先开启Bitget Demo镜像，再开启预测自动交易");
    }
    if (!dashboard.environment.executionAllowed) {
      throw new Error("BITGET_DEMO_EXECUTION_ALLOWED尚未设为true");
    }
  }
  await prisma.$executeRaw`
    UPDATE trade_prediction_auto_settings SET
      enabled = ${enabled},
      started_at = CASE
        WHEN ${enabled} = TRUE AND enabled = FALSE THEN NOW()
        ELSE started_at
      END,
      last_message = ${enabled ? "预测自动交易已开启，等待服务器Cron心跳" : "预测自动交易已停止"},
      updated_at = NOW()
    WHERE id = 'default'
  `;
  return getPredictionAutoTraderSettings();
}

function patternFromText(text: string): PathPattern {
  if (/先涨(?:后|再)跌|冲高回落|先扬后抑|高开低走/.test(text)) return "UP_THEN_DOWN";
  if (/先跌(?:后|再)涨|探底回升|先抑后扬|先压后修复|低开高走/.test(text)) {
    return "DOWN_THEN_UP";
  }
  if (/强势看涨|震荡上涨|偏强|走强|上涨|反弹|修复|上行/.test(text)) return "UP";
  if (/强势看跌|震荡下跌|偏弱|走弱|下跌|回落|下行/.test(text)) return "DOWN";
  return "NEUTRAL";
}

function directionalFromPattern(pattern: PathPattern): PredictionAutoDirection {
  if (pattern === "UP" || pattern === "DOWN_THEN_UP") return "LONG";
  if (pattern === "DOWN" || pattern === "UP_THEN_DOWN") return "SHORT";
  return "NEUTRAL";
}

function forecastConfidence(
  row: AdminCycleForecastRow,
  direction: PredictionAutoDirection
): number {
  const label = row.probabilityLabel;
  const pathPattern = patternFromText(`${row.direction} ${row.path}`);
  const sideways = label.match(/震\s*(\d{1,3}(?:\.\d+)?)%/)?.[1];
  if (
    (pathPattern === "UP_THEN_DOWN" || pathPattern === "DOWN_THEN_UP") &&
    sideways
  ) {
    // Two-leg forecasts describe an intraday path, not a single close direction.
    // Their usable confidence is the probability of leaving the sideways case.
    return Math.min(100, Math.max(0, 100 - Number(sideways)));
  }

  const up = label.match(/涨\s*(\d{1,3}(?:\.\d+)?)%/)?.[1];
  const down = label.match(/跌\s*(\d{1,3}(?:\.\d+)?)%/)?.[1];
  const directional = direction === "LONG" ? up : direction === "SHORT" ? down : undefined;
  if (directional) return Math.min(100, Math.max(0, Number(directional)));
  const pct = label.match(/(\d{1,3}(?:\.\d+)?)%/)?.[1];
  if (pct) return Math.min(100, Math.max(0, Number(pct)));
  return 55;
}

function forecastScore(row: AdminCycleForecastRow): number {
  const status = row.status.toLowerCase();
  const pending = /draft|待|pending|研究尚未完成|暂无判断/.test(
    `${status} ${row.direction} ${row.path}`
  );
  const databaseBonus = /自动日预测数据库|周预测源数据库/.test(row.sourceLabel) ? 500 : 0;
  const authoritativeResearchBonus = /自动交易正式周研究/.test(row.sourceLabel) ? 450 : 0;
  const runtimeDailyBonus = /自动交易运行时日预测/.test(row.sourceLabel) ? 450 : 0;
  return (
    (pending ? -1000 : 0) +
    databaseBonus +
    authoritativeResearchBonus +
    runtimeDailyBonus +
    (row.version ?? 0) * 10 +
    (/publish|verified|locked|正式/.test(status) ? 100 : 0)
  );
}

function marketCodeAssetId(code: string): string | null {
  try {
    return symbolMeta(normalizeSymbol(code)).assetId;
  } catch {
    return null;
  }
}

const AUTO_DAILY_FORECAST_MARKETS = new Set(["BTC", "ETH"]);

type DailyForecastSupplyReport = {
  checkedDate: string;
  requested: string[];
  generated: string[];
  skipped: string[];
  warnings: string[];
  errors: string[];
};

async function ensureAutoTradingDailyForecasts(
  symbols: readonly PredictionAutoSymbol[],
  now: Date
): Promise<DailyForecastSupplyReport> {
  const checkedDate = getChinaDateKey(now);
  const requested = [...new Set(
    symbols
      .map((symbol) => normalizeSymbol(symbol))
      .filter((symbol) => AUTO_DAILY_FORECAST_MARKETS.has(symbol))
  )];
  const current = await listGeneratedDailiesForDate(checkedDate);
  const present = new Set(current.map((item) => normalizeSymbol(item.marketCode)));
  const missing = requested.filter((symbol) => !present.has(symbol));

  if (!missing.length) {
    return {
      checkedDate,
      requested,
      generated: [],
      skipped: [],
      warnings: [],
      errors: [],
    };
  }

  const targetDateByMarket = Object.fromEntries(
    missing.map((symbol) => [symbol, checkedDate])
  );
  const report = await runDailyForecastPipeline({
    now,
    forcePhase: "lock",
    markets: missing,
    targetDateByMarket,
    technicalAttempts: 1,
  });

  return {
    checkedDate,
    requested,
    generated: report.records
      .filter((item) => item.forecastDate === checkedDate)
      .map((item) => normalizeSymbol(item.marketCode)),
    skipped: report.skipped,
    warnings: report.warnings.map(
      (item) => `${item.market}:${item.date}:${item.error}`
    ),
    errors: report.errors.map(
      (item) => `${item.market}:${item.date ?? checkedDate}:${item.error}`
    ),
  };
}

function probabilityLabelFromPeriod(input: {
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
}): string {
  return `涨${input.upProbability}% / 震${input.sidewaysProbability}% / 跌${input.downProbability}%`;
}

function currentCryptoResearchWeeklyRows(
  today: string,
  now: Date
): AdminCycleForecastRow[] {
  const rows: AdminCycleForecastRow[] = [];
  const groups = [
    ...listBtcPeriodForecasts20260801(),
    ...listEthPeriodForecasts(),
  ];
  for (const item of groups) {
    if (
      !item.forecastType.startsWith("WEEK") ||
      item.periodEnd < today
    ) {
      continue;
    }
    const symbol = item.assetId === "bitcoin" ? "BTC" : item.assetId === "eth" ? "ETH" : "";
    if (!symbol) continue;
    const point = getCryptoPointGuidance(symbol, now);
    rows.push({
      id: item.id,
      assetId: item.assetId,
      horizon: "WEEK",
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      direction: item.direction,
      path: [
        item.expectedPath,
        point
          ? `关键点位${point.threshold.toLocaleString("en-US")}按4小时收盘判定；${point.summary}`
          : "",
      ]
        .filter(Boolean)
        .join("；"),
      probabilityLabel: probabilityLabelFromPeriod(item),
      sourceLabel: "MOOX锁定周研究 · 六爻周卦",
      status: "locked",
      version: item.version,
      publishedAt: item.publishedAt,
      lockedAt: item.lockedAt,
    });
  }
  return rows;
}

function weeklyRowAsSource(
  row: AdminCycleForecastRow,
  symbol: string
): WeeklyForecastSourceRecord {
  return {
    id: row.id,
    marketCode: symbol,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    primaryHexagram: null,
    changedHexagram: null,
    movingLines: [],
    specialPatterns: [],
    weeklyDirection: row.direction,
    weeklyPath: row.path,
    interpretation: row.path,
    riskSummary: "周卦拆日仅用于执行节奏；关键点位失效时禁止逆势开仓。",
    sourceType: "LIUYAO_WEEKLY",
    version: row.version ?? 1,
    status: "LOCKED",
    publishedAt: new Date().toISOString(),
    lockedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function runtimeDailyRow(
  weeklyRow: AdminCycleForecastRow,
  symbol: "BTC" | "ETH",
  today: string
): AdminCycleForecastRow {
  const generated = generateDailyFromWeekly({
    weekly: weeklyRowAsSource(weeklyRow, symbol),
    forecastDate: today,
    version: 1,
    status: "LOCKED",
  });
  return {
    id: `RUNTIME-${generated.id}`,
    assetId: symbol === "BTC" ? "bitcoin" : "eth",
    horizon: "DAY",
    periodStart: today,
    periodEnd: today,
    direction: generated.direction,
    path: generated.expectedPath,
    probabilityLabel: `涨${generated.upProbability}% / 震${generated.sidewaysProbability}% / 跌${generated.downProbability}%`,
    sourceLabel: "自动交易运行时日预测 · 周卦拆日 + 点位卦",
    status: "locked",
    version: generated.version,
    publishedAt: generated.publishedAt,
    // Runtime daily fallback is execution guidance, not an independently locked canonical forecast.
    lockedAt: null,
  };
}

async function loadPredictionForecastRows(
  now: Date,
  requestedSymbols?: readonly PredictionAutoSymbol[]
): Promise<AdminCycleForecastRow[]> {
  const today = getChinaDateKey(now);
  const requested = requestedSymbols?.length
    ? Array.from(new Set(requestedSymbols.map((symbol) => normalizeSymbol(symbol)))
    ) : null;
  const requestedAssetIds = requested?.map((symbol) => symbolMeta(symbol).assetId);
  const scoped = await loadForecastSourcesForScope({ requestedSymbols: requested ?? undefined }, {
    loadBroadBase: () => buildAdminFullCycleSnapshot(now).then((snapshot) => snapshot.forecasts),
    loadBoundedBase: () => Promise.resolve(listCodeBackedForecastRowsForAssets(requestedAssetIds ?? [], now)),
    loadDaily: (symbols) => listGeneratedDailiesForDate(today, symbols
      ? { marketCodes: symbols, readOnly: true }
      : undefined),
    loadWeekly: (symbols) => listWeeklyForecastSources(symbols),
  });
  const baseRows = scoped.base;
  const generatedDaily = scoped.daily;
  const weeklySources = scoped.weekly;
  const rows = [...baseRows, ...currentCryptoResearchWeeklyRows(today, now)]
    .filter((row) => !requestedAssetIds || requestedAssetIds.includes(row.assetId));

  for (const item of generatedDaily) {
    const assetId = marketCodeAssetId(item.marketCode);
    if (!assetId) continue;
    rows.push({
      id: item.id,
      assetId,
      horizon: "DAY",
      periodStart: item.forecastDate,
      periodEnd: item.forecastDate,
      direction: item.direction,
      path: item.expectedPath,
      probabilityLabel: `涨${item.upProbability}% / 震${item.sidewaysProbability}% / 跌${item.downProbability}%`,
      sourceLabel: `自动日预测数据库 · ${item.sourceWeeklyForecastId}`,
      status: item.status,
      version: item.version,
      publishedAt: item.publishedAt,
      lockedAt: item.lockedAt,
    });
  }

  for (const item of weeklySources) {
    const assetId = marketCodeAssetId(item.marketCode);
    if (!assetId) continue;
    rows.push({
      id: item.id,
      assetId,
      horizon: "WEEK",
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      direction: item.weeklyDirection,
      path: item.weeklyPath,
      probabilityLabel: "55%置信度",
      sourceLabel: `周预测源数据库 · ${item.sourceType}`,
      status: item.status,
      version: item.version,
      publishedAt: item.publishedAt,
      lockedAt: item.lockedAt,
    });
  }

  // The automatic trader must remain functional even when the optional
  // GeneratedDailyForecast/WeeklyForecastSource tables have not been migrated.
  for (const symbol of ["BTC", "ETH"] as const) {
    const assetId = symbol === "BTC" ? "bitcoin" : "eth";
    const hasDaily = rows.some(
      (row) =>
        row.assetId === assetId &&
        row.horizon === "DAY" &&
        row.periodStart <= today &&
        row.periodEnd >= today
    );
    if (hasDaily) continue;
    const weekly = selectForecast(rows, assetId, "WEEK", today);
    if (weekly) rows.push(runtimeDailyRow(weekly, symbol, today));
  }

  return rows;
}

function rowIsFormallyLocked(row: AdminCycleForecastRow): boolean {
  const status = String(row.status ?? "").toLowerCase();
  return Boolean(
    row.publishedAt &&
    row.lockedAt &&
    !status.includes("draft") &&
    !status.includes("pending") &&
    (status.includes("lock") || status.includes("publish") || status.includes("verif") || status.includes("正式"))
  );
}

function selectForecast(
  rows: AdminCycleForecastRow[],
  assetId: string,
  horizon: "DAY" | "WEEK" | "MONTH",
  today: string
): AdminCycleForecastRow | null {
  const eligible = rows.filter(
    (row) =>
      row.assetId === assetId &&
      row.horizon === horizon &&
      row.periodEnd >= today
  );
  return eligible.sort((a, b) => {
    const aLocked = rowIsFormallyLocked(a) ? 1 : 0;
    const bLocked = rowIsFormallyLocked(b) ? 1 : 0;
    if (aLocked !== bLocked) return bLocked - aLocked;
    const aCurrent = a.periodStart <= today && a.periodEnd >= today ? 1 : 0;
    const bCurrent = b.periodStart <= today && b.periodEnd >= today ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    if (a.periodStart !== b.periodStart) return a.periodStart.localeCompare(b.periodStart);
    const versionDelta = Number(b.version ?? 0) - Number(a.version ?? 0);
    if (versionDelta !== 0) return versionDelta;
    const publishedDelta = Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "");
    if (Number.isFinite(publishedDelta) && publishedDelta !== 0) return publishedDelta;
    return forecastScore(b) - forecastScore(a);
  })[0] ?? null;
}

function forecastLeg(
  row: AdminCycleForecastRow | null,
  direction: PredictionAutoDirection
): PredictionForecastLeg | null {
  if (!row) return null;
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    direction: row.direction,
    path: row.path,
    confidence: forecastConfidence(row, direction),
    sourceLabel: row.sourceLabel,
    status: row.status,
    version: row.version,
    publishedAt: row.publishedAt ?? null,
    lockedAt: row.lockedAt ?? null,
  };
}

function weeklyPhaseDirection(
  row: AdminCycleForecastRow | null,
  now: Date
): PredictionAutoDirection {
  if (!row) return "NEUTRAL";
  const pattern = patternFromText(`${row.direction} ${row.path}`);
  if (pattern !== "UP_THEN_DOWN" && pattern !== "DOWN_THEN_UP") {
    return directionalFromPattern(pattern);
  }
  const start = Date.parse(`${row.periodStart}T00:00:00+08:00`);
  const end = Date.parse(`${row.periodEnd}T23:59:59+08:00`);
  const progress = Math.min(1, Math.max(0, (now.getTime() - start) / Math.max(1, end - start)));
  if (pattern === "UP_THEN_DOWN") return progress < 0.55 ? "LONG" : "SHORT";
  return progress < 0.45 ? "SHORT" : "LONG";
}

function buildPlan(
  symbol: PredictionAutoSymbol,
  rows: AdminCycleForecastRow[],
  settings: PredictionAutoTraderSettings,
  now: Date
): PredictionStrategyPlan {
  const normalizedSymbol = normalizeSymbol(symbol);
  const meta = symbolMeta(normalizedSymbol);
  const today = getChinaDateKey(now);
  const monthlyRow = selectForecast(rows, meta.assetId, "MONTH", today);
  const weeklyRow = selectForecast(rows, meta.assetId, "WEEK", today);
  const dailyRow = selectForecast(rows, meta.assetId, "DAY", today);
  const monthlyDirection = weeklyPhaseDirection(monthlyRow, now);
  const weeklyDirection = weeklyPhaseDirection(weeklyRow, now);
  const dailyPattern = dailyRow
    ? patternFromText(`${dailyRow.direction} ${dailyRow.path}`)
    : "NEUTRAL";
  const dailyDirection = directionalFromPattern(dailyPattern);
  const monthly = forecastLeg(monthlyRow, monthlyDirection);
  const weekly = forecastLeg(weeklyRow, weeklyDirection);
  const daily = forecastLeg(dailyRow, dailyDirection);

  const setup: PredictionAutoSetup = resolveWeeklyAuthoritySetup({
    weeklyAvailable: Boolean(weekly),
    weeklyDirection,
    weeklyConfidence: weekly?.confidence ?? 0,
    minimumConfidence: settings.minForecastConfidence,
  });
  let reason = "正式周预测没有形成可执行方向，暂不下单。";
  if (!weekly) {
    reason = "缺少覆盖今天的正式周预测，禁止自动下单。";
  } else if (weekly.confidence < settings.minForecastConfidence) {
    reason = `正式周预测置信度不足${settings.minForecastConfidence}%，只观察不下单。`;
  } else if (weeklyDirection === "LONG") {
    reason = daily
      ? `正式周预测锁定看涨；日预测仅描述${dailyPattern}路径，不得否决或翻转周方向。`
      : "正式周预测锁定看涨；日预测缺失时仍保留周方向，等待技术边沿决定探路或确认。";
  } else if (weeklyDirection === "SHORT") {
    reason = daily
      ? `正式周预测锁定看跌；日预测仅描述${dailyPattern}路径，不得否决或翻转周方向。`
      : "正式周预测锁定看跌；日预测缺失时仍保留周方向，等待技术边沿决定探路或确认。";
  }

  const confidence = weekly?.confidence ?? 0;
  const activePoint = getCryptoPointGuidance(normalizedSymbol, now);
  return {
    symbol: normalizedSymbol,
    tradeSymbol: meta.tradeSymbol,
    assetId: meta.assetId,
    assetName: meta.assetName,
    monthlyForecast: monthly,
    weeklyForecast: weekly,
    dailyForecast: daily,
    monthlyDirection,
    weeklyDirection,
    dailyDirection,
    setup,
    confidence,
    reason,
    pointGuidance: activePoint
      ? {
          id: activePoint.id,
          threshold: activePoint.threshold,
          validUntil: activePoint.validUntil,
          closeInterval: activePoint.closeInterval,
          supportConfidence: activePoint.supportConfidence,
          summary: activePoint.summary,
          invalidationRule: activePoint.invalidationRule,
          sourceLabel: activePoint.sourceLabel,
        }
      : null,
  };
}

export async function resolvePredictionStrategyPlans(
  settings: PredictionAutoTraderSettings,
  now = new Date(),
  requestedSymbols?: readonly PredictionAutoSymbol[]
): Promise<PredictionStrategyPlan[]> {
  const rows = await loadPredictionForecastRows(now, requestedSymbols);
  const symbols = requestedSymbols?.length
    ? Array.from(new Set(requestedSymbols.map((symbol) => normalizeSymbol(symbol))))
    : normalizeWatchSymbols(settings.watchSymbols);
  return symbols.map((symbol) => buildPlan(symbol, rows, settings, now));
}

function directionForSetup(setup: PredictionAutoSetup): PredictionAutoDirection {
  if (setup === "BUY_DIP") return "LONG";
  if (setup === "SELL_RALLY") return "SHORT";
  return "NEUTRAL";
}

function latestTrendConfirmed(
  market: PredictionMarketContext,
  direction: PredictionAutoDirection
): boolean {
  if (market.lastCloses.length < 3) return false;
  const previous = market.lastCloses[market.lastCloses.length - 2];
  const latest = market.lastCloses[market.lastCloses.length - 1];
  if (previous == null || latest == null) return false;
  return direction === "LONG" ? latest > previous : direction === "SHORT" ? latest < previous : false;
}

function pointGateDecision(
  plan: PredictionStrategyPlan,
  market: PredictionMarketContext,
  now: Date
): { blocked: boolean; status: "WAITING" | "BLOCKED"; message: string } | null {
  const gate = getCryptoPointGuidance(plan.symbol, now);
  if (!gate) return null;
  const threshold = gate.threshold;
  const bufferPct = gate.symbol === "BTC" ? 1.5 : 1.2;
  const distancePct = ((market.currentPrice - threshold) / threshold) * 100;
  const latest4h = market.latestClosed4hClose;
  const invalidated = latest4h != null && latest4h < threshold;
  const nearSupport = market.currentPrice <= threshold * (1 + bufferPct / 100);

  if (plan.setup === "BUY_DIP" && invalidated) {
    return {
      blocked: true,
      status: "BLOCKED",
      message: `${gate.symbol}点位卦风控：最近已收盘4小时K线${latest4h?.toLocaleString("en-US")}低于${threshold.toLocaleString("en-US")}，支撑按失效处理，禁止新开多单。`,
    };
  }
  if (
    plan.setup === "BUY_DIP" &&
    market.currentPrice < threshold &&
    latest4h == null
  ) {
    return {
      blocked: true,
      status: "WAITING",
      message: `${gate.symbol}现价已低于${threshold.toLocaleString("en-US")}，但尚未取得已收盘4小时K线确认；等待确认，不抢多。`,
    };
  }
  if (plan.setup === "SELL_RALLY" && nearSupport) {
    return {
      blocked: true,
      status: "WAITING",
      message: `${gate.symbol}距离关键支撑${threshold.toLocaleString("en-US")}为${distancePct.toFixed(2)}%，已进入点位卦保护区，禁止追空，等待支撑确认或有效跌破。`,
    };
  }
  return {
    blocked: false,
    status: "WAITING",
    message: `${gate.symbol}点位卦监控：关键支撑${threshold.toLocaleString("en-US")}，最近已收盘4小时K线${latest4h == null ? "暂缺" : latest4h.toLocaleString("en-US")}。`,
  };
}

function triggerMessage(
  plan: PredictionStrategyPlan,
  market: PredictionMarketContext,
  settings: PredictionAutoTraderSettings
): { triggered: boolean; message: string } {
  if (market.candleCount < 4) {
    return { triggered: false, message: "今日15分钟K线不足4根，继续等待形成日内结构。" };
  }
  if (plan.setup === "BUY_DIP") {
    const dipReady = market.dipPct >= settings.minDipPct;
    const reboundReady = market.reboundPct >= settings.reboundConfirmPct;
    const trendReady = latestTrendConfirmed(market, "LONG");
    return {
      triggered: dipReady && reboundReady && trendReady,
      message: `逢低做多监控：下探${market.dipPct.toFixed(2)}% / 要求${settings.minDipPct}%，低点反弹${market.reboundPct.toFixed(2)}% / 要求${settings.reboundConfirmPct}%，15分钟回升确认${trendReady ? "已满足" : "未满足"}。`,
    };
  }
  if (plan.setup === "SELL_RALLY") {
    const rallyReady = market.rallyPct >= settings.minRallyPct;
    const reversalReady = market.reversalPct >= settings.reversalConfirmPct;
    const trendReady = latestTrendConfirmed(market, "SHORT");
    return {
      triggered: rallyReady && reversalReady && trendReady,
      message: `逢高做空监控：冲高${market.rallyPct.toFixed(2)}% / 要求${settings.minRallyPct}%，高点回落${market.reversalPct.toFixed(2)}% / 要求${settings.reversalConfirmPct}%，15分钟转弱确认${trendReady ? "已满足" : "未满足"}。`,
    };
  }
  return { triggered: false, message: plan.reason };
}

function roundPrice(value: number): number {
  if (value >= 1000) return Math.round(value * 100) / 100;
  if (value >= 10) return Math.round(value * 1000) / 1000;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function priceLevels(
  direction: PredictionAutoDirection,
  price: number,
  settings: PredictionAutoTraderSettings
): { stop: number; target1: number; target2: number; target3: number } {
  const sign = direction === "LONG" ? 1 : -1;
  return {
    stop: roundPrice(price * (1 - sign * (settings.stopLossPct / 100))),
    target1: roundPrice(price * (1 + sign * (settings.target1Pct / 100))),
    target2: roundPrice(price * (1 + sign * (settings.target2Pct / 100))),
    target3: roundPrice(price * (1 + sign * (settings.target3Pct / 100))),
  };
}

async function acquireRunLock(): Promise<boolean> {
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    UPDATE trade_prediction_auto_settings
    SET run_lock_until = NOW() + INTERVAL '3 minutes', updated_at = NOW()
    WHERE id = 'default'
      AND (run_lock_until IS NULL OR run_lock_until < NOW())
    RETURNING id
  `);
  return Boolean(rows[0]);
}

async function releaseRunLock(input: {
  message: string;
  source: "CRON" | "ADMIN" | "BROWSER" | "UNKNOWN";
  fullScan: boolean;
}): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRaw`
    UPDATE trade_prediction_auto_settings SET
      run_lock_until = NULL,
      last_run_at = NOW(),
      last_full_scan_at = CASE WHEN ${input.fullScan} THEN NOW() ELSE last_full_scan_at END,
      last_run_source = ${input.source},
      last_message = ${input.message},
      updated_at = NOW()
    WHERE id = 'default'
  `;
}

async function saveRun(input: {
  plan: PredictionStrategyPlan;
  status: PredictionAutoRunStatus;
  action: string;
  price: number | null;
  signalId?: string | null;
  reason: string;
  market?: PredictionMarketContext | null;
  now: Date;
}): Promise<void> {
  if (!prisma) return;
  const payload = JSON.stringify({ plan: input.plan, market: input.market ?? null });
  await prisma.$executeRaw`
    INSERT INTO trade_prediction_auto_runs (
      id, symbol, trading_date, status, action, direction, price,
      weekly_forecast_id, daily_forecast_id, signal_id, reason, payload, created_at
    ) VALUES (
      ${`par_${randomUUID()}`}, ${input.plan.symbol}, ${getChinaDateKey(input.now)}::date,
      ${input.status}, ${input.action}, ${directionForSetup(input.plan.setup)},
      ${input.price}, ${input.plan.weeklyForecast?.id ?? null},
      ${input.plan.dailyForecast?.id ?? null}, ${input.signalId ?? null},
      ${input.reason}, ${payload}::jsonb, NOW()
    )
  `;
}

async function recentRuns(limit = 40): Promise<PredictionAutoRunLog[]> {
  if (!(await ensurePredictionAutoTraderTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbRun[]>(
    `SELECT * FROM trade_prediction_auto_runs ORDER BY created_at DESC LIMIT $1`,
    Math.max(1, Math.min(200, limit))
  );
  return rows.map(mapRun);
}

async function cleanOldRuns(): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRawUnsafe(
    `DELETE FROM trade_prediction_auto_runs WHERE created_at < NOW() - INTERVAL '30 days'`
  );
}

async function openAutoSymbols(): Promise<Set<PredictionAutoSymbol>> {
  if (!prisma) return new Set();
  const rows = await prisma.$queryRawUnsafe<Array<{ symbol: string }>>(`
    SELECT DISTINCT p.symbol
    FROM trade_paper_positions p
    JOIN trade_signals s ON s.id = p.signal_id
    WHERE p.status <> 'CLOSED' AND s.draft_source = 'PREDICTION_AUTO_TRADER'
  `);
  const result = new Set<PredictionAutoSymbol>();
  for (const row of rows) {
    try {
      result.add(normalizeSymbol(row.symbol));
    } catch {
      // 跳过非加密币种。
    }
  }
  return result;
}

async function autoSignalIds(): Promise<string[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id FROM trade_signals
    WHERE draft_source = 'PREDICTION_AUTO_TRADER'
      AND status IN ('ARMED','TRIGGERED','ACTIVE','TAKE_PROFIT')
    ORDER BY updated_at ASC
  `);
  return rows.map((row) => row.id);
}

async function todayEntryCount(symbol: PredictionAutoSymbol, now: Date): Promise<number> {
  if (!prisma) return 0;
  const dayKey = getChinaDateKey(now);
  const start = new Date(`${dayKey}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const base = normalizeSymbol(symbol);
  const contract = `${base}USDT`;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT COUNT(*) AS count
     FROM trade_paper_orders o
     JOIN trade_paper_positions p ON p.id = o.position_id
     JOIN trade_signals s ON s.id = o.signal_id
     WHERE o.order_type = 'ENTRY'
       AND s.draft_source = 'PREDICTION_AUTO_TRADER'
       AND UPPER(REPLACE(REPLACE(REPLACE(p.symbol, '-', ''), '_', ''), '/', '')) IN ($3, $4)
       AND o.created_at >= $1::timestamptz
       AND o.created_at < $2::timestamptz`,
    start.toISOString(),
    end.toISOString(),
    base,
    contract
  );
  return Number(rows[0]?.count ?? 0);
}

async function autoDraftExists(key: string): Promise<boolean> {
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM trade_signals WHERE auto_draft_key = $1 LIMIT 1`,
    key
  );
  return Boolean(rows[0]);
}

async function manageExistingSignals(
  marketMap: Map<PredictionAutoSymbol, PredictionMarketContext>,
  plans: Map<PredictionAutoSymbol, PredictionStrategyPlan>,
  now: Date
): Promise<PredictionAutoDecision[]> {
  const decisions: PredictionAutoDecision[] = [];
  for (const id of await autoSignalIds()) {
    const signal = await getTradeSignalById(id);
    if (!signal) continue;
    let symbol: PredictionAutoSymbol;
    try {
      symbol = normalizeSymbol(signal.symbol);
    } catch {
      continue;
    }
    const market = marketMap.get(symbol);
    const plan = plans.get(symbol);
    if (!market || !plan) continue;
    try {
      const result = await monitorTradeSignal({
        signalId: signal.id,
        price: market.currentPrice,
        confirmed: true,
        execute: true,
      });
      const status: PredictionAutoRunStatus = result.executedActions.length ? "MANAGED" : "WAITING";
      const message = result.message;
      decisions.push({
        symbol,
        status,
        action: result.executedActions.join("+") || result.recommendation,
        price: market.currentPrice,
        plan,
        market,
        signalId: signal.id,
        message,
      });
      if (result.executedActions.length) {
        await saveRun({
          plan,
          status,
          action: result.executedActions.join("+"),
          price: market.currentPrice,
          signalId: signal.id,
          reason: message,
          market,
          now,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "持仓管理失败";
      decisions.push({
        symbol,
        status: "ERROR",
        action: "MANAGE_ERROR",
        price: market.currentPrice,
        plan,
        market,
        signalId: signal.id,
        message,
      });
      await saveRun({
        plan,
        status: "ERROR",
        action: "MANAGE_ERROR",
        price: market.currentPrice,
        signalId: signal.id,
        reason: message,
        market,
        now,
      });
    }
  }
  return decisions;
}

async function createAndEnterSignal(input: {
  plan: PredictionStrategyPlan;
  market: PredictionMarketContext;
  settings: PredictionAutoTraderSettings;
  now: Date;
}): Promise<string> {
  if (!prisma) throw new Error("交易数据库未连接");
  const direction = directionForSetup(input.plan.setup);
  if (direction === "NEUTRAL") throw new Error("当前计划没有明确方向");
  const account = await getPaperAccount();
  const levels = priceLevels(direction, input.market.currentPrice, input.settings);
  const dayKey = getChinaDateKey(input.now);
  const autoKey = `prediction-auto:${input.plan.symbol}:${dayKey}:${input.plan.weeklyForecast?.id ?? "none"}:${input.plan.dailyForecast?.id ?? "none"}:${direction}`;
  if (await autoDraftExists(autoKey)) throw new Error("今天相同预测组合已经生成过交易信号");

  const signal = await createTradeSignal({
    assetId: input.plan.assetId,
    symbol: input.plan.tradeSymbol,
    assetName: input.plan.assetName,
    market: "CRYPTO",
    timeframe: "15m/1D/1W",
    direction,
    status: "ARMED",
    starLevel: input.plan.confidence >= 75 ? 4 : 3,
    consensusScore: input.plan.confidence,
    entryMode: "MARKET",
    entryLow: input.market.currentPrice,
    entryHigh: input.market.currentPrice,
    triggerPrice: null,
    stopLoss: levels.stop,
    stopConfirmTimeframe: "INTRADAY",
    target1: levels.target1,
    target2: levels.target2,
    target3: levels.target3,
    quantity: null,
    notionalAmount: account.currentEquity * (input.settings.positionPct / 100),
    positionSizePct: input.settings.positionPct,
    maxRiskPct: input.settings.positionPct * (input.settings.stopLossPct / 100),
    validFrom: input.now.toISOString(),
    validUntil: new Date(`${dayKey}T23:59:59+08:00`).toISOString(),
    rationale: `${input.plan.reason} 周预测：${input.plan.weeklyForecast?.direction ?? "缺失"} / ${input.plan.weeklyForecast?.path ?? "缺失"}。日预测：${input.plan.dailyForecast?.direction ?? "缺失"} / ${input.plan.dailyForecast?.path ?? "缺失"}。${input.plan.pointGuidance ? `点位卦：${input.plan.pointGuidance.summary} ${input.plan.pointGuidance.invalidationRule}` : ""}`,
    executionPlan: `${input.plan.setup === "BUY_DIP" ? "逢低做多" : "逢高做空"}；15分钟结构确认后市价进入；仓位上限${input.settings.positionPct}%；止损${input.settings.stopLossPct}%；分批止盈${input.settings.target1Pct}% / ${input.settings.target2Pct}% / ${input.settings.target3Pct}%。`,
    invalidation: `${direction === "LONG" ? "跌破" : "突破"}自动止损价${levels.stop}立即退出。`,
    sourceForecastId: input.plan.dailyForecast?.id ?? input.plan.weeklyForecast?.id ?? null,
    apiVisible: true,
    paperOnly: true,
    createdBy: "prediction-auto-trader",
    methods: [
      {
        method: "周预测趋势阶段",
        direction: input.plan.weeklyDirection,
        weight: 45,
        confidence: input.plan.weeklyForecast?.confidence ?? 0,
        evidence: `${input.plan.weeklyForecast?.direction ?? "缺失"}；${input.plan.weeklyForecast?.path ?? "缺失"}`,
      },
      {
        method: "日预测运行节奏",
        direction: input.plan.dailyDirection,
        weight: 35,
        confidence: input.plan.dailyForecast?.confidence ?? 0,
        evidence: `${input.plan.dailyForecast?.direction ?? "缺失"}；${input.plan.dailyForecast?.path ?? "缺失"}`,
      },
      {
        method: "15分钟价格确认",
        direction,
        weight: 20,
        confidence: 70,
        evidence: `日内开盘${input.market.sessionOpen}，高${input.market.sessionHigh}，低${input.market.sessionLow}，现价${input.market.currentPrice}。`,
      },
    ],
  });

  await prisma.$executeRaw`
    UPDATE trade_signals SET
      auto_draft_key = ${autoKey},
      draft_source = 'PREDICTION_AUTO_TRADER',
      updated_at = NOW()
    WHERE id = ${signal.id}
  `;

  await monitorTradeSignal({
    signalId: signal.id,
    price: input.market.currentPrice,
    confirmed: true,
    execute: true,
  });
  return signal.id;
}

function isFullStrategyScanDue(
  settings: PredictionAutoTraderSettings,
  now: Date,
  forceFullScan: boolean
): boolean {
  if (forceFullScan || !settings.lastFullScanAt) return true;
  const previous = new Date(settings.lastFullScanAt).getTime();
  if (!Number.isFinite(previous)) return true;
  return now.getTime() - previous >= settings.strategyIntervalMinutes * 60_000;
}

export async function runPredictionAutoTrader(
  now = new Date(),
  options: {
    source?: "CRON" | "ADMIN" | "BROWSER" | "UNKNOWN";
    forceFullScan?: boolean;
    skipBitgetSync?: boolean;
  } = {}
): Promise<PredictionAutoRunReport> {
  const source = options.source ?? "UNKNOWN";
  if (!(await ensurePredictionAutoTraderTables()) || !prisma) {
    throw new Error("交易数据库未连接");
  }
  const locked = await acquireRunLock();
  if (!locked) {
    return {
      ok: true,
      enabled: true,
      locked: true,
      mode: "MONITOR",
      source,
      generatedAt: now.toISOString(),
      decisions: [],
      bitgetSync: null,
      message: "已有一轮策略检查正在运行，本轮跳过。",
    };
  }

  let finalMessage = "策略检查完成";
  let fullScanPerformed = false;
  try {
    await cleanOldRuns();
    const settings = await getPredictionAutoTraderSettings();
    const fullScan = isFullStrategyScanDue(settings, now, Boolean(options.forceFullScan));
    fullScanPerformed = fullScan;
    const mode = fullScan ? "FULL" as const : "MONITOR" as const;

    if (!settings.enabled) {
      finalMessage = "预测自动交易尚未开启";
      return {
        ok: true,
        enabled: false,
        locked: false,
        mode,
        source,
        generatedAt: now.toISOString(),
        decisions: [],
        bitgetSync: null,
        message: finalMessage,
      };
    }

    const [mirror, bitgetDashboard, openBefore] = await Promise.all([
      getBitgetMirrorSettings(),
      getBitgetDemoDashboard(),
      openAutoSymbols(),
    ]);
    const monitoredSymbols = normalizeWatchSymbols([
      ...Array.from(openBefore),
      ...settings.watchSymbols,
    ]);
    const forecastSupply = await ensureAutoTradingDailyForecasts(monitoredSymbols, now);
    const planSettings = { ...settings, watchSymbols: monitoredSymbols };
    const plans = await resolvePredictionStrategyPlans(planSettings, now);
    const watchSet = new Set(normalizeWatchSymbols(settings.watchSymbols));
    const decisions: PredictionAutoDecision[] = [];

    if (!mirror.enabled || !bitgetDashboard.environment.executionAllowed) {
      for (const plan of plans) {
        const message = !mirror.enabled
          ? "Bitget Demo镜像未开启，自动交易被风控拦截。"
          : "Bitget Demo下单总开关未开启，自动交易被风控拦截。";
        decisions.push({
          symbol: plan.symbol,
          status: "BLOCKED",
          action: "BLOCKED",
          price: null,
          plan,
          market: null,
          signalId: null,
          message,
        });
        if (fullScan) {
          await saveRun({
            plan,
            status: "BLOCKED",
            action: "BLOCKED",
            price: null,
            reason: message,
            now,
          });
        }
      }
      finalMessage = "Bitget Demo执行条件未满足，没有下单";
      return {
        ok: true,
        enabled: true,
        locked: false,
        mode,
        source,
        generatedAt: now.toISOString(),
        decisions,
        bitgetSync: null,
        message: finalMessage,
      };
    }

    const marketMap = new Map<PredictionAutoSymbol, PredictionMarketContext>();
    const marketResults = await Promise.allSettled(
      plans.map(async (plan) => ({
        plan,
        market: await getCrypto15mMarketContext(plan.symbol, now),
      }))
    );
    for (let index = 0; index < marketResults.length; index += 1) {
      const result = marketResults[index];
      const plan = plans[index];
      if (!plan || !result) continue;
      if (result.status === "fulfilled") {
        marketMap.set(plan.symbol, result.value.market);
        continue;
      }
      const message = result.reason instanceof Error ? result.reason.message : "行情读取失败";
      decisions.push({
        symbol: plan.symbol,
        status: "ERROR",
        action: "MARKET_ERROR",
        price: null,
        plan,
        market: null,
        signalId: null,
        message,
      });
      if (fullScan || openBefore.has(plan.symbol)) {
        await saveRun({
          plan,
          status: "ERROR",
          action: "MARKET_ERROR",
          price: null,
          reason: message,
          now,
        });
      }
    }

    const planMap = new Map(plans.map((plan) => [plan.symbol, plan] as const));
    decisions.push(...(await manageExistingSignals(marketMap, planMap, now)));
    const openSymbols = await openAutoSymbols();

    if (fullScan) {
      for (const plan of plans.filter((item) => watchSet.has(item.symbol))) {
        const market = marketMap.get(plan.symbol);
        if (!market) continue;
        if (openSymbols.has(plan.symbol)) {
          decisions.push({
            symbol: plan.symbol,
            status: "WAITING",
            action: "POSITION_OPEN",
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message: "该品种已有预测自动交易持仓，只管理原仓位，不重复开仓。",
          });
          continue;
        }
        if (plan.setup === "MISSING_FORECAST" || plan.setup === "HOLD") {
          decisions.push({
            symbol: plan.symbol,
            status: "SKIPPED",
            action: plan.setup,
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message: plan.reason,
          });
          continue;
        }
        const count = await todayEntryCount(plan.symbol, now);
        if (count >= settings.maxTradesPerSymbolDay) {
          decisions.push({
            symbol: plan.symbol,
            status: "SKIPPED",
            action: "DAILY_LIMIT",
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message: `今天已开仓${count}次，达到每日上限${settings.maxTradesPerSymbolDay}次。`,
          });
          continue;
        }

        const pointGate = pointGateDecision(plan, market, now);
        if (pointGate?.blocked) {
          decisions.push({
            symbol: plan.symbol,
            status: pointGate.status,
            action: "POINT_GATE",
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message: pointGate.message,
          });
          continue;
        }

        const trigger = triggerMessage(plan, market, settings);
        if (!trigger.triggered) {
          decisions.push({
            symbol: plan.symbol,
            status: "WAITING",
            action: plan.setup,
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message: trigger.message,
          });
          continue;
        }

        try {
          const signalId = await createAndEnterSignal({ plan, market, settings, now });
          const message = `${plan.reason} ${trigger.message} 已建立MoonX模拟仓位，等待镜像到Bitget Demo。`;
          decisions.push({
            symbol: plan.symbol,
            status: "EXECUTED",
            action: plan.setup,
            price: market.currentPrice,
            plan,
            market,
            signalId,
            message,
          });
          await saveRun({
            plan,
            status: "EXECUTED",
            action: plan.setup,
            price: market.currentPrice,
            signalId,
            reason: message,
            market,
            now,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "自动开仓失败";
          decisions.push({
            symbol: plan.symbol,
            status: "ERROR",
            action: "ENTRY_ERROR",
            price: market.currentPrice,
            plan,
            market,
            signalId: null,
            message,
          });
          await saveRun({
            plan,
            status: "ERROR",
            action: "ENTRY_ERROR",
            price: market.currentPrice,
            reason: message,
            market,
            now,
          });
        }
      }
    }

    let bitgetSync: Awaited<ReturnType<typeof syncBitgetDemoOrders>> | null = null;
    if (!options.skipBitgetSync) {
      try {
        bitgetSync = await syncBitgetDemoOrders();
      } catch (error) {
        const firstPlan = plans[0];
        if (firstPlan) {
          decisions.push({
            symbol: firstPlan.symbol,
            status: "ERROR",
            action: "BITGET_SYNC_ERROR",
            price: marketMap.get(firstPlan.symbol)?.currentPrice ?? null,
            plan: firstPlan,
            market: marketMap.get(firstPlan.symbol) ?? null,
            signalId: null,
            message: error instanceof Error ? error.message : "Bitget同步失败",
          });
        }
      }
    }

    const executed = decisions.filter((row) => row.status === "EXECUTED").length;
    const managed = decisions.filter((row) => row.status === "MANAGED").length;
    const marketErrors = decisions.filter((row) => row.action === "MARKET_ERROR").length;
    const supplySummary = forecastSupply.generated.length
      ? ` 已自动补齐${forecastSupply.checkedDate}的${forecastSupply.generated.join("、")}日预测。`
      : forecastSupply.errors.length
        ? ` 日预测自动补齐异常：${forecastSupply.errors.join("；")}`
        : forecastSupply.skipped.length
          ? ` 日预测仍缺少来源：${forecastSupply.skipped.join("；")}`
          : "";
    finalMessage = fullScan
      ? `完整策略检查完成：监控${plans.length}币，新开仓${executed}，持仓动作${managed}，行情异常${marketErrors}。${supplySummary}`
      : `每分钟持仓监控完成：监控${plans.length}币，持仓动作${managed}，行情异常${marketErrors}；本轮不评估新开仓。${supplySummary}`;
    return {
      ok: true,
      enabled: true,
      locked: false,
      mode,
      source,
      generatedAt: now.toISOString(),
      decisions,
      bitgetSync,
      message: finalMessage,
    };
  } catch (error) {
    finalMessage = `策略检查失败：${error instanceof Error ? error.message : "未知错误"}`;
    throw error;
  } finally {
    try {
      await releaseRunLock({
        message: finalMessage,
        source,
        fullScan: fullScanPerformed,
      });
    } catch (error) {
      console.error("Prediction auto trader lock release failed", error);
    }
  }
}

function addMinutes(isoValue: string | null, minutes: number): string | null {
  if (!isoValue) return null;
  const timestamp = new Date(isoValue).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp + minutes * 60_000).toISOString();
}

export async function getPredictionAutoTraderDashboard(
  now = new Date()
): Promise<PredictionAutoTraderDashboard> {
  const databaseReady = await ensurePredictionAutoTraderTables();
  const settings = await getPredictionAutoTraderSettings();
  const bitget = await getBitgetDemoDashboard();
  const lastRunTimestamp = settings.lastRunAt ? new Date(settings.lastRunAt).getTime() : Number.NaN;
  const heartbeatAgeSeconds = Number.isFinite(lastRunTimestamp)
    ? Math.max(0, Math.floor((now.getTime() - lastRunTimestamp) / 1000))
    : null;
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const serverHealthy = Boolean(
    settings.enabled &&
      cronSecretConfigured &&
      settings.lastRunSource === "CRON" &&
      heartbeatAgeSeconds != null &&
      heartbeatAgeSeconds <= EXPECTED_SERVER_INTERVAL_MINUTES * 180
  );
  const statusText = !settings.enabled
    ? "自动交易未开启"
    : !cronSecretConfigured
      ? "Vercel尚未配置CRON_SECRET，服务器定时任务会被拒绝"
      : serverHealthy
      ? "服务器Cron心跳正常，电脑和浏览器可以关闭"
      : settings.lastRunAt
        ? "尚未检测到连续服务器Cron心跳；当前不要依赖关机运行"
        : "尚无服务器Cron运行记录";

  return {
    generatedAt: now.toISOString(),
    databaseReady,
    settings,
    server: {
      expectedIntervalMinutes: EXPECTED_SERVER_INTERVAL_MINUTES,
      strategyIntervalMinutes: settings.strategyIntervalMinutes,
      serverHealthy,
      cronSecretConfigured,
      heartbeatAgeSeconds,
      nextExpectedRunAt: settings.enabled
        ? addMinutes(settings.lastRunAt ?? now.toISOString(), EXPECTED_SERVER_INTERVAL_MINUTES)
        : null,
      nextFullScanAt: settings.enabled
        ? addMinutes(settings.lastFullScanAt ?? now.toISOString(), settings.strategyIntervalMinutes)
        : null,
      statusText,
      requiresVercelProForOneMinute: true,
    },
    mirrorEnabled: bitget.settings.enabled,
    executionAllowed: bitget.environment.executionAllowed,
    plans: databaseReady ? await resolvePredictionStrategyPlans(settings, now) : [],
    recentRuns: databaseReady ? await recentRuns() : [],
  };
}
