// MOOX_V7206_ALTCOIN_RADAR_TABLE
import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { evaluateExperimentalQimenAt, type ExperimentalQimenSnapshot } from "@/lib/forecasts/qimen-first-policy";

export type EarlyAltcoinVerdict = "EARLY_CANDIDATE" | "WAIT_PULLBACK" | "TOO_HOT" | "AVOID" | "WATCH";
export type EarlyAltcoinMarketStage = "ONCHAIN_ONLY" | "EARLY_CEX" | "DEX_AND_CEX" | "UNKNOWN";
export type EarlyAltcoinSourceTier = "S" | "A" | "NORMAL";
export type EarlyAltcoinXHeat = "UNKNOWN" | "COLD" | "LIGHT" | "WARM" | "HOT" | "OVERHEATED";

export type EarlyAltcoinCandidate = {
  id: string;
  symbol: string;
  name: string | null;
  sourceTier: EarlyAltcoinSourceTier;
  sourceLabelZh: string;
  sourceHandle: string;
  postedAt: string;
  postUrl: string;
  postExcerptZh: string;
  sourceMentionPriceUsd: number | null;
  returnSinceSourceMentionPct: number | null;
  contractAddress: string | null;
  chainId: string | null;
  dexName: string | null;
  dexUrl: string | null;
  marketStage: EarlyAltcoinMarketStage;
  marketStageZh: string;
  bitgetSpot: boolean;
  bitgetFutures: boolean;
  currentPriceUsd: number | null;
  change1hPct: number | null;
  change6hPct: number | null;
  change24hPct: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairAgeHours: number | null;
  pairCreatedAt: string | null;
  buys24h: number | null;
  sells24h: number | null;
  xMentions24h: number | null;
  xMentions7d: number | null;
  xHeat: EarlyAltcoinXHeat;
  xHeatZh: string;
  qimenGenesis: ExperimentalQimenSnapshot | null;
  qimenCurrent: ExperimentalQimenSnapshot | null;
  qimenRelationZh: string;
  qimenAnchorZh: string;
  firstSeenAt: string;
  firstSeenPriceUsd: number | null;
  returnSinceFirstSeenPct: number | null;
  maxObservedReturnPct: number | null;
  score: number;
  verdict: EarlyAltcoinVerdict;
  verdictZh: string;
  finalConclusionZh: string;
  actionZh: string;
  reasonsZh: string[];
  riskFlagsZh: string[];
};

export type EarlyAltcoinRadarReport = {
  version: 2;
  generatedAt: string;
  conclusionZh: string;
  actionSummaryZh: string[];
  candidateCount: number;
  earlyCandidateCount: number;
  sourceHealthZh: string;
  candidates: EarlyAltcoinCandidate[];
  noteZh: string;
};

type StoredPostRow = {
  username: string;
  post_id: string;
  post_url: string;
  posted_at: Date | string;
  text: string;
  parsed: unknown;
};
type StateRow = { payload: unknown; updated_at: Date | string };
type BitgetRow = Record<string, unknown>;
type DexPair = Record<string, unknown>;
type BaselineEntry = {
  firstSeenAt: string;
  firstPriceUsd: number | null;
  maxObservedReturnPct: number | null;
  sourceTier: EarlyAltcoinSourceTier;
};
type BaselineState = Record<string, BaselineEntry>;

const STATE_REPORT = "early_altcoin_radar_report_v2";
const STATE_BASELINES = "early_altcoin_radar_baselines_v2";
const BITGET_BASE = "https://api.bitget.com";
const DEX_BASE = "https://api.dexscreener.com";
const X_API_BASE = "https://api.x.com";

const SOURCE_PRIORITY: Record<string, { tier: EarlyAltcoinSourceTier; score: number; labelZh: string }> = {
  btckik: { tier: "S", score: 30, labelZh: "S级重点发现源" },
  jiujinshan2022: { tier: "A", score: 22, labelZh: "A级重点发现源" },
  meta8mate: { tier: "A", score: 22, labelZh: "A级重点发现源" },
};

const MAINSTREAM = new Set([
  "BTC","ETH","SOL","XRP","BNB","DOGE","ADA","AVAX","LINK","SUI","HYPE","TRX","TON","DOT","LTC","BCH","XAUT","XAG","CL","SPY","QQQ",
  "MU","GOOGL","GOOG","AAOI","COHR","LITE","RKLB","ASTS","SNDK","NVDA","AMD","TSLA","MSFT","AAPL","META","AMZN",
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return String(value ?? "").trim(); }
function numberOrNull(value: unknown): number | null { const n = Number(value); return Number.isFinite(n) ? n : null; }
function iso(value: Date | string): string { const d = value instanceof Date ? value : new Date(value); return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString(); }
function normalizedHandle(value: string): string { return value.replace(/^@+/, "").trim().toLowerCase(); }
function normalizedSymbol(value: string): string { return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function unique<T>(values: T[]): T[] { return Array.from(new Set(values)); }

function extractSourceMentionPriceUsd(raw: string): number | null {
  const patterns = [
    /(?:price|entry|buy|bought|at|价格|现价|入场|买入)[\s:=：@$]*([0-9]+(?:\.[0-9]+)?(?:e-?\d+)?)/i,
    /(?:\$|USDT\s*)\s*([0-9]+\.[0-9]{4,})\b/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const value = match?.[1] ? Number(match[1]) : Number.NaN;
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function xHeatLabel(heat: EarlyAltcoinXHeat): string {
  if (heat === "COLD") return "几乎无人提及";
  if (heat === "LIGHT") return "少量提及";
  if (heat === "WARM") return "正在升温";
  if (heat === "HOT") return "热门";
  if (heat === "OVERHEATED") return "过热";
  return "热度待取";
}

function classifyXHeat(mentions24h: number, mentions7d: number): EarlyAltcoinXHeat {
  if (mentions7d < 5) return "COLD";
  if (mentions7d < 20 && mentions24h < 8) return "LIGHT";
  if (mentions7d < 80 && mentions24h < 25) return "WARM";
  if (mentions7d >= 200 || mentions24h >= 60 || (mentions7d >= 80 && mentions24h >= mentions7d * 0.5)) return "OVERHEATED";
  return "HOT";
}

function xSearchQuery(symbol: string, contract: string | null): string {
  if (contract) return `"${contract}" -is:retweet`;
  return `($${symbol} OR #${symbol} OR "${symbol} token") -is:retweet`;
}

async function fetchXHeat(symbol: string, contract: string | null): Promise<{ mentions24h: number | null; mentions7d: number | null; heat: EarlyAltcoinXHeat }> {
  const bearer = process.env.X_BEARER_TOKEN?.trim() ?? "";
  if (!bearer) return { mentions24h: null, mentions7d: null, heat: "UNKNOWN" };
  const params = new URLSearchParams({ query: xSearchQuery(symbol, contract), granularity: "hour" });
  const response = await fetch(`${X_API_BASE}/2/tweets/counts/recent?${params}`, {
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${bearer}`, "User-Agent": "MOOX-Altcoin-Heat/1.0" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response?.ok) return { mentions24h: null, mentions7d: null, heat: "UNKNOWN" };
  const payload = record(await response.json().catch(() => null));
  const rows = array(payload.data).map(record);
  const mentions7d = rows.reduce((sum, row) => sum + Math.max(0, numberOrNull(row.tweet_count) ?? 0), 0);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const mentions24h = rows.reduce((sum, row) => {
    const end = Date.parse(text(row.end));
    return Number.isFinite(end) && end >= cutoff ? sum + Math.max(0, numberOrNull(row.tweet_count) ?? 0) : sum;
  }, 0);
  return { mentions24h, mentions7d, heat: classifyXHeat(mentions24h, mentions7d) };
}

function qimenRelation(genesis: ExperimentalQimenSnapshot | null, current: ExperimentalQimenSnapshot | null): string {
  if (!genesis?.available || !current?.available) return "奇门数据不足";
  if (genesis.direction === current.direction) return `先天/当前共振·${current.direction}`;
  return `先天${genesis.direction} / 当前${current.direction}`;
}

function parsedSymbols(parsed: unknown): string[] {
  const p = record(typeof parsed === "string" ? (() => { try { return JSON.parse(parsed); } catch { return {}; } })() : parsed);
  return unique(array(p.symbols).map((value) => normalizedSymbol(text(value))).filter(Boolean));
}

function extractContracts(raw: string): string[] {
  const evm = raw.match(/\b0x[a-fA-F0-9]{40}\b/g) ?? [];
  const sol: string[] = [];
  const re = /(?:\bCA\b|contract|token\s*address|合约(?:地址)?|地址)\s*[:：=]?\s*([1-9A-HJ-NP-Za-km-z]{32,44})/gi;
  for (const match of raw.matchAll(re)) if (match[1]) sol.push(match[1]);
  return unique([...evm, ...sol]);
}

function sourceInfo(username: string) {
  return SOURCE_PRIORITY[normalizedHandle(username)] ?? { tier: "NORMAL" as const, score: 8, labelZh: "普通早期发现源" };
}

async function readState<T>(key: string, fallback: T): Promise<T> {
  if (!prisma || !(await ensureExternalAnalystTables())) return fallback;
  const rows = await prisma.$queryRawUnsafe<StateRow[]>(`SELECT payload, updated_at FROM trade_external_analyst_state WHERE state_key = $1 LIMIT 1`, key);
  const value = rows[0]?.payload;
  if (typeof value === "string") { try { return JSON.parse(value) as T; } catch { return fallback; } }
  return value && typeof value === "object" ? value as T : fallback;
}

async function writeState(key: string, payload: unknown): Promise<void> {
  if (!prisma || !(await ensureExternalAnalystTables())) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    key,
    JSON.stringify(payload),
  );
}

async function priorityPosts(): Promise<StoredPostRow[]> {
  if (!prisma || !(await ensureExternalAnalystTables())) return [];
  return prisma.$queryRawUnsafe<StoredPostRow[]>(`
    SELECT username, post_id, post_url, posted_at, text, parsed
    FROM trade_external_analyst_posts
    WHERE LOWER(username) IN ('btckik','jiujinshan2022','meta8mate')
      AND posted_at >= NOW() - INTERVAL '7 days'
    ORDER BY posted_at DESC
    LIMIT 500
  `);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "MOOX-Early-Altcoin-Radar/1.0" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function dexPairs(query: string): Promise<DexPair[]> {
  if (!query) return [];
  const payload = record(await fetchJson(`${DEX_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`));
  return array(payload.pairs).filter((row): row is DexPair => Boolean(row && typeof row === "object"));
}

function pairLiquidity(row: DexPair): number { return numberOrNull(record(row.liquidity).usd) ?? 0; }
function bestDexPair(rows: DexPair[], contract: string | null, symbol: string): DexPair | null {
  const contractLower = contract?.toLowerCase() ?? "";
  const matches = rows.filter((row) => {
    const base = record(row.baseToken);
    const addr = text(base.address).toLowerCase();
    const sym = normalizedSymbol(text(base.symbol));
    if (contractLower) return addr === contractLower || text(row.pairAddress).toLowerCase() === contractLower;
    return sym === symbol;
  });
  const pool = matches.length ? matches : rows;
  return pool.sort((a, b) => pairLiquidity(b) - pairLiquidity(a))[0] ?? null;
}

function dexMetric(pair: DexPair | null, bucket: string, key?: string): number | null {
  if (!pair) return null;
  const root = record(pair[bucket]);
  return key ? numberOrNull(root[key]) : null;
}
function txCount(pair: DexPair | null, side: "buys" | "sells"): number | null {
  if (!pair) return null;
  const h24 = record(record(pair.txns).h24);
  return numberOrNull(h24[side]);
}

async function bitgetOnlineSymbols(): Promise<{ spot: Set<string>; futures: Set<string> }> {
  const get = async (category: string) => {
    const payload = record(await fetchJson(`${BITGET_BASE}/api/v3/market/instruments?category=${category}`));
    if (text(payload.code) !== "00000") return [] as BitgetRow[];
    return array(payload.data).filter((row): row is BitgetRow => Boolean(row && typeof row === "object"));
  };
  const [spotRows, futureRows] = await Promise.all([get("SPOT"), get("USDT-FUTURES")]);
  const online = (row: BitgetRow) => {
    const status = text(row.status ?? row.symbolStatus ?? row.state).toLowerCase();
    return !status || ["online","normal","listed","1"].includes(status);
  };
  return {
    spot: new Set(spotRows.filter(online).map((row) => text(row.symbol).toUpperCase())),
    futures: new Set(futureRows.filter(online).map((row) => text(row.symbol).toUpperCase())),
  };
}

function marketStage(bitgetSpot: boolean, bitgetFutures: boolean, pair: DexPair | null, pairAgeHours: number | null): EarlyAltcoinMarketStage {
  if (pair && !bitgetSpot && !bitgetFutures) return "ONCHAIN_ONLY";
  if ((bitgetSpot || bitgetFutures) && pair && (pairAgeHours ?? 9999) <= 30 * 24) return "DEX_AND_CEX";
  if (bitgetSpot || bitgetFutures) return "EARLY_CEX";
  return "UNKNOWN";
}
function stageZh(stage: EarlyAltcoinMarketStage): string {
  if (stage === "ONCHAIN_ONLY") return "仅链上 / 尚未发现Bitget交易市场";
  if (stage === "DEX_AND_CEX") return "早期链上 + 已有CEX交易";
  if (stage === "EARLY_CEX") return "已上CEX / 继续核验上市阶段";
  return "交易阶段待核验";
}

function candidateScore(input: {
  sourceScore: number; contract: string | null; pairAgeHours: number | null; liquidityUsd: number | null; volume24hUsd: number | null;
  change24hPct: number | null; bitgetSpot: boolean; bitgetFutures: boolean; pair: DexPair | null;
}): number {
  let score = input.sourceScore;
  if (input.contract) score += 10;
  if (input.pair) score += 8;
  if (input.pairAgeHours !== null) score += input.pairAgeHours <= 7 * 24 ? 15 : input.pairAgeHours <= 30 * 24 ? 8 : -5;
  if ((input.liquidityUsd ?? 0) >= 250_000) score += 15;
  else if ((input.liquidityUsd ?? 0) >= 50_000) score += 8;
  else if ((input.liquidityUsd ?? 0) > 0 && (input.liquidityUsd ?? 0) < 20_000) score -= 20;
  if ((input.volume24hUsd ?? 0) >= 500_000) score += 10;
  else if ((input.volume24hUsd ?? 0) >= 100_000) score += 5;
  if (!input.bitgetSpot && !input.bitgetFutures && input.pair) score += 5;
  if ((input.change24hPct ?? 0) >= 100) score -= 20;
  else if ((input.change24hPct ?? 0) >= 50) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function verdictFor(score: number, liquidityUsd: number | null, change24hPct: number | null, returnPct: number | null, xHeat: EarlyAltcoinXHeat): EarlyAltcoinVerdict {
  if ((liquidityUsd ?? 0) > 0 && (liquidityUsd ?? 0) < 10_000) return "AVOID";
  if (xHeat === "OVERHEATED") return "TOO_HOT";
  if ((change24hPct ?? 0) >= 100 || (returnPct ?? 0) >= 100) return "TOO_HOT";
  if (xHeat === "HOT" && (change24hPct ?? 0) >= 35) return "WAIT_PULLBACK";
  if (score >= 65) return "EARLY_CANDIDATE";
  if (score >= 50) return "WAIT_PULLBACK";
  return "WATCH";
}
function verdictZh(verdict: EarlyAltcoinVerdict): string {
  if (verdict === "EARLY_CANDIDATE") return "🚨 早期候选";
  if (verdict === "WAIT_PULLBACK") return "等待回踩";
  if (verdict === "TOO_HOT") return "已经过热";
  if (verdict === "AVOID") return "回避";
  return "继续观察";
}
function conclusion(verdict: EarlyAltcoinVerdict, stage: EarlyAltcoinMarketStage): { finalConclusionZh: string; actionZh: string } {
  if (verdict === "EARLY_CANDIDATE") return { finalConclusionZh: "这是本轮值得重点盯的早期山寨币线索，但仍属于高风险资产。", actionZh: stage === "ONCHAIN_ONLY" ? "先做链上安全核验；确认后只用小仓位等回踩" : "等回踩/右侧确认，小仓位试错，不追直线拉升" };
  if (verdict === "WAIT_PULLBACK") return { finalConclusionZh: "方向和资金结构有吸引力，但当前买点还不够好。", actionZh: "等明显回踩和承接，不追高" };
  if (verdict === "TOO_HOT") return { finalConclusionZh: "可能仍有叙事，但当前已经过热，赔率明显下降。", actionZh: "不追；等大幅回撤后重新评估" };
  if (verdict === "AVOID") return { finalConclusionZh: "当前链上流动性/风险条件不合格。", actionZh: "回避，不买" };
  return { finalConclusionZh: "有早期线索，但证据不足，暂时不是交易机会。", actionZh: "继续观察，暂不买" };
}

function riskFlags(liquidityUsd: number | null, pairAgeHours: number | null, change24hPct: number | null, contract: string | null): string[] {
  const flags: string[] = [];
  if (!contract) flags.push("未识别到明确合约地址，需防同名假币");
  if (liquidityUsd === null) flags.push("暂无可靠DEX流动性数据");
  else if (liquidityUsd < 20_000) flags.push("链上流动性很低");
  if (pairAgeHours !== null && pairAgeHours < 12) flags.push("池子创建不足12小时，极早期高风险");
  if ((change24hPct ?? 0) >= 80) flags.push("24小时涨幅过大，追高风险高");
  return flags;
}

export async function generateAndStoreEarlyAltcoinRadar(now = new Date()): Promise<EarlyAltcoinRadarReport> {
  const [posts, bitget, baselines] = await Promise.all([priorityPosts(), bitgetOnlineSymbols(), readState<BaselineState>(STATE_BASELINES, {})]);
  const candidateInputs: Array<{ row: StoredPostRow; symbol: string; contract: string | null }> = [];
  const seen = new Set<string>();

  for (const row of posts) {
    const handle = normalizedHandle(row.username);
    const source = sourceInfo(handle);
    if (source.tier === "NORMAL") continue;
    const symbols = parsedSymbols(row.parsed).filter((symbol) => symbol && !MAINSTREAM.has(symbol) && symbol.length <= 15);
    const contracts = extractContracts(row.text);
    if (contracts.length > 0) {
      for (const contract of contracts.slice(0, 2)) {
        const symbol = symbols[0] ?? "UNKNOWN";
        const key = `${handle}:${contract.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); candidateInputs.push({ row, symbol, contract }); }
      }
    } else {
      for (const symbol of symbols.slice(0, 3)) {
        const key = `${handle}:${row.post_id}:${symbol}`;
        if (!seen.has(key)) { seen.add(key); candidateInputs.push({ row, symbol, contract: null }); }
      }
    }
  }

  const candidates: EarlyAltcoinCandidate[] = [];
  const boundedInputs = candidateInputs.slice(0, 32);
  let xHeatBudget = 12;
  for (let offset = 0; offset < boundedInputs.length; offset += 8) {
    const batch = boundedInputs.slice(offset, offset + 8);
    const built = await Promise.all(batch.map(async (input): Promise<EarlyAltcoinCandidate | null> => {
    const source = sourceInfo(input.row.username);
    const sourceMentionPriceUsd = extractSourceMentionPriceUsd(input.row.text);
    const search = input.contract ?? input.symbol;
    const pairs = await dexPairs(search).catch(() => []);
    const pair = bestDexPair(pairs, input.contract, input.symbol);
    const baseToken = pair ? record(pair.baseToken) : {};
    const resolvedSymbol = normalizedSymbol(text(baseToken.symbol)) || input.symbol;
    if (!resolvedSymbol || MAINSTREAM.has(resolvedSymbol)) return null;
    const name = text(baseToken.name) || null;
    const contractAddress = input.contract ?? (text(baseToken.address) || null);
    const chainId = pair ? text(pair.chainId) || null : null;
    const currentPriceUsd = pair ? numberOrNull(pair.priceUsd) : null;
    const liquidityUsd = pair ? numberOrNull(record(pair.liquidity).usd) : null;
    const volume24hUsd = dexMetric(pair, "volume", "h24");
    const change1hPct = dexMetric(pair, "priceChange", "h1");
    const change6hPct = dexMetric(pair, "priceChange", "h6");
    const change24hPct = dexMetric(pair, "priceChange", "h24");
    const pairCreatedAtMs = pair ? numberOrNull(pair.pairCreatedAt) : null;
    const pairCreatedAt = pairCreatedAtMs !== null ? new Date(pairCreatedAtMs).toISOString() : null;
    const pairAgeHours = pairCreatedAtMs !== null ? Math.max(0, (now.getTime() - pairCreatedAtMs) / 3_600_000) : null;
    const symbolPair = `${resolvedSymbol}USDT`;
    const bitgetSpot = bitget.spot.has(symbolPair);
    const bitgetFutures = bitget.futures.has(symbolPair);
    const stage = marketStage(bitgetSpot, bitgetFutures, pair, pairAgeHours);
    const id = contractAddress ? `${chainId ?? "chain"}:${contractAddress.toLowerCase()}` : `${normalizedHandle(input.row.username)}:${resolvedSymbol}`;
    const baseline = baselines[id] ?? { firstSeenAt: now.toISOString(), firstPriceUsd: currentPriceUsd, maxObservedReturnPct: null, sourceTier: source.tier };
    const returnPct = baseline.firstPriceUsd !== null && currentPriceUsd !== null && baseline.firstPriceUsd > 0 ? ((currentPriceUsd / baseline.firstPriceUsd) - 1) * 100 : null;
    const maxObservedReturnPct = returnPct === null ? baseline.maxObservedReturnPct : Math.max(baseline.maxObservedReturnPct ?? returnPct, returnPct);
    baselines[id] = { ...baseline, maxObservedReturnPct, sourceTier: source.tier };
    const returnSinceSourceMentionPct = sourceMentionPriceUsd !== null && currentPriceUsd !== null && sourceMentionPriceUsd > 0
      ? ((currentPriceUsd / sourceMentionPriceUsd) - 1) * 100
      : null;
    const canFetchHeat = xHeatBudget > 0;
    if (canFetchHeat) xHeatBudget -= 1;
    const heat = canFetchHeat
      ? await fetchXHeat(resolvedSymbol, contractAddress).catch(() => ({ mentions24h: null, mentions7d: null, heat: "UNKNOWN" as EarlyAltcoinXHeat }))
      : { mentions24h: null, mentions7d: null, heat: "UNKNOWN" as EarlyAltcoinXHeat };
    const genesisCastAt = pairCreatedAt ?? iso(input.row.posted_at);
    const [qimenGenesis, qimenCurrent] = await Promise.all([
      Promise.resolve().then(() => evaluateExperimentalQimenAt(resolvedSymbol, genesisCastAt)).catch(() => null),
      Promise.resolve().then(() => evaluateExperimentalQimenAt(resolvedSymbol, now)).catch(() => null),
    ]);
    const scoreBase = candidateScore({ sourceScore: source.score, contract: contractAddress, pairAgeHours, liquidityUsd, volume24hUsd, change24hPct, bitgetSpot, bitgetFutures, pair });
    const score = Math.max(0, Math.min(100, scoreBase + (heat.heat === "LIGHT" ? 5 : heat.heat === "WARM" ? 2 : heat.heat === "OVERHEATED" ? -15 : 0)));
    const verdict = verdictFor(score, liquidityUsd, change24hPct, returnPct, heat.heat);
    const decision = conclusion(verdict, stage);
    const reasons: string[] = [
      `${source.labelZh}首次/近期发现`,
      stageZh(stage),
    ];
    if (pairAgeHours !== null) reasons.push(`主池年龄约${pairAgeHours < 48 ? pairAgeHours.toFixed(1) + "小时" : (pairAgeHours / 24).toFixed(1) + "天"}`);
    if (liquidityUsd !== null) reasons.push(`DEX流动性约$${Math.round(liquidityUsd).toLocaleString("en-US")}`);
    if (volume24hUsd !== null) reasons.push(`24h成交约$${Math.round(volume24hUsd).toLocaleString("en-US")}`);
    if (returnPct !== null) reasons.push(`MOOX首次记录后表现${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`);
    if (heat.mentions7d !== null) reasons.push(`X近7天约${heat.mentions7d}条提及：${xHeatLabel(heat.heat)}`);
    if (qimenGenesis?.available && qimenCurrent?.available) reasons.push(`实验奇门：${qimenRelation(qimenGenesis, qimenCurrent)}`);

    return {
      id,
      symbol: resolvedSymbol,
      name,
      sourceTier: source.tier,
      sourceLabelZh: source.labelZh,
      sourceHandle: `@${normalizedHandle(input.row.username)}`,
      postedAt: iso(input.row.posted_at),
      postUrl: input.row.post_url,
      postExcerptZh: input.row.text.replace(/\s+/g, " ").trim().slice(0, 180),
      sourceMentionPriceUsd,
      returnSinceSourceMentionPct,
      contractAddress,
      chainId,
      dexName: pair ? text(pair.dexId) || null : null,
      dexUrl: pair ? text(pair.url) || null : null,
      marketStage: stage,
      marketStageZh: stageZh(stage),
      bitgetSpot,
      bitgetFutures,
      currentPriceUsd,
      change1hPct,
      change6hPct,
      change24hPct,
      liquidityUsd,
      volume24hUsd,
      marketCapUsd: pair ? numberOrNull(pair.marketCap) : null,
      fdvUsd: pair ? numberOrNull(pair.fdv) : null,
      pairAgeHours,
      pairCreatedAt,
      buys24h: txCount(pair, "buys"),
      sells24h: txCount(pair, "sells"),
      xMentions24h: heat.mentions24h,
      xMentions7d: heat.mentions7d,
      xHeat: heat.heat,
      xHeatZh: xHeatLabel(heat.heat),
      qimenGenesis,
      qimenCurrent,
      qimenRelationZh: qimenRelation(qimenGenesis, qimenCurrent),
      qimenAnchorZh: pairCreatedAt ? "首池创建时间" : "博主发布时间（无链上创建时间）",
      firstSeenAt: baseline.firstSeenAt,
      firstSeenPriceUsd: baseline.firstPriceUsd,
      returnSinceFirstSeenPct: returnPct,
      maxObservedReturnPct,
      score,
      verdict,
      verdictZh: verdictZh(verdict),
      finalConclusionZh: decision.finalConclusionZh,
      actionZh: decision.actionZh,
      reasonsZh: reasons.slice(0, 6),
      riskFlagsZh: riskFlags(liquidityUsd, pairAgeHours, change24hPct, contractAddress),
    };
    }));
    candidates.push(...built.filter((row): row is EarlyAltcoinCandidate => row !== null));
  }

  candidates.sort((a, b) => {
    const tier = (value: EarlyAltcoinSourceTier) => value === "S" ? 3 : value === "A" ? 2 : 1;
    return tier(b.sourceTier) - tier(a.sourceTier) || b.score - a.score || Date.parse(b.postedAt) - Date.parse(a.postedAt);
  });

  const early = candidates.filter((row) => row.verdict === "EARLY_CANDIDATE");
  const conclusionZh = early.length > 0
    ? `本轮发现${early.length}个值得重点盯的早期山寨币线索：${early.slice(0, 4).map((row) => row.symbol).join("、")}。先看安全和买点，不允许因博主提及直接追涨。`
    : "本轮没有达到“早期候选”门槛的新币。继续扫描，不为了凑数量硬推荐。";
  const actionSummaryZh = early.length > 0
    ? early.slice(0, 5).map((row) => `${row.symbol}：${row.actionZh}`)
    : candidates.slice(0, 5).map((row) => `${row.symbol}：${row.actionZh}`);

  const report: EarlyAltcoinRadarReport = {
    version: 2,
    generatedAt: now.toISOString(),
    conclusionZh,
    actionSummaryZh,
    candidateCount: candidates.length,
    earlyCandidateCount: early.length,
    sourceHealthZh: "重点扫描：1个S级早期发现源 + 2个A级早期发现源；S级单一信号允许先进入雷达，但不能绕过链上与流动性核验。",
    candidates: candidates.slice(0, 30),
    noteZh: "热度来自X最近7天公开提及计数；实验奇门使用首池创建时间作为先天锚点、当前扫描时间作为当前盘。两者都只用于研究筛选，不触发交易。",
  };
  await Promise.all([writeState(STATE_BASELINES, baselines), writeState(STATE_REPORT, report)]);
  return report;
}

export async function getLatestEarlyAltcoinRadar(): Promise<EarlyAltcoinRadarReport | null> {
  return readState<EarlyAltcoinRadarReport | null>(STATE_REPORT, null);
}

export async function getOrRefreshEarlyAltcoinRadar(maxAgeMinutes = 20): Promise<EarlyAltcoinRadarReport> {
  const report = await getLatestEarlyAltcoinRadar();
  if (report && Date.now() - Date.parse(report.generatedAt) <= maxAgeMinutes * 60_000) return report;
  return generateAndStoreEarlyAltcoinRadar();
}
