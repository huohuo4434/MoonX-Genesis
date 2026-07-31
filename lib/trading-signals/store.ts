import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  TradeSignalDashboardSnapshot,
  TradeSignalDirection,
  TradeSignalEntryMode,
  TradeSignalEvent,
  TradeSignalMethodVote,
  TradeSignalRecord,
  TradeSignalResult,
  TradeSignalStarStat,
  TradeSignalStatus,
} from "@/types/trading-signal";

type DbSignal = {
  id: string;
  asset_id: string;
  symbol: string;
  asset_name: string;
  market: string;
  timeframe: string;
  direction: TradeSignalDirection;
  status: TradeSignalStatus;
  star_level: number;
  consensus_score: number;
  entry_mode: TradeSignalEntryMode;
  entry_low: number | null;
  entry_high: number | null;
  trigger_price: number | null;
  stop_loss: number | null;
  stop_confirm_timeframe: string;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  quantity: number | null;
  notional_amount: number | null;
  position_size_pct: number | null;
  max_risk_pct: number | null;
  valid_from: Date | string;
  valid_until: Date | string | null;
  rationale: string;
  execution_plan: string;
  invalidation: string;
  source_forecast_id: string | null;
  api_visible: boolean;
  paper_only: boolean;
  version: number;
  published_at: Date | string | null;
  locked_at: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbMethod = {
  id: string;
  signal_id: string;
  method: string;
  direction: TradeSignalDirection;
  weight: number;
  confidence: number;
  evidence: string;
  created_at: Date | string;
};

type DbResult = {
  id: string;
  signal_id: string;
  entry_price: number;
  exit_price: number;
  return_pct: number;
  max_favorable_pct: number | null;
  max_adverse_pct: number | null;
  verdict: "WIN" | "LOSS" | "FLAT" | "UNVERIFIABLE";
  note: string;
  closed_at: Date | string;
  created_at: Date | string;
};

type DbEvent = {
  id: string;
  signal_id: string;
  event_type: string;
  provider: string;
  external_order_id: string | null;
  price: number | null;
  quantity: number | null;
  payload: Record<string, unknown> | null;
  note: string;
  occurred_at: Date | string;
  created_at: Date | string;
};

type DbApiKey = {
  id: string;
  label: string;
  key_prefix: string;
  permissions: string[] | null;
  active: boolean;
  last_used_at: Date | string | null;
  created_at: Date | string;
};

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

let ensured = false;

export async function ensureTradeSignalTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;

  const statements = [
    `CREATE TABLE IF NOT EXISTS trade_signals (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      market TEXT NOT NULL DEFAULT '',
      timeframe TEXT NOT NULL DEFAULT '1D',
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      star_level INTEGER NOT NULL DEFAULT 1,
      consensus_score INTEGER NOT NULL DEFAULT 0,
      entry_mode TEXT NOT NULL DEFAULT 'MANUAL',
      entry_low DOUBLE PRECISION,
      entry_high DOUBLE PRECISION,
      trigger_price DOUBLE PRECISION,
      stop_loss DOUBLE PRECISION,
      stop_confirm_timeframe TEXT NOT NULL DEFAULT '4H',
      target_1 DOUBLE PRECISION,
      target_2 DOUBLE PRECISION,
      target_3 DOUBLE PRECISION,
      quantity DOUBLE PRECISION,
      notional_amount DOUBLE PRECISION,
      position_size_pct INTEGER,
      max_risk_pct DOUBLE PRECISION,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      valid_until TIMESTAMPTZ,
      rationale TEXT NOT NULL DEFAULT '',
      execution_plan TEXT NOT NULL DEFAULT '',
      invalidation TEXT NOT NULL DEFAULT '',
      source_forecast_id TEXT,
      api_visible BOOLEAN NOT NULL DEFAULT FALSE,
      paper_only BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      published_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_signals_status_idx ON trade_signals(status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS trade_signals_symbol_idx ON trade_signals(symbol, timeframe)`,
    `CREATE TABLE IF NOT EXISTS trade_signal_methods (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      direction TEXT NOT NULL,
      weight DOUBLE PRECISION NOT NULL DEFAULT 0,
      confidence INTEGER NOT NULL DEFAULT 0,
      evidence TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_signal_methods_signal_idx ON trade_signal_methods(signal_id)`,
    `CREATE TABLE IF NOT EXISTS trade_signal_results (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL UNIQUE REFERENCES trade_signals(id) ON DELETE CASCADE,
      entry_price DOUBLE PRECISION NOT NULL,
      exit_price DOUBLE PRECISION NOT NULL,
      return_pct DOUBLE PRECISION NOT NULL,
      max_favorable_pct DOUBLE PRECISION,
      max_adverse_pct DOUBLE PRECISION,
      verdict TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_signal_results_verdict_idx ON trade_signal_results(verdict, closed_at DESC)`,
    `CREATE TABLE IF NOT EXISTS trade_signal_events (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL REFERENCES trade_signals(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'MOONX',
      external_order_id TEXT,
      price DOUBLE PRECISION,
      quantity DOUBLE PRECISION,
      payload JSONB,
      note TEXT NOT NULL DEFAULT '',
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS trade_signal_events_signal_idx ON trade_signal_events(signal_id, occurred_at DESC)`,
    `CREATE TABLE IF NOT EXISTS trade_signal_api_keys (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ];

  try {
    for (const statement of statements) await prisma.$executeRawUnsafe(statement);
    ensured = true;
    return true;
  } catch (error) {
    console.error("trade signal tables unavailable", error);
    return false;
  }
}

function mapMethod(row: DbMethod): TradeSignalMethodVote {
  return {
    id: row.id,
    signalId: row.signal_id,
    method: row.method,
    direction: row.direction,
    weight: Number(row.weight),
    confidence: Number(row.confidence),
    evidence: row.evidence,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

function mapResult(row: DbResult): TradeSignalResult {
  return {
    id: row.id,
    signalId: row.signal_id,
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    returnPct: Number(row.return_pct),
    maxFavorablePct: row.max_favorable_pct == null ? null : Number(row.max_favorable_pct),
    maxAdversePct: row.max_adverse_pct == null ? null : Number(row.max_adverse_pct),
    verdict: row.verdict,
    note: row.note,
    closedAt: iso(row.closed_at) ?? new Date().toISOString(),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

function mapSignal(
  row: DbSignal,
  methods: TradeSignalMethodVote[] = [],
  result: TradeSignalResult | null = null
): TradeSignalRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    symbol: row.symbol,
    assetName: row.asset_name,
    market: row.market,
    timeframe: row.timeframe,
    direction: row.direction,
    status: row.status,
    starLevel: Number(row.star_level),
    consensusScore: Number(row.consensus_score),
    entryMode: row.entry_mode,
    entryLow: row.entry_low == null ? null : Number(row.entry_low),
    entryHigh: row.entry_high == null ? null : Number(row.entry_high),
    triggerPrice: row.trigger_price == null ? null : Number(row.trigger_price),
    stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
    stopConfirmTimeframe: row.stop_confirm_timeframe,
    target1: row.target_1 == null ? null : Number(row.target_1),
    target2: row.target_2 == null ? null : Number(row.target_2),
    target3: row.target_3 == null ? null : Number(row.target_3),
    quantity: row.quantity == null ? null : Number(row.quantity),
    notionalAmount: row.notional_amount == null ? null : Number(row.notional_amount),
    positionSizePct: row.position_size_pct == null ? null : Number(row.position_size_pct),
    maxRiskPct: row.max_risk_pct == null ? null : Number(row.max_risk_pct),
    validFrom: iso(row.valid_from) ?? new Date().toISOString(),
    validUntil: iso(row.valid_until),
    rationale: row.rationale,
    executionPlan: row.execution_plan,
    invalidation: row.invalidation,
    sourceForecastId: row.source_forecast_id,
    apiVisible: row.api_visible,
    paperOnly: row.paper_only,
    version: Number(row.version),
    publishedAt: iso(row.published_at),
    lockedAt: iso(row.locked_at),
    createdBy: row.created_by,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
    methods,
    result,
  };
}

export async function listTradeSignals(options?: {
  includeDrafts?: boolean;
  apiVisibleOnly?: boolean;
  symbol?: string;
  status?: string;
  limit?: number;
}): Promise<TradeSignalRecord[]> {
  if (!(await ensureTradeSignalTables()) || !prisma) return [];
  const limit = Math.min(Math.max(options?.limit ?? 300, 1), 1000);
  const rows = await prisma.$queryRawUnsafe<DbSignal[]>(
    `SELECT * FROM trade_signals ORDER BY updated_at DESC LIMIT ${limit}`
  );
  let filtered = rows;
  if (!options?.includeDrafts) filtered = filtered.filter((row) => row.status !== "DRAFT");
  if (options?.apiVisibleOnly) filtered = filtered.filter((row) => row.api_visible);
  if (options?.symbol) {
    const symbol = options.symbol.trim().toUpperCase();
    filtered = filtered.filter((row) => row.symbol.toUpperCase() === symbol);
  }
  if (options?.status) filtered = filtered.filter((row) => row.status === options.status);

  const methods = await prisma.$queryRawUnsafe<DbMethod[]>(
    `SELECT * FROM trade_signal_methods ORDER BY created_at ASC LIMIT 5000`
  );
  const results = await prisma.$queryRawUnsafe<DbResult[]>(
    `SELECT * FROM trade_signal_results ORDER BY closed_at DESC LIMIT 2000`
  );
  const methodMap = new Map<string, TradeSignalMethodVote[]>();
  methods.forEach((row) => {
    const next = methodMap.get(row.signal_id) ?? [];
    next.push(mapMethod(row));
    methodMap.set(row.signal_id, next);
  });
  const resultMap = new Map(results.map((row) => [row.signal_id, mapResult(row)]));
  return filtered.map((row) => mapSignal(row, methodMap.get(row.id) ?? [], resultMap.get(row.id) ?? null));
}

export async function getTradeSignalById(id: string): Promise<TradeSignalRecord | null> {
  const all = await listTradeSignals({ includeDrafts: true, limit: 1000 });
  return all.find((signal) => signal.id === id) ?? null;
}

export interface CreateTradeSignalInput {
  assetId: string;
  symbol: string;
  assetName: string;
  market: string;
  timeframe: string;
  direction: TradeSignalDirection;
  status: TradeSignalStatus;
  starLevel: number;
  consensusScore: number;
  entryMode: TradeSignalEntryMode;
  entryLow?: number | null;
  entryHigh?: number | null;
  triggerPrice?: number | null;
  stopLoss?: number | null;
  stopConfirmTimeframe: string;
  target1?: number | null;
  target2?: number | null;
  target3?: number | null;
  quantity?: number | null;
  notionalAmount?: number | null;
  positionSizePct?: number | null;
  maxRiskPct?: number | null;
  validFrom: string;
  validUntil?: string | null;
  rationale: string;
  executionPlan: string;
  invalidation: string;
  sourceForecastId?: string | null;
  apiVisible: boolean;
  paperOnly: boolean;
  createdBy?: string | null;
  methods: Array<{
    method: string;
    direction: TradeSignalDirection;
    weight: number;
    confidence: number;
    evidence: string;
  }>;
}

export async function createTradeSignal(input: CreateTradeSignalInput): Promise<TradeSignalRecord> {
  if (!(await ensureTradeSignalTables()) || !prisma) throw new Error("交易信号数据库未连接");
  const id = `sig_${randomUUID()}`;
  const now = new Date();
  const publishedAt = input.status === "DRAFT" ? null : now;
  const lockedAt = input.status === "DRAFT" ? null : now;

  await prisma.$executeRaw`
    INSERT INTO trade_signals (
      id, asset_id, symbol, asset_name, market, timeframe, direction, status,
      star_level, consensus_score, entry_mode, entry_low, entry_high, trigger_price,
      stop_loss, stop_confirm_timeframe, target_1, target_2, target_3,
      quantity, notional_amount, position_size_pct, max_risk_pct,
      valid_from, valid_until, rationale, execution_plan, invalidation,
      source_forecast_id, api_visible, paper_only, version, published_at,
      locked_at, created_by, created_at, updated_at
    ) VALUES (
      ${id}, ${input.assetId}, ${input.symbol.toUpperCase()}, ${input.assetName},
      ${input.market}, ${input.timeframe}, ${input.direction}, ${input.status},
      ${input.starLevel}, ${input.consensusScore}, ${input.entryMode},
      ${input.entryLow ?? null}, ${input.entryHigh ?? null}, ${input.triggerPrice ?? null},
      ${input.stopLoss ?? null}, ${input.stopConfirmTimeframe},
      ${input.target1 ?? null}, ${input.target2 ?? null}, ${input.target3 ?? null},
      ${input.quantity ?? null}, ${input.notionalAmount ?? null},
      ${input.positionSizePct ?? null}, ${input.maxRiskPct ?? null},
      ${new Date(input.validFrom)}, ${input.validUntil ? new Date(input.validUntil) : null},
      ${input.rationale}, ${input.executionPlan}, ${input.invalidation},
      ${input.sourceForecastId ?? null}, ${input.apiVisible}, ${input.paperOnly}, 1,
      ${publishedAt}, ${lockedAt}, ${input.createdBy ?? null}, ${now}, ${now}
    )
  `;

  for (const method of input.methods) {
    await prisma.$executeRaw`
      INSERT INTO trade_signal_methods (
        id, signal_id, method, direction, weight, confidence, evidence, created_at
      ) VALUES (
        ${`sm_${randomUUID()}`}, ${id}, ${method.method}, ${method.direction},
        ${method.weight}, ${method.confidence}, ${method.evidence}, ${now}
      )
    `;
  }

  const created = await getTradeSignalById(id);
  if (!created) throw new Error("交易信号保存失败");
  return created;
}

export async function updateTradeSignalStatus(
  id: string,
  status: TradeSignalStatus,
  options?: { apiVisible?: boolean }
): Promise<TradeSignalRecord> {
  if (!(await ensureTradeSignalTables()) || !prisma) throw new Error("交易信号数据库未连接");
  const existing = await getTradeSignalById(id);
  if (!existing) throw new Error("交易信号不存在");
  const now = new Date();
  const apiVisible = options?.apiVisible ?? existing.apiVisible;
  const publishedAt = existing.publishedAt ? new Date(existing.publishedAt) : status === "DRAFT" ? null : now;
  const lockedAt = existing.lockedAt ? new Date(existing.lockedAt) : status === "DRAFT" ? null : now;
  await prisma.$executeRaw`
    UPDATE trade_signals
    SET status=${status}, api_visible=${apiVisible}, published_at=${publishedAt},
        locked_at=${lockedAt}, updated_at=${now}
    WHERE id=${id}
  `;
  const updated = await getTradeSignalById(id);
  if (!updated) throw new Error("交易信号更新失败");
  return updated;
}

export async function closeTradeSignal(input: {
  signalId: string;
  entryPrice: number;
  exitPrice: number;
  maxFavorablePct?: number | null;
  maxAdversePct?: number | null;
  note?: string;
  closedAt?: string;
}): Promise<TradeSignalResult> {
  if (!(await ensureTradeSignalTables()) || !prisma) throw new Error("交易信号数据库未连接");
  const signal = await getTradeSignalById(input.signalId);
  if (!signal) throw new Error("交易信号不存在");
  const raw = ((input.exitPrice - input.entryPrice) / input.entryPrice) * 100;
  const returnPct = signal.direction === "SHORT" ? -raw : signal.direction === "NEUTRAL" ? 0 : raw;
  const verdict = Math.abs(returnPct) < 0.01 ? "FLAT" : returnPct > 0 ? "WIN" : "LOSS";
  const now = input.closedAt ? new Date(input.closedAt) : new Date();
  const id = `sr_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO trade_signal_results (
      id, signal_id, entry_price, exit_price, return_pct, max_favorable_pct,
      max_adverse_pct, verdict, note, closed_at, created_at
    ) VALUES (
      ${id}, ${input.signalId}, ${input.entryPrice}, ${input.exitPrice}, ${returnPct},
      ${input.maxFavorablePct ?? null}, ${input.maxAdversePct ?? null}, ${verdict},
      ${input.note ?? ""}, ${now}, ${new Date()}
    ) ON CONFLICT (signal_id) DO UPDATE SET
      entry_price=EXCLUDED.entry_price,
      exit_price=EXCLUDED.exit_price,
      return_pct=EXCLUDED.return_pct,
      max_favorable_pct=EXCLUDED.max_favorable_pct,
      max_adverse_pct=EXCLUDED.max_adverse_pct,
      verdict=EXCLUDED.verdict,
      note=EXCLUDED.note,
      closed_at=EXCLUDED.closed_at
  `;
  await updateTradeSignalStatus(input.signalId, "CLOSED", { apiVisible: false });
  const refreshed = await getTradeSignalById(input.signalId);
  if (!refreshed?.result) throw new Error("收益记录保存失败");
  return refreshed.result;
}

export async function addTradeSignalEvent(input: {
  signalId: string;
  eventType: string;
  provider?: string;
  externalOrderId?: string | null;
  price?: number | null;
  quantity?: number | null;
  payload?: Record<string, unknown> | null;
  note?: string;
  occurredAt?: string;
}): Promise<TradeSignalEvent> {
  if (!(await ensureTradeSignalTables()) || !prisma) throw new Error("交易信号数据库未连接");
  const id = `se_${randomUUID()}`;
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null;
  await prisma.$executeRaw`
    INSERT INTO trade_signal_events (
      id, signal_id, event_type, provider, external_order_id, price, quantity,
      payload, note, occurred_at, created_at
    ) VALUES (
      ${id}, ${input.signalId}, ${input.eventType}, ${input.provider ?? "MOONX"},
      ${input.externalOrderId ?? null}, ${input.price ?? null}, ${input.quantity ?? null},
      ${payloadJson}::jsonb, ${input.note ?? ""}, ${occurredAt}, ${new Date()}
    )
  `;
  return {
    id,
    signalId: input.signalId,
    eventType: input.eventType,
    provider: input.provider ?? "MOONX",
    externalOrderId: input.externalOrderId ?? null,
    price: input.price ?? null,
    quantity: input.quantity ?? null,
    payload: input.payload ?? null,
    note: input.note ?? "",
    occurredAt: occurredAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function listTradeSignalEvents(signalId?: string): Promise<TradeSignalEvent[]> {
  if (!(await ensureTradeSignalTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbEvent[]>(
    `SELECT * FROM trade_signal_events ORDER BY occurred_at DESC LIMIT 1000`
  );
  return rows
    .filter((row) => !signalId || row.signal_id === signalId)
    .map((row) => ({
      id: row.id,
      signalId: row.signal_id,
      eventType: row.event_type,
      provider: row.provider,
      externalOrderId: row.external_order_id,
      price: row.price == null ? null : Number(row.price),
      quantity: row.quantity == null ? null : Number(row.quantity),
      payload: row.payload,
      note: row.note,
      occurredAt: iso(row.occurred_at) ?? new Date().toISOString(),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
    }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateStarStats(signals: TradeSignalRecord[]): TradeSignalStarStat[] {
  return [5, 4, 3, 2, 1].map((starLevel) => {
    const results = signals.filter((signal) => signal.starLevel === starLevel && signal.result).map((signal) => signal.result!);
    const wins = results.filter((result) => result.verdict === "WIN").length;
    const losses = results.filter((result) => result.verdict === "LOSS").length;
    const flats = results.filter((result) => result.verdict === "FLAT").length;
    const valid = results.filter((result) => result.verdict !== "UNVERIFIABLE");
    const favorable = valid.map((result) => result.maxFavorablePct).filter((value): value is number => value != null);
    const adverse = valid.map((result) => result.maxAdversePct).filter((value): value is number => value != null);
    return {
      starLevel,
      sampleCount: valid.length,
      winCount: wins,
      lossCount: losses,
      flatCount: flats,
      winRate: valid.length >= 10 ? round((wins / valid.length) * 100) : null,
      averageReturnPct: valid.length ? round(valid.reduce((sum, result) => sum + result.returnPct, 0) / valid.length) : null,
      averageFavorablePct: favorable.length ? round(favorable.reduce((sum, value) => sum + value, 0) / favorable.length) : null,
      averageAdversePct: adverse.length ? round(adverse.reduce((sum, value) => sum + value, 0) / adverse.length) : null,
    };
  });
}

export async function getTradeSignalDashboardSnapshot(): Promise<TradeSignalDashboardSnapshot> {
  const databaseReady = await ensureTradeSignalTables();
  const signals = databaseReady ? await listTradeSignals({ includeDrafts: true, limit: 1000 }) : [];
  return {
    signals,
    starStats: calculateStarStats(signals),
    activeCount: signals.filter((signal) => ["TRIGGERED", "ACTIVE", "TAKE_PROFIT"].includes(signal.status)).length,
    armedCount: signals.filter((signal) => signal.status === "ARMED").length,
    closedCount: signals.filter((signal) => signal.status === "CLOSED").length,
    databaseReady,
  };
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function createSignalApiKey(label: string, permissions = ["read"]): Promise<{ token: string; prefix: string }> {
  if (!(await ensureTradeSignalTables()) || !prisma) throw new Error("交易信号数据库未连接");
  const token = `mx_sig_${randomBytes(24).toString("base64url")}`;
  const prefix = token.slice(0, 14);
  await prisma.$executeRaw`
    INSERT INTO trade_signal_api_keys (
      id, label, key_prefix, key_hash, permissions, active, created_at
    ) VALUES (
      ${`sak_${randomUUID()}`}, ${label}, ${prefix}, ${hashKey(token)},
      ${JSON.stringify(permissions)}::jsonb, TRUE, ${new Date()}
    )
  `;
  return { token, prefix };
}

export async function listSignalApiKeys(): Promise<Array<{
  id: string;
  label: string;
  prefix: string;
  permissions: string[];
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}>> {
  if (!(await ensureTradeSignalTables()) || !prisma) return [];
  const rows = await prisma.$queryRawUnsafe<DbApiKey[]>(
    `SELECT id, label, key_prefix, permissions, active, last_used_at, created_at
     FROM trade_signal_api_keys ORDER BY created_at DESC LIMIT 100`
  );
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    prefix: row.key_prefix,
    permissions: Array.isArray(row.permissions) ? row.permissions : ["read"],
    active: row.active,
    lastUsedAt: iso(row.last_used_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  }));
}

export async function verifySignalApiToken(token: string, requiredPermission = "read"): Promise<boolean> {
  const envKey = process.env.MOONX_SIGNAL_API_KEY?.trim();
  if (envKey && safeEqual(token, envKey)) return true;
  if (!(await ensureTradeSignalTables()) || !prisma) return false;
  const tokenHash = hashKey(token);
  const rows = await prisma.$queryRaw<
    Array<{ id: string; key_hash: string; permissions: string[] | null }>
  >`SELECT id, key_hash, permissions FROM trade_signal_api_keys WHERE active=TRUE`;
  const match = rows.find((row) => safeEqual(tokenHash, row.key_hash));
  if (!match) return false;
  const permissions = Array.isArray(match.permissions) ? match.permissions : ["read"];
  if (!permissions.includes(requiredPermission) && !permissions.includes("admin")) return false;
  await prisma.$executeRaw`UPDATE trade_signal_api_keys SET last_used_at=${new Date()} WHERE id=${match.id}`;
  return true;
}
