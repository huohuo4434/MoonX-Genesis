import "server-only";

import { prisma } from "@/lib/prisma";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { X_SOURCE_REGISTRY, isVerifiedPromotionXSource, xSourceFamilyForHandle, xSourceRegistryEntryForHandle } from "@/lib/trading-signals/x-source-registry.server";
import { redactMultiViewSourceHandles, resolveMultiViewTargetDates } from "@/lib/research/member-multi-view-core";
import { getXSourceVerificationStatsMap, lockXSourceVerificationSample, lockXSourceVerificationSamples } from "@/lib/trading-signals/x-source-verification.server";
import { isXSourceVerifiableSymbol, verificationHorizon, xSourceVerificationKey, type XSourceVerificationStats } from "@/lib/trading-signals/x-source-verification-core";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";
import type { ApprovedXForecastOverlay } from "@/lib/trading-signals/x-opinion-overlay-core";

import type { XOpinionApproval, XOpinionApprovalStatus, XOpinionAsset, XOpinionCell, XOpinionDirection, XOpinionMatrix, XSourceVerificationDisplay } from "@/types/x-opinion-matrix";

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

function memberSafeBrief(parsed: ExternalAnalystParsedPost): string {
  return redactMultiViewSourceHandles(brief(parsed), X_SOURCE_REGISTRY.map((entry) => entry.handle));
}

function verificationDisplay(username: string, stats: Map<string, XSourceVerificationStats>): XSourceVerificationDisplay | null {
  const profile = xSourceRegistryEntryForHandle(username);
  if (!profile?.verifiedPromotionEligible) return null;
  const row = stats.get(xSourceVerificationKey(username, "ALL", "ALL"));
  return {
    eligible: true,
    roleZh: profile.verificationRoleZh ?? null,
    maturity: row?.maturity ?? "BUILDING",
    sampleCount: row?.sampleCount ?? 0,
    weightedHitRatePct: row?.weightedHitRatePct ?? null,
    promotionWeightPct: row?.promotionWeightPct ?? 0,
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
  const exists = await db.$queryRawUnsafe<StoredPostRow[]>(
    `SELECT username, post_id, post_url, posted_at, text, parsed
     FROM trade_external_analyst_posts WHERE username = $1 AND post_id = $2 LIMIT 1`,
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
  if (rows[0] && status === "APPROVED" && exists[0] && isVerifiedPromotionXSource(username)) {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(exists[0].parsed, null);
    if (parsed) {
      const lock = await lockXSourceVerificationSample({
        username,
        postId,
        symbol,
        parsed,
        postedAt: iso(exists[0].posted_at),
      });
      if (lock.reason === "DATABASE_UNAVAILABLE" || lock.reason.startsWith("DB_ERROR:")) {
        throw new Error(`X_SOURCE_VERIFICATION_LOCK_FAILED:${lock.reason}`);
      }
    }
  }
  return rows[0] ? approvalFromRow(rows[0]) : null;
}

/** Auto-track the two user-authorized Tier-1 sources. Existing manual rejects stay untouched. */
export async function autoApprovePriorityXOpinions(now = new Date()): Promise<{ scanned: number; approved: number; locked: number; skipped: number; errors: string[] }> {
  const db = prisma;
  if (!db || !(await ensureXOpinionApprovalTable())) return { scanned: 0, approved: 0, locked: 0, skipped: 0, errors: ["DATABASE_UNAVAILABLE"] };
  const handles = X_SOURCE_REGISTRY.filter((row) => row.verifiedPromotionEligible).map((row) => row.handle.toLowerCase());
  if (!handles.length) return { scanned: 0, approved: 0, locked: 0, skipped: 0, errors: [] };
  const posts = await db.$queryRawUnsafe<StoredPostRow[]>(
    `SELECT username, post_id, post_url, posted_at, text, parsed
     FROM trade_external_analyst_posts
     WHERE LOWER(username) = ANY($1::text[]) AND posted_at >= NOW() - INTERVAL '36 hours'
     ORDER BY posted_at DESC
     LIMIT 80`,
    handles,
  );
  let skipped = 0;
  const today = getBeijingTodayKey(now);
  const candidates = new Map<string, {
    id: string;
    username: string;
    postId: string;
    symbol: string;
    parsed: ExternalAnalystParsedPost;
    postedAt: string;
  }>();
  for (const post of posts) {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(post.parsed, null);
    if (!parsed || (parsed.direction !== "LONG" && parsed.direction !== "SHORT")) {
      skipped += 1;
      continue;
    }
    const horizon = verificationHorizon(parsed.horizon);
    const targets = resolveMultiViewTargetDates({
      postedAt: parsed.postedAt || iso(post.posted_at),
      horizon,
      timeWindows: parsed.timeWindows,
      summary: parsed.summary || parsed.text,
    });
    if (!targets.some((date) => date > today)) {
      skipped += 1;
      continue;
    }
    const symbols = detectedAssets(parsed, post.text).filter(isXSourceVerifiableSymbol);
    if (!symbols.length) {
      skipped += 1;
      continue;
    }
    for (const symbol of symbols) {
      const id = `${post.username.toLowerCase()}:${post.post_id}:${symbol}`;
      candidates.set(id, { id, username: post.username, postId: post.post_id, symbol, parsed, postedAt: iso(post.posted_at) });
    }
  }
  if (!candidates.size) return { scanned: posts.length, approved: 0, locked: 0, skipped, errors: [] };

  const candidateRows = [...candidates.values()];
  const inserted = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO ${APPROVAL_TABLE}(id, username, post_id, symbol, status, weight_pct, display_allowed, note, created_at, updated_at)
     SELECT x.id, x.username, x.post_id, x.symbol, 'APPROVED', 3, TRUE, 'AUTO_TIER1_TRACKING_V1', NOW(), NOW()
     FROM jsonb_to_recordset($1::jsonb) AS x(id text, username text, post_id text, symbol text)
     ON CONFLICT (username, post_id, symbol) DO NOTHING
     RETURNING id`,
    JSON.stringify(candidateRows.map((row) => ({ id: row.id, username: row.username, post_id: row.postId, symbol: row.symbol }))),
  );
  const approvedRows = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM ${APPROVAL_TABLE} WHERE id = ANY($1::text[]) AND status = 'APPROVED'`,
    candidateRows.map((row) => row.id),
  );
  const approvedIds = new Set(approvedRows.map((row) => row.id));
  const locks = await lockXSourceVerificationSamples(
    candidateRows.filter((row) => approvedIds.has(row.id)).map((row) => ({
      username: row.username,
      postId: row.postId,
      symbol: row.symbol,
      parsed: row.parsed,
      postedAt: row.postedAt,
    })),
  );
  return { scanned: posts.length, approved: inserted.length, locked: locks.created, skipped, errors: locks.errors };
}

export async function getXOpinionMatrix(options: { lookbackDays?: number; now?: Date } = {}): Promise<XOpinionMatrix> {
  const now = options.now ?? new Date();
  const lookbackDays = Math.max(1, Math.min(30, Math.round(options.lookbackDays ?? 7)));
  const verificationStats = await getXSourceVerificationStatsMap().catch(() => new Map<string, XSourceVerificationStats>());
  const emptyRows = X_SOURCE_REGISTRY.map((entry) => ({
    username: entry.handle,
    family: entry.family,
    verification: verificationDisplay(entry.handle, verificationStats),
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

export async function getApprovedXForecastOverlay(marketCode: string, now: Date, forecastDate: string): Promise<ApprovedXForecastOverlay | null> {
  const symbol = MARKET_TO_MATRIX[marketCode.toUpperCase()] ?? marketCode.toUpperCase();
  const db = prisma;
  if (!db || !(await ensureXOpinionApprovalTable())) return null;
  const verificationStats = await getXSourceVerificationStatsMap().catch(() => new Map<string, XSourceVerificationStats>());
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
  let rawSigned = 0;
  let matchedCount = 0;
  let displayAllowedCount = 0;
  const summaries: string[] = [];
  const displaySummaries: string[] = [];
  const levels: number[] = [];
  const timeWindows: string[] = [];
  const verifiedSources = new Set<string>();
  const buildingSources = new Set<string>();
  const familyVotes = new Map<string, { signed: number; weight: number }>();
  for (const row of rows) {
    const parsed = parseJson<ExternalAnalystParsedPost | null>(row.parsed, null);
    if (!parsed) continue;
    const horizon = parsed.horizon === "INTRADAY" ? "SHORT" : parsed.horizon === "SWING" ? "MEDIUM" : "LONG";
    const targetDates = resolveMultiViewTargetDates({
      postedAt: parsed.postedAt || iso(row.posted_at),
      horizon,
      timeWindows: parsed.timeWindows,
      summary: parsed.summary || parsed.text,
    });
    if (!targetDates.includes(forecastDate)) continue;
    matchedCount += 1;
    const horizonKey = verificationHorizon(parsed.horizon);
    const exactStats = verificationStats.get(xSourceVerificationKey(row.username, symbol, horizonKey));
    const sourceStats = exactStats;
    const eligible = isVerifiedPromotionXSource(row.username);
    const weight = eligible ? (sourceStats?.promotionWeightPct ?? 0) : Math.min(1, Math.max(0, Number(row.weight_pct) || 0));
    if (eligible) {
      if (sourceStats?.maturity === "VERIFIED") verifiedSources.add(row.username.toLowerCase());
      else buildingSources.add(row.username.toLowerCase());
    }
    const confidenceFactor = Math.max(0.35, Math.min(1, (parsed.confidence || 50) / 100));
    const sign = parsed.direction === "LONG" ? 1 : parsed.direction === "SHORT" ? -1 : 0;
    rawSigned += sign * confidenceFactor;
    if (weight > 0) {
      const family = xSourceFamilyForHandle(row.username);
      const vote = { signed: sign * weight * confidenceFactor, weight };
      const existing = familyVotes.get(family);
      if (!existing || Math.abs(vote.signed) > Math.abs(existing.signed)) familyVotes.set(family, vote);
    }
    if (row.display_allowed) {
      displayAllowedCount += 1;
      const alias = xSourceRegistryEntryForHandle(row.username)?.memberAlias ?? "匿名分析师";
      if (displaySummaries.length < 3) displaySummaries.push(`${alias}：${memberSafeBrief(parsed)}`);
    }
    if (summaries.length < 4) summaries.push(`${xSourceRegistryEntryForHandle(row.username)?.memberAlias ?? "匿名分析师"}：${brief(parsed)}`);
    levels.push(...parsed.supportLevels, ...parsed.resistanceLevels, ...parsed.targetLevels, ...parsed.invalidationLevels);
    timeWindows.push(...parsed.timeWindows);
  }
  if (matchedCount <= 0) return null;
  const signed = [...familyVotes.values()].reduce((sum, row) => sum + row.signed, 0);
  const weightSum = [...familyVotes.values()].reduce((sum, row) => sum + row.weight, 0);
  const probabilityShiftPct = Math.max(-8, Math.min(8, Math.round(signed)));
  const direction: XOpinionDirection = rawSigned > 0.25 ? "LONG" : rawSigned < -0.25 ? "SHORT" : "NEUTRAL";
  return {
    symbol,
    direction,
    approvedCount: matchedCount,
    totalWeightPct: Math.min(12, weightSum),
    probabilityShiftPct,
    summaries,
    displaySummaries,
    levels: [...new Set(levels.filter(Number.isFinite))].sort((a, b) => a - b).slice(0, 8),
    timeWindows: [...new Set(timeWindows)].slice(0, 6),
    displayAllowedCount,
    verifiedSourceCount: verifiedSources.size,
    buildingSourceCount: buildingSources.size,
  };
}
