import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import type {
  XIntelligenceDirection,
  XIntelligenceRisk,
  XIntelligenceStage,
  XIntelligenceSymbolSummary,
} from "@/lib/trading-signals/x-intelligence-core";

export type XScanVerdict = "BUY_CANDIDATE" | "WATCH" | "DO_NOT_CHASE" | "AVOID" | "BEARISH_WATCH";
export type XScanMatch = "MATCHING" | "DIVERGING" | "PENDING" | "NO_PRICE";

export type XScanAssetReport = {
  symbol: string;
  displaySymbol: string;
  assetClassZh: string;
  baseCoin: string;
  whatIsItZh: string;
  whereToBuyZh: string[];
  spotAvailable: boolean;
  futuresAvailable: boolean;
  currentPrice: number | null;
  change24hPct: number | null;
  quoteVolume24h: number | null;
  direction: XIntelligenceDirection;
  stage: XIntelligenceStage;
  risk: XIntelligenceRisk;
  momentum: string;
  mentions6h: number;
  mentions24h: number;
  agreementRatio24h: number;
  averageConfidence: number;
  uniqueSources24h: number;
  firstSeenAt: string | null;
  firstSeenPrice: number | null;
  returnSinceSignalPct: number | null;
  forecastMatch: XScanMatch;
  verdict: XScanVerdict;
  verdictZh: string;
  finalConclusionZh: string;
  actionZh: string;
  planZh: string[];
  reasonsZh: string[];
  keyLevels: number[];
  timeWindows: string[];
};

export type XScanReport = {
  version: 1;
  generatedAt: string;
  collectorStatus: string;
  collectorMessage: string;
  totalPosts24h: number;
  parsedPosts24h: number;
  symbols24h: number;
  highValueCount: number;
  buyCandidateCount: number;
  hotspotSummaryZh: string;
  marketConclusionZh: string;
  topActionsZh: string[];
  assets: XScanAssetReport[];
  noteZh: string;
};

type BitgetMarketRow = Record<string, unknown>;
type BaselineState = Record<string, { direction: XIntelligenceDirection; firstSeenAt: string; firstPrice: number }>;
type StoredStateRow = { payload: unknown; updated_at: Date | string };

const BASE = "https://api.bitget.com";
const STATE_REPORT = "x_scan_report_v1";
const STATE_BASELINES = "x_scan_baselines_v1";

const PROJECT_CATALOG: Record<string, string> = {
  BTC: "比特币：加密市场核心资产与流动性锚。",
  ETH: "以太坊：智能合约与应用生态核心资产。",
  SOL: "Solana：高性能公链原生资产，生态覆盖DeFi、消费应用与链上交易。",
  HYPE: "HYPE：Hyperliquid生态代币，重点观察链上交易活跃度、协议增长与高波动风险。",
  XRP: "XRP：围绕跨境支付与XRPL生态的加密资产。",
  DOGE: "DOGE：高流动性的Meme类资产，叙事与风险偏好驱动明显。",
  SUI: "SUI：Layer 1公链生态资产，关注生态增长、解锁与流动性。",
  LINK: "LINK：Chainlink预言机与跨链基础设施生态资产。",
  AAVE: "AAVE：去中心化借贷协议治理与生态资产。",
  AVAX: "AVAX：Avalanche公链生态资产。",
  ARB: "ARB：Arbitrum Layer 2生态治理资产。",
  OP: "OP：Optimism及Superchain生态治理资产。",
  ONDO: "ONDO：RWA/链上金融叙事相关资产。",
  ENA: "ENA：Ethena生态资产，关注稳定币机制、收益率与风险敞口。",
  INJ: "INJ：Injective生态资产，偏交易与金融应用叙事。",
  TAO: "TAO：Bittensor去中心化AI网络生态资产，AI叙事敏感度高。",
  PENDLE: "PENDLE：链上收益率交易协议生态资产。",
  PEPE: "PEPE：Meme类高波动资产，价格更依赖流动性与情绪。",
  WIF: "WIF：Solana生态Meme类高波动资产。",
};

const US_EQUITY_SYMBOLS = new Set(["MU","GOOGL","GOOG","AAOI","COHR","LITE","RKLB","ASTS","SNDK","SPCX","NVDA","AMD","TSLA","MSFT","AAPL","META","AMZN"]);
const ETF_SYMBOLS = new Set(["SPY","QQQ"]);
const COMMODITY_SYMBOLS = new Set(["CL","WTI","XAU","XAUT","XAG","GOLD","SILVER"]);

function assetClassZh(baseCoin: string): string {
  if (US_EQUITY_SYMBOLS.has(baseCoin)) return "美股 / 代币化市场映射";
  if (ETF_SYMBOLS.has(baseCoin)) return "ETF / 指数映射";
  if (baseCoin === "CL" || baseCoin === "WTI") return "原油 / 商品映射";
  if (COMMODITY_SYMBOLS.has(baseCoin)) return "贵金属 / 商品映射";
  return "加密资产";
}

function conclusionFor(verdict: XScanVerdict, direction: XIntelligenceDirection): { finalConclusionZh: string; actionZh: string; planZh: string[] } {
  if (verdict === "BUY_CANDIDATE") {
    return {
      finalConclusionZh: "偏多，属于本轮可操作候选；方向明确，但不建议追着上涨买。",
      actionZh: "等待回踩或右侧确认后买入",
      planZh: ["优先等回踩关键支撑或突破后回踩确认", "若直接快速拉升则放弃追高，等下一次结构机会"],
    };
  }
  if (verdict === "DO_NOT_CHASE") {
    return {
      finalConclusionZh: "方向可能仍偏多，但当前位置已经不适合追涨。",
      actionZh: "不追；等待明显回撤后重新评估",
      planZh: ["已经持有可继续观察止盈条件", "空仓不要因X热度直接追高"],
    };
  }
  if (verdict === "AVOID") {
    return {
      finalConclusionZh: "当前风险明显大于机会。",
      actionZh: "回避，不开新仓",
      planZh: ["等待风险指标和价格结构恢复", "不要因为讨论热度逆着风险条件交易"],
    };
  }
  if (verdict === "BEARISH_WATCH") {
    return {
      finalConclusionZh: "当前方向偏空；只适用于允许做空的市场观察。",
      actionZh: "多头回避；可做空市场等待技术入场点",
      planZh: ["不在下跌加速段盲目追空", "A股类资产不生成做空操作建议"],
    };
  }
  return {
    finalConclusionZh: direction === "LONG"
      ? "偏多线索存在，但证据还不够形成交易机会。"
      : direction === "SHORT"
        ? "偏空线索存在，但目前不够形成高质量交易机会。"
        : "目前没有明确交易机会。",
    actionZh: "继续观察，暂不操作",
    planZh: ["等方向共识、价格结构和关键位同时变清楚再行动"],
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): BitgetMarketRow[] {
  return Array.isArray(value) ? value.filter((row): row is BitgetMarketRow => Boolean(row && typeof row === "object")) : [];
}

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeBase(symbol: string): string {
  const s = symbol.trim().toUpperCase().replace(/[-_/\s]/g, "");
  return s.endsWith("USDT") ? s.slice(0, -4) : s.endsWith("USD") ? s.slice(0, -3) : s;
}

function pairFor(symbol: string): string {
  return `${normalizeBase(symbol)}USDT`;
}

function rowSymbol(row: BitgetMarketRow): string {
  return String(row.symbol ?? "").toUpperCase();
}

function isOnline(row: BitgetMarketRow | undefined): boolean {
  if (!row) return false;
  const raw = String(row.status ?? row.symbolStatus ?? row.state ?? "").toLowerCase();
  return raw === "online" || raw === "normal" || raw === "listed" || raw === "1" || raw === "";
}

async function fetchBitgetList(path: string): Promise<BitgetMarketRow[]> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "MOOX-X-Radar/1.0" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const payload = asRecord(await res.json().catch(() => ({})));
  if (String(payload.code ?? "") !== "00000") return [];
  return asArray(payload.data);
}

async function marketMaps() {
  const [spotInstruments, spotTickers, futuresInstruments, futuresTickers] = await Promise.all([
    fetchBitgetList("/api/v3/market/instruments?category=SPOT"),
    fetchBitgetList("/api/v3/market/tickers?category=SPOT"),
    fetchBitgetList("/api/v3/market/instruments?category=USDT-FUTURES"),
    fetchBitgetList("/api/v3/market/tickers?category=USDT-FUTURES"),
  ]);
  return {
    spotInstruments: new Map(spotInstruments.map((row) => [rowSymbol(row), row])),
    spotTickers: new Map(spotTickers.map((row) => [rowSymbol(row), row])),
    futuresInstruments: new Map(futuresInstruments.map((row) => [rowSymbol(row), row])),
    futuresTickers: new Map(futuresTickers.map((row) => [rowSymbol(row), row])),
  };
}

function tickerPrice(row: BitgetMarketRow | undefined): number | null {
  if (!row) return null;
  return finite(row.lastPrice ?? row.lastPr ?? row.markPrice ?? row.price);
}

function tickerChangePct(row: BitgetMarketRow | undefined): number | null {
  if (!row) return null;
  const direct = finite(row.price24hPcnt ?? row.change24h ?? row.priceChangePercent);
  if (direct !== null) return Math.abs(direct) <= 2.5 ? direct * 100 : direct;
  const last = tickerPrice(row);
  const open = finite(row.openPrice24h ?? row.open24h ?? row.open);
  return last !== null && open !== null && open > 0 ? ((last / open) - 1) * 100 : null;
}

function tickerQuoteVolume(row: BitgetMarketRow | undefined): number | null {
  if (!row) return null;
  return finite(row.quoteVolume ?? row.usdtVolume ?? row.turnover24h ?? row.quoteVol);
}

function parseState<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value && typeof value === "object" ? value as T : fallback;
}

async function readState<T>(key: string, fallback: T): Promise<{ value: T; updatedAt: string | null }> {
  if (!prisma || !(await ensureExternalAnalystTables())) return { value: fallback, updatedAt: null };
  const rows = await prisma.$queryRawUnsafe<StoredStateRow[]>(
    `SELECT payload, updated_at FROM trade_external_analyst_state WHERE state_key = $1 LIMIT 1`,
    key
  );
  const row = rows[0];
  if (!row) return { value: fallback, updatedAt: null };
  const date = row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at);
  return { value: parseState(row.payload, fallback), updatedAt: Number.isNaN(date.getTime()) ? null : date.toISOString() };
}

async function writeState(key: string, value: unknown): Promise<void> {
  if (!prisma || !(await ensureExternalAnalystTables())) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    key,
    JSON.stringify(value)
  );
}

function verdictFor(summary: XIntelligenceSymbolSummary, change24hPct: number | null, spotAvailable: boolean): XScanVerdict {
  const absMove = Math.abs(change24hPct ?? 0);
  if (summary.direction === "SHORT") return summary.risk === "HIGH" ? "AVOID" : "BEARISH_WATCH";
  if (summary.direction !== "LONG") return "WATCH";
  if (summary.dominantStage === "OVERHEATED" || summary.risk === "HIGH" || absMove >= 18) return "DO_NOT_CHASE";
  const stageOkay = summary.dominantStage === "EARLY_WATCH" || summary.dominantStage === "CONFIRMATION";
  const evidenceOkay = summary.uniqueSources24h >= 2 && summary.agreementRatio24h >= 0.67 && summary.averageConfidence >= 60;
  const priceOkay = (change24hPct ?? 0) <= 12;
  return stageOkay && evidenceOkay && priceOkay && spotAvailable ? "BUY_CANDIDATE" : "WATCH";
}

function verdictZh(v: XScanVerdict): string {
  if (v === "BUY_CANDIDATE") return "🚨 买入候选";
  if (v === "DO_NOT_CHASE") return "不追高";
  if (v === "AVOID") return "回避";
  if (v === "BEARISH_WATCH") return "偏空观察";
  return "继续观察";
}

function forecastMatch(direction: XIntelligenceDirection, ret: number | null): XScanMatch {
  if (ret === null) return "NO_PRICE";
  if (Math.abs(ret) < 1) return "PENDING";
  if (direction === "LONG") return ret > 0 ? "MATCHING" : ret <= -2 ? "DIVERGING" : "PENDING";
  if (direction === "SHORT") return ret < 0 ? "MATCHING" : ret >= 2 ? "DIVERGING" : "PENDING";
  return "PENDING";
}

function reasons(summary: XIntelligenceSymbolSummary, change24hPct: number | null, verdict: XScanVerdict): string[] {
  const out: string[] = [];
  out.push(`24小时${summary.mentions24h}条有效提及，近6小时${summary.mentions6h}条`);
  out.push(`来源一致度${Math.round(summary.agreementRatio24h * 100)}%，平均置信度${summary.averageConfidence}%`);
  if (summary.momentum === "NEW") out.push("属于新出现叙事，优先观察持续性");
  if (summary.momentum === "ACCELERATING") out.push("热度正在加速，需要同时防止追高");
  if (change24hPct !== null) out.push(`当前24小时涨跌约${change24hPct >= 0 ? "+" : ""}${change24hPct.toFixed(1)}%`);
  if (verdict === "BUY_CANDIDATE") out.push("多来源同向、阶段未过热且Bitget现货可交易，达到MOOX买入候选门槛");
  if (verdict === "DO_NOT_CHASE") out.push("方向可能仍偏多，但过热/高风险/涨幅过大，不把好叙事等同于好买点");
  return out.slice(0, 5);
}

export async function generateAndStoreXScanReport(now = new Date()): Promise<XScanReport> {
  const [snapshot, markets, baselineRead] = await Promise.all([
    getXIntelligenceSnapshot({ force: true, now }),
    marketMaps().catch(() => ({ spotInstruments: new Map<string, BitgetMarketRow>(), spotTickers: new Map<string, BitgetMarketRow>(), futuresInstruments: new Map<string, BitgetMarketRow>(), futuresTickers: new Map<string, BitgetMarketRow>() })),
    readState<BaselineState>(STATE_BASELINES, {}),
  ]);
  const baselines: BaselineState = { ...baselineRead.value };
  const assets: XScanAssetReport[] = [];

  for (const summary of snapshot.aggregate.summaries.filter((row) => row.mentions24h > 0 || row.momentum === "NEW").slice(0, 20)) {
    const baseCoin = normalizeBase(summary.symbol);
    const pair = pairFor(summary.symbol);
    const spotInstrument = markets.spotInstruments.get(pair);
    const futuresInstrument = markets.futuresInstruments.get(pair);
    const spotAvailable = isOnline(spotInstrument);
    const futuresAvailable = isOnline(futuresInstrument);
    const ticker = markets.spotTickers.get(pair) ?? markets.futuresTickers.get(pair);
    const currentPrice = tickerPrice(ticker);
    const change24hPct = tickerChangePct(ticker);
    const quoteVolume24h = tickerQuoteVolume(ticker);
    let baseline = baselines[pair];
    if (currentPrice !== null && summary.direction !== "NEUTRAL" && (!baseline || baseline.direction !== summary.direction)) {
      baseline = { direction: summary.direction, firstSeenAt: now.toISOString(), firstPrice: currentPrice };
      baselines[pair] = baseline;
    }
    const returnSinceSignalPct = baseline && currentPrice !== null && baseline.firstPrice > 0
      ? ((currentPrice / baseline.firstPrice) - 1) * 100
      : null;
    const verdict = verdictFor(summary, change24hPct, spotAvailable);
    const whereToBuyZh = [
      spotAvailable ? `Bitget现货 ${pair}` : null,
      futuresAvailable ? `Bitget U本位合约 ${pair}` : null,
    ].filter((value): value is string => Boolean(value));
    if (!whereToBuyZh.length) whereToBuyZh.push("Bitget当前未检测到在线交易市场；不据此推荐其他平台");

    const decision = conclusionFor(verdict, summary.direction);
    assets.push({
      symbol: pair,
      displaySymbol: baseCoin,
      assetClassZh: assetClassZh(baseCoin),
      baseCoin,
      whatIsItZh: PROJECT_CATALOG[baseCoin] ?? `${baseCoin}：X扫描识别出的市场资产符号；MOOX当前缺少可靠项目画像，先看资金与交易结构，不因热度单独买入。`,
      whereToBuyZh,
      spotAvailable,
      futuresAvailable,
      currentPrice,
      change24hPct,
      quoteVolume24h,
      direction: summary.direction,
      stage: summary.dominantStage,
      risk: summary.risk,
      momentum: summary.momentum,
      mentions6h: summary.mentions6h,
      mentions24h: summary.mentions24h,
      agreementRatio24h: summary.agreementRatio24h,
      averageConfidence: summary.averageConfidence,
      uniqueSources24h: summary.uniqueSources24h,
      firstSeenAt: baseline?.firstSeenAt ?? null,
      firstSeenPrice: baseline?.firstPrice ?? null,
      returnSinceSignalPct,
      forecastMatch: forecastMatch(summary.direction, returnSinceSignalPct),
      verdict,
      verdictZh: verdictZh(verdict),
      finalConclusionZh: decision.finalConclusionZh,
      actionZh: decision.actionZh,
      planZh: decision.planZh,
      reasonsZh: reasons(summary, change24hPct, verdict),
      keyLevels: summary.keyLevels,
      timeWindows: summary.timeWindows,
    });
  }

  const buyCandidateCount = assets.filter((row) => row.verdict === "BUY_CANDIDATE").length;
  const highValueCount = assets.filter((row) => row.verdict === "BUY_CANDIDATE" || (row.direction !== "NEUTRAL" && row.momentum !== "COOLING")).length;
  const actionable = assets.filter((row) => row.verdict === "BUY_CANDIDATE");
  const top = assets.slice(0, 3).map((row) => `${row.displaySymbol}（${row.verdictZh}）`).join("、");
  const marketConclusionZh = actionable.length > 0
    ? `本轮发现${actionable.length}个值得继续执行的候选：${actionable.slice(0, 3).map((row) => row.displaySymbol).join("、")}。先等合适买点，不追涨。`
    : "目前没有值得立即出手的机会。热点很多不代表可以买，继续等待更清晰的方向和买点。";
  const topActionsZh = actionable.length > 0
    ? actionable.slice(0, 5).map((row) => `${row.displaySymbol}：${row.actionZh}`)
    : assets.slice(0, 5).map((row) => `${row.displaySymbol}：${row.actionZh}`);
  const report: XScanReport = {
    version: 1,
    generatedAt: now.toISOString(),
    collectorStatus: snapshot.collector.status,
    collectorMessage: snapshot.collector.message,
    totalPosts24h: snapshot.aggregate.totalPosts24h,
    parsedPosts24h: snapshot.aggregate.parsedPosts24h,
    symbols24h: snapshot.aggregate.symbols24h,
    highValueCount,
    buyCandidateCount,
    hotspotSummaryZh: top ? `本轮讨论热点：${top}` : "本轮未发现达到展示门槛的新热点。",
    marketConclusionZh,
    topActionsZh,
    assets,
    noteZh: "X扫描只作为外部情报层：不会单独触发Bitget自动下单。买入候选也必须继续核对价格、流动性、失效位与MOOX主策略。",
  };
  await Promise.all([writeState(STATE_BASELINES, baselines), writeState(STATE_REPORT, report)]);
  return report;
}

export async function getLatestXScanReport(): Promise<XScanReport | null> {
  const state = await readState<XScanReport | null>(STATE_REPORT, null);
  return state.value;
}

export async function getOrRefreshXScanReport(maxAgeMinutes = 20): Promise<XScanReport> {
  const state = await readState<XScanReport | null>(STATE_REPORT, null);
  const stamp = state.value?.generatedAt ?? state.updatedAt;
  if (state.value && stamp && Date.now() - Date.parse(stamp) <= maxAgeMinutes * 60_000) return state.value;
  return generateAndStoreXScanReport();
}
