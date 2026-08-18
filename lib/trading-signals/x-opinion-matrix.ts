import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { X_SOURCE_REGISTRY, xSourceFamilyForHandle } from "@/lib/trading-signals/x-source-registry.server";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

import type { XOpinionApproval, XOpinionApprovalStatus, XOpinionAsset, XOpinionCell, XOpinionDirection, XOpinionMatrix } from "@/types/x-opinion-matrix";

export const X_OPINION_MATRIX_ASSETS: readonly XOpinionAsset[] = [
  { code: "BTC", label: "比特币", aliases: ["BTC", "BTCUSDT", "BITCOIN", "比特币", "大饼"] },
  { code: "ETH", label: "以太坊", aliases: ["ETH", "ETHUSDT", "ETHEREUM", "以太坊"] },
  { code: "SOL", label: "SOL", aliases: ["SOL", "SOLUSDT", "SOLANA"] },
  { code: "HYPE", label: "HYPE", aliases: ["HYPE", "HYPEUSDT", "HYPERLIQUID"] },
  { code: "SPX", label: "标普500", aliases: ["SPX", "SPY", "S&P500", "S&P 500", "标普"] },
  { code: "NDX", label: "纳指100", aliases: ["NDX", "QQQ", "NASDAQ", "纳指", "纳斯达克"] },
  { code: "SHCOMP", label: "上证A股", aliases: ["SHCOMP", "SSEC", "上证", "A股", "沪指"] },
  { code: "HSTECH", label: "恒生科技", aliases: ["HSTECH", "恒生科技", "恒科"] },
  { code: "GOLD", label: "黄金", aliases: ["GOLD", "XAU", "XAUUSD", "黄金"] },
  { code: "SILVER", label: "白银", aliases: ["SILVER", "XAG", "XAGUSD", "白银"] },
  { code: "WTI", label: "WTI原油", aliases: ["WTI", "CL", "CRUDE", "原油"] },
  { code: "MU", label: "美光", aliases: ["MU", "MICRON", "美光"] },
  { code: "SNDK", label: "闪迪", aliases: ["SNDK", "SANDISK", "闪迪"] },
  { code: "TSLA", label: "特斯拉", aliases: ["TSLA", "TESLA", "特斯拉"] },
  { code: "GOOGL", label: "谷歌", aliases: ["GOOGL", "GOOG", "GOOGLE", "ALPHABET", "谷歌"] },
  { code: "MSFT", label: "微软", aliases: ["MSFT", "MICROSOFT", "微软"] },
  { code: "NVDA", label: "英伟达", aliases: ["NVDA", "NVIDIA", "英伟达"] },
  { code: "SPCX", label: "SPCX", aliases: ["SPCX", "SPACEX", "SPACE X"] },
  { code: "LITE", label: "Lumentum", aliases: ["LITE", "LUMENTUM"] },
  { code: "AAOI", label: "AAOI", aliases: ["AAOI", "APPLIED OPTOELECTRONICS"] },
  { code: "COHR", label: "Coherent", aliases: ["COHR", "COHERENT"] },
] as const;

type StoredPostRow = {
  username: string;
  post_id: string;
  post_url: string;
  posted_at: Date | string;
  text: string;
  parsed: unknown;
};

type ApprovalRow = {
  id: string;
  username: string;
  post_id: string;
  symbol: string;
  status: string;
  weight_pct: number;
  display_allowed: boolean;
  note: string | null;
  updated_at: Date | string;
};

const APPROVAL_TABLE = "trade_external_analyst_approvals";

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value && typeof value === "object" ? value as T : fallback;
}

function iso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function normalizeText(value: string): string {
  return value.toUpperCase().replace(/\s+/g, " ");
}

function aliasHit(text: string, alias: string): boolean {
  const a = alias.toUpperCase();
  if (/^[A-Z0-9]+$/.test(a)) {
    return new RegExp(`(^|[^A-Z0-9])\\$?${a}($|[^A-Z0-9])`, "i").test(text);
  }
  return text.includes(a);
}

function detectedAssets(parsed: ExternalAnalystParsedPost, text: string): string[] {
  const found = new Set<string>();
  const parsedSymbols = parsed.symbols.map((s) => s.toUpperCase().replace(/USDT$/, ""));
  for (const asset of X_OPINION_MATRIX_ASSETS) {
    if (parsedSymbols.some((s) => asset.aliases.some((a) => s === a.toUpperCase().replace(/USDT$/, "")))) {
      found.add(asset.code);
      continue;
    }
    const normalized = normalizeText(text);
    if (asset.aliases.some((alias) => aliasHit(normalized, alias))) found.add(asset.code);
  }
  return [...found];
}

function brief(parsed: ExternalAnalystParsedPost): string {
  const raw = (parsed.summary || parsed.text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "仅识别到方向，未提取到摘要。";
  return raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
}

function approvalFromRow(row: ApprovalRow): XOpinionApproval {
  const status: XOpinionApprovalStatus = row.status === "APPROVED" || row.status === "REJECTED" ? row.status : "PENDING";
  return {
    id: row.id,
    username: row.username,
    postId: row.post_id,
    symbol: row.symbol,
    status,
    weightPct: Math.max(1, Math.min(10, Number(row.weight_pct) || 5)),
    displayAllowed: Boolean(row.display_allowed),
    note: row.note,
    updatedAt: iso(row.updated_at),
  };
}

export async function ensureXOpinionApprovalTable(): Promise<boolean> {
  const db = prisma;
  if (!db || !(await ensureExternalAnalystTables())) return false;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${APPROVAL_TABLE} (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      post_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      weight_pct INTEGER NOT NULL DEFAULT 5,
      display_allowed BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS trade_external_analyst_approvals_uq
    ON ${APPROVAL_TABLE}(username, post_id, symbol)
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS trade_external_analyst_approvals_symbol_status_idx
    ON ${APPROVAL_TABLE}(symbol, status, updated_at DESC)
  `);
  return true;
}

export async function setXOpinionApproval(input: {
  username: string;
  postId: string;
  symbol: string;
  status: XOpinionApprovalStatus;
  weightPct?: number;
  displayAllowed?: boolean;
  note?: string | null;
}): Promise<XOpinionApproval | null> {
  const db = prisma;
  if (!db || !(await ensureXOpinionApprovalTable())) return null;
  const username = input.username.replace(/^@/, "").trim();
  const symbol = input.symbol.trim().toUpperCase();
  const postId = input.postId.trim();
  if (!username || !symbol || !postId) throw new Error("INVALID_X_OPINION_KEY");
  const exists = await db.$queryRawUnsafe<Array<{ ok: number }>>(
    `SELECT 1 AS ok FROM trade_external_analyst_posts WHERE username = $1 AND post_id = $2 LIMIT 1`,
    username,
    postId,
  );
  if (!exists[0]) throw new Error("X_OPINION_SOURCE_POST_NOT_FOUND");
  const id = `${username.toLowerCase()}:${postId}:${symbol}`;
  const weight = Math.max(1, Math.min(10, Math.round(input.weightPct ?? 5)));
  const rows = await db.$queryRawUnsafe<ApprovalRow[]>(
    `INSERT INTO ${APPROVAL_TABLE}(id, username, post_id, symbol, status, weight_pct, display_allowed, note, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     ON CONFLICT (username, post_id, symbol) DO UPDATE SET
       status = EXCLUDED.status,
       weight_pct = EXCLUDED.weight_pct,
       display_allowed = EXCLUDED.display_allowed,
       note = EXCLUDED.note,
       updated_at = NOW()
     RETURNING id, username, post_id, symbol, status, weight_pct, display_allowed, note, updated_at`,
    id, username, postId, symbol, input.status, weight, Boolean(input.displayAllowed), input.note ?? null,
  );
  return rows[0] ? approvalFromRow(rows[0]) : null;
}

export async function getXOpinionMatrix(options: { lookbackDays?: number; now?: Date } = {}): Promise<XOpinionMatrix> {
  const now = options.now ?? new Date();
  const lookbackDays = Math.max(1, Math.min(30, Math.round(options.lookbackDays ?? 7)));
  const emptyRows = X_SOURCE_REGISTRY.map((entry) => ({
    username: entry.handle,
    family: entry.family,
    cells: Object.fromEntries(X_OPINION_MATRIX_ASSETS.map((asset) => [asset.code, null])) as Record<string, XOpinionCell | null>,
  }));
  const db = prisma;
  if (!db || !(await ensureXOpinionApprovalTable())) {
    return { generatedAt: now.toISOString(), lookbackDays, assets: X_OPINION_MATRIX_ASSETS, rows: emptyRows };
  }
  const [posts, approvals] = await Promise.all([
    db.$queryRawUnsafe<StoredPostRow[]>(
      `SELECT username, post_id, post_url, posted_at, text, parsed
       FROM trade_external_analyst_posts
       WHERE posted_at >= NOW() - ($1::int * INTERVAL '1 day')
       ORDER BY posted_at DESC
       LIMIT 1200`,
      lookbackDays,
    ),
    db.$queryRawUnsafe<ApprovalRow[]>(
      `SELECT id, username, post_id, symbol, status, weight_pct, display_allowed, note, updated_at
       FROM ${APPROVAL_TABLE}`,
    ),
  ]);
  const approvalMap = new Map(approvals.map((row) => [`${row.username.toLowerCase()}:${row.post_id}:${row.symbol.toUpperCase()}`, approvalFromRow(row)]));
  const rowMap = new Map(emptyRows.map((row) => [row.username.toLowerCase(), row]));

  for (const post of posts) {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(post.parsed, null);
    if (!parsed) continue;
    const row = rowMap.get(post.username.toLowerCase());
    if (!row) continue;
    for (const symbol of detectedAssets(parsed, post.text)) {
      if (row.cells[symbol]) continue;
      const key = `${post.username.toLowerCase()}:${post.post_id}:${symbol}`;
      const levels = [...new Set([
        ...parsed.supportLevels,
        ...parsed.resistanceLevels,
        ...parsed.targetLevels,
        ...parsed.invalidationLevels,
        ...parsed.keyLevels,
      ])].filter(Number.isFinite).slice(0, 4);
      row.cells[symbol] = {
        username: post.username,
        family: xSourceFamilyForHandle(post.username),
        symbol,
        postId: post.post_id,
        postUrl: post.post_url,
        postedAt: iso(post.posted_at),
        direction: parsed.direction as XOpinionDirection,
        confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence || 0))),
        summary: brief(parsed),
        levels,
        timeWindows: parsed.timeWindows.slice(0, 3),
        approval: approvalMap.get(key) ?? null,
      };
    }
  }

  return { generatedAt: now.toISOString(), lookbackDays, assets: X_OPINION_MATRIX_ASSETS, rows: emptyRows };
}

const MARKET_TO_MATRIX: Record<string, string> = {
  BTC: "BTC", ETH: "ETH", SPX: "SPX", NDX: "NDX", SHCOMP: "SHCOMP", HSTECH: "HSTECH",
  GLD: "GOLD", GOLD: "GOLD", SILVER: "SILVER", WTI: "WTI",
  MU: "MU", SNDK: "SNDK", TSLA: "TSLA", GOOGL: "GOOGL", GOOG: "GOOGL", MSFT: "MSFT", NVDA: "NVDA",
  SOL: "SOL", HYPE: "HYPE",
};

export type ApprovedXForecastOverlay = {
  symbol: string;
  direction: XOpinionDirection;
  approvedCount: number;
  totalWeightPct: number;
  probabilityShiftPct: number;
  summaries: string[];
  displaySummaries: string[];
  levels: number[];
  timeWindows: string[];
  displayAllowedCount: number;
};

export async function getApprovedXForecastOverlay(marketCode: string, now = new Date()): Promise<ApprovedXForecastOverlay | null> {
  const symbol = MARKET_TO_MATRIX[marketCode.toUpperCase()] ?? marketCode.toUpperCase();
  const db = prisma;
  if (!db || !(await ensureXOpinionApprovalTable())) return null;
  const rows = await db.$queryRawUnsafe<Array<ApprovalRow & { parsed: unknown; posted_at: Date | string }>>(
    `SELECT * FROM (
       SELECT DISTINCT ON (a.username)
              a.id, a.username, a.post_id, a.symbol, a.status, a.weight_pct, a.display_allowed, a.note, a.updated_at,
              p.parsed, p.posted_at
       FROM ${APPROVAL_TABLE} a
       JOIN trade_external_analyst_posts p ON p.username = a.username AND p.post_id = a.post_id
       WHERE a.status = 'APPROVED' AND a.symbol = $1 AND p.posted_at >= $2::timestamptz
       ORDER BY a.username, p.posted_at DESC
     ) latest_by_blogger
     ORDER BY posted_at DESC
     LIMIT 20`,
    symbol,
    new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString(),
  );
  if (!rows.length) return null;
  let signed = 0;
  let weightSum = 0;
  let displayAllowedCount = 0;
  const summaries: string[] = [];
  const displaySummaries: string[] = [];
  const levels: number[] = [];
  const timeWindows: string[] = [];
  for (const row of rows) {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(row.parsed, null);
    if (!parsed) continue;
    const weight = Math.max(1, Math.min(10, Number(row.weight_pct) || 5));
    const confidenceFactor = Math.max(0.35, Math.min(1, (parsed.confidence || 50) / 100));
    const sign = parsed.direction === "LONG" ? 1 : parsed.direction === "SHORT" ? -1 : 0;
    signed += sign * weight * confidenceFactor;
    weightSum += weight;
    if (row.display_allowed) {
      displayAllowedCount += 1;
      if (displaySummaries.length < 3) displaySummaries.push(`@${row.username}：${brief(parsed)}`);
    }
    if (summaries.length < 4) summaries.push(`@${row.username}：${brief(parsed)}`);
    levels.push(...parsed.supportLevels, ...parsed.resistanceLevels, ...parsed.targetLevels, ...parsed.invalidationLevels);
    timeWindows.push(...parsed.timeWindows);
  }
  if (weightSum <= 0) return null;
  const probabilityShiftPct = Math.max(-8, Math.min(8, Math.round(signed)));
  const direction: XOpinionDirection = probabilityShiftPct >= 1 ? "LONG" : probabilityShiftPct <= -1 ? "SHORT" : "NEUTRAL";
  return {
    symbol,
    direction,
    approvedCount: rows.length,
    totalWeightPct: Math.min(12, weightSum),
    probabilityShiftPct,
    summaries,
    displaySummaries,
    levels: [...new Set(levels.filter(Number.isFinite))].sort((a, b) => a - b).slice(0, 8),
    timeWindows: [...new Set(timeWindows)].slice(0, 6),
    displayAllowedCount,
  };
}

function normalizeProbabilities(up: number, flat: number, down: number) {
  const a = Math.max(5, up);
  const b = Math.max(5, flat);
  const c = Math.max(5, down);
  const total = a + b + c;
  const nUp = Math.round(a / total * 100);
  const nFlat = Math.round(b / total * 100);
  return { up: nUp, flat: nFlat, down: 100 - nUp - nFlat };
}

export function applyApprovedXOverlayToGeneratedDaily(
  record: GeneratedDailyForecastRecord,
  overlay: ApprovedXForecastOverlay | null,
): GeneratedDailyForecastRecord {
  if (!overlay || overlay.approvedCount <= 0) return record;
  const shift = overlay.probabilityShiftPct;
  const probs = normalizeProbabilities(
    record.upProbability + shift,
    record.sidewaysProbability,
    record.downProbability - shift,
  );
  const directionLabel = overlay.direction === "LONG" ? "偏多" : overlay.direction === "SHORT" ? "偏空" : "中性";
  const evidence = `管理员批准X观点：${overlay.approvedCount}条，合并方向${directionLabel}，情景权重修订${shift >= 0 ? "+" : ""}${shift}个百分点；只调整概率与风险，不覆盖奇门正式方向。`;
  const displayEvidence = overlay.displaySummaries.length ? `批准展示的外部观点：${overlay.displaySummaries.join("；")}` : "";
  return {
    ...record,
    upProbability: probs.up,
    sidewaysProbability: probs.flat,
    downProbability: probs.down,
    newsEvidence: [record.newsEvidence, evidence, displayEvidence].filter(Boolean).join("；"),
    revisionReason: [record.revisionReason, evidence].filter(Boolean).join("；"),
  };
}
