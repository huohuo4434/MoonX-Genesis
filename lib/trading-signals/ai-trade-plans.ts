import "server-only";

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  ThreeHorizonCondition,
  ThreeHorizonStrategyDecision,
  ThreeHorizonStrategyProfile,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";
import type {
  AiTradeIntentDecision,
  AiTradeMarketQuote,
  AiTradePlan,
  AiTradePlanDashboard,
  AiTradePlanEvent,
  AiTradePlanExecutionGate,
  AiTradePlanStatus,
  AiTradePlanTier,
} from "@/types/ai-trade-plan";

// V7.5.2: keep the public audit lead, but do not let the audit timer consume the setup.
const MIN_LEAD_MINUTES: Record<ThreeHorizonStrategyType, number> = {
  INTRADAY: 1,
  SWING: 5,
  POSITION: 15,
};

const ENTRY_ZONE_BUFFER_PCT: Record<ThreeHorizonStrategyType, number> = {
  INTRADAY: 0.15,
  SWING: 0.35,
  POSITION: 0.6,
};

const LEVEL_CHANGE_TOLERANCE_PCT: Record<ThreeHorizonStrategyType, number> = {
  // Short-lived market noise should update the existing timeline, not publish V2/V3/V4.
  INTRADAY: 2.5,
  SWING: 3,
  POSITION: 5,
};

const STRATEGY_LABEL: Record<ThreeHorizonStrategyType, string> = {
  INTRADAY: "短线",
  SWING: "波段",
  POSITION: "中长期",
};

const STATUS_LABEL: Record<AiTradePlanStatus, string> = {
  PUBLISHED: "计划已发布",
  WATCHING: "观察中",
  ARMED: "即将触发",
  ORDER_SUBMITTED: "已提交委托",
  PARTIALLY_FILLED: "部分成交",
  OPEN: "持仓中",
  REDUCED: "已分批减仓",
  CLOSED: "已结束",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
  INVALIDATED: "已经失效",
  SUPERSEDED: "已被新版本替代",
  EXECUTION_ERROR: "执行异常",
};

type PlanRow = {
  id: string;
  plan_group_id: string;
  version: number;
  content_hash: string;
  strategy_type: ThreeHorizonStrategyType;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  plan_tier: AiTradePlanTier;
  status: AiTradePlanStatus;
  execution_mode: "SHADOW" | "BITGET_DEMO" | "BITGET_LIVE";
  thesis_summary: string;
  planning_confidence: number;
  execution_threshold: number;
  entry_zone_low: number;
  entry_zone_high: number;
  trigger_rule: string;
  confirmation_timeframe: string;
  order_type_if_triggered: string;
  protective_stop: number;
  target_1: number;
  target_2: number;
  target_3: number;
  risk_percent: number;
  max_leverage: number;
  valid_from: Date;
  expires_at: Date;
  invalidation_rule: string;
  cancel_if: string;
  conditions_met: number;
  conditions_total: number;
  current_price: number | null;
  distance_to_entry_pct: number | null;
  published_at: Date;
  last_checked_at: Date | null;
  submitted_at: Date | null;
  first_fill_at: Date | null;
  average_fill_price: number | null;
  closed_at: Date | null;
  close_reason: string | null;
  client_oid: string | null;
  bitget_order_id: string | null;
  source_decision_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type EventRow = {
  id: string;
  plan_id: string;
  event_type: string;
  title: string;
  detail: string;
  status: AiTradePlanStatus | null;
  bitget_order_id: string | null;
  client_oid: string | null;
  price: number | null;
  quantity: number | null;
  event_at: Date;
};


type RuntimeQuoteStateRow = {
  latest_quotes: unknown;
};

type IntentDecisionRow = {
  symbol: string;
  strategy_type: ThreeHorizonStrategyType;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  status: ThreeHorizonStrategyDecision["status"];
  confidence: number;
  technical_score: number;
  forecast_score: number;
  conditions: unknown;
  current_price: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  risk_pct: number | null;
  max_holding_until: Date | null;
  rejection_reason: string;
  updated_at: Date;
};

type PlanContent = {
  strategyType: ThreeHorizonStrategyType;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  tier: AiTradePlanTier;
  thesisSummary: string;
  planningConfidence: number;
  executionThreshold: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  triggerRule: string;
  confirmationTimeframe: string;
  orderTypeIfTriggered: string;
  protectiveStop: number;
  target1: number;
  target2: number;
  target3: number;
  riskPercent: number;
  maxLeverage: number;
  validFrom: string;
  expiresAt: string;
  invalidationRule: string;
  cancelIf: string;
};

let ensured = false;

function round(value: number, digits = 8): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function hashContent(content: PlanContent): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function midpoint(low: number, high: number): number {
  return (low + high) / 2;
}

function distancePct(current: number | null, low: number, high: number): number | null {
  if (current == null || current <= 0) return null;
  if (current >= low && current <= high) return 0;
  const nearest = current < low ? low : high;
  return round(Math.abs(current - nearest) / current * 100, 3);
}

function relativeDifferencePct(a: number, b: number): number {
  const base = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / base * 100;
}

function stableTriggerRule(profile: ThreeHorizonStrategyProfile, direction: string): string {
  const side = direction === "LONG" ? "做多" : "做空";
  if (profile.strategyType === "INTRADAY") {
    return `1小时环境与15分钟方向保持一致，5分钟K线收盘确认${side}触发，成交量与波动过滤同时通过。`;
  }
  if (profile.strategyType === "SWING") {
    return `周线与日线环境不冲突，4小时结构有效，1小时K线收盘确认${side}触发。`;
  }
  return `月度与周度方向一致，日线结构有效，4小时K线收盘确认${side}触发。`;
}

function confirmationTimeframe(profile: ThreeHorizonStrategyProfile): string {
  return profile.entryTimeframe;
}

function target3(decision: ThreeHorizonStrategyDecision): number {
  const entry = Number(decision.entryPrice);
  const stop = Number(decision.stopLoss);
  if (!Number.isFinite(entry) || !Number.isFinite(stop)) return Number(decision.target2 ?? 0);
  const risk = Math.abs(entry - stop);
  return decision.direction === "SHORT" ? round(entry - risk * 3) : round(entry + risk * 3);
}

function buildContent(
  decision: ThreeHorizonStrategyDecision,
  profile: ThreeHorizonStrategyProfile,
  now: Date
): PlanContent | null {
  const entry = Number(decision.entryPrice);
  const stop = Number(decision.stopLoss);
  const first = Number(decision.target1);
  const second = Number(decision.target2);
  if (
    decision.direction === "NEUTRAL" ||
    !Number.isFinite(entry) || entry <= 0 ||
    !Number.isFinite(stop) || stop <= 0 ||
    !Number.isFinite(first) || first <= 0 ||
    !Number.isFinite(second) || second <= 0
  ) return null;

  const buffer = entry * ENTRY_ZONE_BUFFER_PCT[profile.strategyType] / 100;
  const low = round(entry - buffer);
  const high = round(entry + buffer);
  const commissioning = decision.rejectionCode === "LIVE_COMMISSIONING";
  const probe = ["PROBE_ENTRY", "DAILY_ACTIVITY_PROBE", "DAILY_MINIMUM_EXECUTION"].includes(decision.rejectionCode);
  const executionThreshold = probe
    ? Math.max(profile.planningMinConfidence, profile.minConfidence - 8)
    : profile.minConfidence;
  const tier: AiTradePlanTier = decision.confidence >= executionThreshold ? "FORMAL" : "CANDIDATE";
  const directionText = decision.direction === "LONG" ? "准备做多" : "准备做空";
  const unmet = decision.conditions.filter((row) => !row.met).map((row) => row.label);
  const thesis = commissioning
    ? `首笔实盘闭环验收：${decision.symbol}${directionText}。使用小额风险、交易所止盈止损与30分钟限时退出，完成后自动转入正常三周期策略。`
    : `${STRATEGY_LABEL[profile.strategyType]}${directionText}。${probe ? "先以小风险探路仓分批进入" : "按确认仓执行"}；${decision.conditionsMet}/${decision.conditionsTotal}项条件已满足${unmet.length ? `，仍关注${unmet.slice(0, 2).join("、")}` : "，等待最终执行闸门"}。`;
  const validFrom = now.toISOString();
  const expiresAt = decision.expiresAt ?? new Date(now.getTime() + profile.maxHoldingMinutes * 60_000).toISOString();
  return {
    strategyType: profile.strategyType,
    symbol: decision.symbol,
    direction: decision.direction,
    tier,
    thesisSummary: thesis,
    planningConfidence: decision.confidence,
    executionThreshold,
    entryZoneLow: low,
    entryZoneHigh: high,
    triggerRule: commissioning
      ? "计划先公开锁定至少1分钟；下一轮CRON确认BTC/ETH实时行情仍新鲜且风控通过后提交小额市价单。"
      : probe
        ? "方向与宽止损有效时先开第一批小仓；精确收盘确认后才允许第二批。"
        : stableTriggerRule(profile, decision.direction),
    confirmationTimeframe: commissioning ? "REALTIME + NEXT_CRON" : probe ? "NEXT_CRON + STAGED_CONFIRMATION" : confirmationTimeframe(profile),
    orderTypeIfTriggered: commissioning ? "ONE_TIME_LIVE_COMMISSIONING_MARKET" : probe ? "STAGED_PROBE_MARKET" : "MARKET_AFTER_CLOSE_CONFIRMATION",
    protectiveStop: round(stop),
    target1: round(first),
    target2: round(second),
    target3: target3(decision),
    riskPercent: profile.riskPerTradePct,
    maxLeverage: 2,
    validFrom,
    expiresAt,
    invalidationRule: `价格触及保护止损${round(stop, 6)}，或${profile.environmentTimeframe}/${profile.directionTimeframe}方向结构失效。`,
    cancelIf: `计划到期、预测方向反转、行情数据延迟、可靠性闸门关闭或组合风险超限时取消。`,
  };
}

function mapEvent(row: EventRow): AiTradePlanEvent {
  return {
    id: row.id,
    planId: row.plan_id,
    eventType: row.event_type,
    title: row.title,
    detail: row.detail,
    status: row.status,
    bitgetOrderId: row.bitget_order_id,
    clientOid: row.client_oid,
    price: row.price == null ? null : Number(row.price),
    quantity: row.quantity == null ? null : Number(row.quantity),
    eventAt: row.event_at.toISOString(),
  };
}

function mapPlan(row: PlanRow, events: AiTradePlanEvent[] = []): AiTradePlan {
  return {
    id: row.id,
    planGroupId: row.plan_group_id,
    version: Number(row.version),
    contentHash: row.content_hash,
    strategyType: row.strategy_type,
    strategyLabel: STRATEGY_LABEL[row.strategy_type as ThreeHorizonStrategyType],
    symbol: row.symbol,
    direction: row.direction,
    tier: row.plan_tier,
    status: row.status,
    executionMode: row.execution_mode,
    thesisSummary: row.thesis_summary,
    planningConfidence: Number(row.planning_confidence),
    executionThreshold: Number(row.execution_threshold),
    entryZoneLow: Number(row.entry_zone_low),
    entryZoneHigh: Number(row.entry_zone_high),
    triggerRule: row.trigger_rule,
    confirmationTimeframe: row.confirmation_timeframe,
    orderTypeIfTriggered: row.order_type_if_triggered,
    protectiveStop: Number(row.protective_stop),
    target1: Number(row.target_1),
    target2: Number(row.target_2),
    target3: Number(row.target_3),
    riskPercent: Number(row.risk_percent),
    maxLeverage: Number(row.max_leverage),
    validFrom: row.valid_from.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    invalidationRule: row.invalidation_rule,
    cancelIf: row.cancel_if,
    conditionsMet: Number(row.conditions_met),
    conditionsTotal: Number(row.conditions_total),
    currentPrice: row.current_price == null ? null : Number(row.current_price),
    distanceToEntryPct: row.distance_to_entry_pct == null ? null : Number(row.distance_to_entry_pct),
    publishedAt: row.published_at.toISOString(),
    lastCheckedAt: iso(row.last_checked_at),
    submittedAt: iso(row.submitted_at),
    firstFillAt: iso(row.first_fill_at),
    averageFillPrice: row.average_fill_price == null ? null : Number(row.average_fill_price),
    closedAt: iso(row.closed_at),
    closeReason: row.close_reason,
    clientOid: row.client_oid,
    bitgetOrderId: row.bitget_order_id,
    sourceDecisionId: row.source_decision_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    events,
  };
}

export async function ensureAiTradePlanTables(): Promise<boolean> {
  if (!prisma) return false;
  if (ensured) return true;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_profiles
        ADD COLUMN IF NOT EXISTS planning_min_confidence INTEGER NOT NULL DEFAULT 45
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trade_three_horizon_decisions
        ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_ai_plans (
        id TEXT PRIMARY KEY,
        plan_group_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        plan_tier TEXT NOT NULL,
        status TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        thesis_summary TEXT NOT NULL,
        planning_confidence INTEGER NOT NULL,
        execution_threshold INTEGER NOT NULL,
        entry_zone_low DOUBLE PRECISION NOT NULL,
        entry_zone_high DOUBLE PRECISION NOT NULL,
        trigger_rule TEXT NOT NULL,
        confirmation_timeframe TEXT NOT NULL,
        order_type_if_triggered TEXT NOT NULL,
        protective_stop DOUBLE PRECISION NOT NULL,
        target_1 DOUBLE PRECISION NOT NULL,
        target_2 DOUBLE PRECISION NOT NULL,
        target_3 DOUBLE PRECISION NOT NULL,
        risk_percent DOUBLE PRECISION NOT NULL,
        max_leverage DOUBLE PRECISION NOT NULL DEFAULT 2,
        valid_from TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        invalidation_rule TEXT NOT NULL,
        cancel_if TEXT NOT NULL,
        conditions_met INTEGER NOT NULL DEFAULT 0,
        conditions_total INTEGER NOT NULL DEFAULT 0,
        current_price DOUBLE PRECISION,
        distance_to_entry_pct DOUBLE PRECISION,
        published_at TIMESTAMPTZ NOT NULL,
        last_checked_at TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ,
        first_fill_at TIMESTAMPTZ,
        average_fill_price DOUBLE PRECISION,
        closed_at TIMESTAMPTZ,
        close_reason TEXT,
        client_oid TEXT,
        bitget_order_id TEXT,
        source_decision_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(plan_group_id, version)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trade_ai_plan_events (
        id TEXT PRIMARY KEY,
        event_key TEXT NOT NULL UNIQUE,
        plan_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        status TEXT,
        bitget_order_id TEXT,
        client_oid TEXT,
        price DOUBLE PRECISION,
        quantity DOUBLE PRECISION,
        payload JSONB,
        event_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS trade_ai_plans_active_idx ON trade_ai_plans(strategy_type, symbol, status, updated_at DESC)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS trade_ai_plan_events_plan_time_idx ON trade_ai_plan_events(plan_id, event_at ASC)`);
    ensured = true;
    return true;
  } catch (error) {
    console.error("AI trade plan tables unavailable", error);
    return false;
  }
}

async function appendEvent(input: {
  planId: string;
  eventType: string;
  title: string;
  detail: string;
  status?: AiTradePlanStatus | null;
  bitgetOrderId?: string | null;
  clientOid?: string | null;
  price?: number | null;
  quantity?: number | null;
  payload?: unknown;
  eventAt: Date;
  dedupe: string;
}): Promise<void> {
  if (!prisma) return;
  const eventKey = `${input.planId}:${input.eventType}:${input.dedupe}`;
  await prisma.$executeRaw`
    INSERT INTO trade_ai_plan_events (
      id, event_key, plan_id, event_type, title, detail, status,
      bitget_order_id, client_oid, price, quantity, payload, event_at
    ) VALUES (
      ${`evt_${randomUUID()}`}, ${eventKey}, ${input.planId}, ${input.eventType},
      ${input.title}, ${input.detail}, ${input.status ?? null},
      ${input.bitgetOrderId ?? null}, ${input.clientOid ?? null},
      ${input.price ?? null}, ${input.quantity ?? null},
      ${input.payload == null ? null : JSON.stringify(input.payload)}::jsonb,
      ${input.eventAt}
    ) ON CONFLICT (event_key) DO NOTHING
  `;
}

async function findActivePlan(strategyType: ThreeHorizonStrategyType, symbol: string): Promise<PlanRow | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<PlanRow[]>(
    `SELECT * FROM trade_ai_plans
     WHERE strategy_type = $1 AND symbol = $2
       AND status IN ('PUBLISHED','WATCHING','ARMED','ORDER_SUBMITTED','PARTIALLY_FILLED','OPEN','REDUCED','EXECUTION_ERROR')
       AND (expires_at > NOW() OR status IN ('ORDER_SUBMITTED','PARTIALLY_FILLED','OPEN','REDUCED'))
     ORDER BY version DESC, published_at DESC LIMIT 1`,
    strategyType,
    symbol
  );
  return rows[0] ?? null;
}

function contentMateriallyChanged(current: PlanRow, next: PlanContent): boolean {
  if (current.direction !== next.direction) return true;
  // Crossing upward into the execution tier is a material publication event. A temporary
  // confidence dip is handled by the live gate and timeline instead of creating another
  // replacement version every few minutes.
  if (current.plan_tier === "CANDIDATE" && next.tier === "FORMAL") return true;
  const tolerance = LEVEL_CHANGE_TOLERANCE_PCT[next.strategyType];
  const currentEntry = midpoint(Number(current.entry_zone_low), Number(current.entry_zone_high));
  const nextEntry = midpoint(next.entryZoneLow, next.entryZoneHigh);
  return relativeDifferencePct(currentEntry, nextEntry) > tolerance ||
    relativeDifferencePct(Number(current.protective_stop), next.protectiveStop) > tolerance * 1.75 ||
    relativeDifferencePct(Number(current.target_2), next.target2) > tolerance * 2;
}

function initialStatus(decision: ThreeHorizonStrategyDecision): AiTradePlanStatus {
  if (decision.status === "READY" || decision.status === "SHADOW_READY" || decision.conditionsMet === decision.conditionsTotal) return "ARMED";
  return "WATCHING";
}

async function createPlan(
  decision: ThreeHorizonStrategyDecision,
  profile: ThreeHorizonStrategyProfile,
  content: PlanContent,
  now: Date,
  groupId: string,
  version: number
): Promise<PlanRow> {
  if (!prisma) throw new Error("交易数据库未连接");
  const id = `plan_${randomUUID()}`;
  const status = initialStatus(decision);
  const contentHash = hashContent(content);
  const executionMode = profile.mode === "SHADOW" ? "SHADOW" : profile.mode === "LIVE" ? "BITGET_LIVE" : "BITGET_DEMO";
  const currentPrice = decision.currentPrice;
  const distance = distancePct(currentPrice, content.entryZoneLow, content.entryZoneHigh);
  const rows = await prisma.$queryRawUnsafe<PlanRow[]>(
    `INSERT INTO trade_ai_plans (
      id, plan_group_id, version, content_hash, strategy_type, symbol, direction,
      plan_tier, status, execution_mode, thesis_summary, planning_confidence,
      execution_threshold, entry_zone_low, entry_zone_high, trigger_rule,
      confirmation_timeframe, order_type_if_triggered, protective_stop,
      target_1, target_2, target_3, risk_percent, max_leverage, valid_from,
      expires_at, invalidation_rule, cancel_if, conditions_met, conditions_total,
      current_price, distance_to_entry_pct, published_at, last_checked_at,
      source_decision_id, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,NOW(),NOW()
    ) RETURNING *`,
    id, groupId, version, contentHash, content.strategyType, content.symbol,
    content.direction, content.tier, status, executionMode, content.thesisSummary,
    content.planningConfidence, content.executionThreshold, content.entryZoneLow,
    content.entryZoneHigh, content.triggerRule, content.confirmationTimeframe,
    content.orderTypeIfTriggered, content.protectiveStop, content.target1,
    content.target2, content.target3, content.riskPercent, content.maxLeverage,
    new Date(content.validFrom), new Date(content.expiresAt), content.invalidationRule,
    content.cancelIf, decision.conditionsMet, decision.conditionsTotal,
    currentPrice, distance, now, now, decision.id
  );
  await prisma.$executeRaw`UPDATE trade_three_horizon_decisions SET plan_id = ${id}, updated_at = NOW() WHERE id = ${decision.id}`;
  await appendEvent({
    planId: id,
    eventType: "PLAN_PUBLISHED",
    title: `AI计划V${version}已发布并锁定`,
    detail: `${STRATEGY_LABEL[content.strategyType]}${content.direction === "LONG" ? "做多" : "做空"}计划已在任何Bitget可执行订单之前写入审计账本。`,
    status: "PUBLISHED",
    eventAt: now,
    dedupe: `v${version}`,
    payload: { contentHash },
  });
  await appendEvent({
    planId: id,
    eventType: "PLAN_STATE",
    title: STATUS_LABEL[status],
    detail: status === "ARMED" ? "主要条件已满足，等待事前发布时间要求和最终执行闸门。" : "等待价格、K线和结构条件继续完善。",
    status,
    eventAt: now,
    dedupe: `${status}:${decision.id}`,
  });
  const insertedPlan = rows[0];
  if (!insertedPlan) {
    throw new Error("AI交易计划写入后未返回记录");
  }
  return insertedPlan;
}

async function supersedePlan(current: PlanRow, now: Date, reason: string): Promise<void> {
  if (!prisma) return;
  await prisma.$executeRaw`
    UPDATE trade_ai_plans SET status = 'SUPERSEDED', close_reason = ${reason}, closed_at = ${now}, updated_at = NOW()
    WHERE id = ${current.id}
  `;
  await appendEvent({
    planId: current.id,
    eventType: "PLAN_SUPERSEDED",
    title: STATUS_LABEL.SUPERSEDED,
    detail: reason,
    status: "SUPERSEDED",
    eventAt: now,
    dedupe: `v${current.version}`,
  });
}

async function updateDynamicPlan(current: PlanRow, decision: ThreeHorizonStrategyDecision, now: Date): Promise<PlanRow> {
  if (!prisma) throw new Error("交易数据库未连接");
  const desired = statusFromDecision(decision, current.status);
  const distance = distancePct(decision.currentPrice, Number(current.entry_zone_low), Number(current.entry_zone_high));
  const rows = await prisma.$queryRawUnsafe<PlanRow[]>(
    `UPDATE trade_ai_plans SET
      status = $2,
      conditions_met = $3,
      conditions_total = $4,
      current_price = $5,
      distance_to_entry_pct = $6,
      last_checked_at = $7,
      source_decision_id = $8,
      client_oid = COALESCE($9, client_oid),
      bitget_order_id = COALESCE($10, bitget_order_id),
      submitted_at = CASE WHEN $2 = 'ORDER_SUBMITTED' THEN COALESCE(submitted_at, $7) ELSE submitted_at END,
      first_fill_at = CASE WHEN $2 IN ('PARTIALLY_FILLED','OPEN','REDUCED','CLOSED') THEN COALESCE(first_fill_at, $7) ELSE first_fill_at END,
      average_fill_price = CASE WHEN $2 IN ('PARTIALLY_FILLED','OPEN','REDUCED','CLOSED') THEN COALESCE(average_fill_price, $5) ELSE average_fill_price END,
      closed_at = CASE WHEN $2 IN ('CLOSED','EXPIRED','INVALIDATED','EXECUTION_ERROR') THEN COALESCE(closed_at, $7) ELSE closed_at END,
      close_reason = CASE WHEN $2 IN ('CLOSED','EXPIRED','INVALIDATED','EXECUTION_ERROR') THEN $11 ELSE close_reason END,
      updated_at = NOW()
    WHERE id = $1 RETURNING *`,
    current.id, desired, decision.conditionsMet, decision.conditionsTotal,
    decision.currentPrice, distance, now, decision.id, decision.clientOid,
    decision.bitgetOrderId, decision.rejectionReason || null
  );
  await prisma.$executeRaw`UPDATE trade_three_horizon_decisions SET plan_id = ${current.id}, updated_at = NOW() WHERE id = ${decision.id}`;
  if (desired !== current.status) {
    await appendEvent({
      planId: current.id,
      eventType: "PLAN_STATE",
      title: STATUS_LABEL[desired],
      detail: stateDetail(desired, decision),
      status: desired,
      bitgetOrderId: decision.bitgetOrderId,
      clientOid: decision.clientOid,
      price: decision.currentPrice,
      quantity: decision.quantity,
      eventAt: now,
      dedupe: `${desired}:${decision.bitgetOrderId ?? decision.id}`,
      payload: { rejectionCode: decision.rejectionCode, rejectionReason: decision.rejectionReason },
    });
  }
  await appendEvent({
    planId: current.id,
    eventType: "CONDITION_PROGRESS",
    title: `条件进度 ${decision.conditionsMet}/${decision.conditionsTotal}`,
    detail: decision.rejectionReason || "策略条件已完成本轮检查。",
    status: desired,
    price: decision.currentPrice,
    eventAt: now,
    dedupe: `${decision.id}:${decision.conditionsMet}`,
  });
  const updatedPlan = rows[0];
  if (!updatedPlan) {
    throw new Error("AI交易计划更新后未返回记录");
  }
  return updatedPlan;
}

function statusFromDecision(decision: ThreeHorizonStrategyDecision, current: AiTradePlanStatus): AiTradePlanStatus {
  if (current === "SUPERSEDED" || current === "CLOSED" || current === "EXPIRED" || current === "INVALIDATED") return current;
  if (decision.rejectionCode === "CONFIDENCE_LOW") return "WATCHING";
  switch (decision.status) {
    case "ORDER_SUBMITTED": return "ORDER_SUBMITTED";
    case "OPEN": return "OPEN";
    case "PARTIAL": return "REDUCED";
    case "CLOSING": return "REDUCED";
    case "CLOSED": return "CLOSED";
    case "EXPIRED": return "EXPIRED";
    case "ERROR": return decision.bitgetOrderId || current === "ORDER_SUBMITTED" ? "EXECUTION_ERROR" : current;
    case "READY":
    case "SHADOW_READY": return "ARMED";
    case "BLOCKED": return decision.conditionsMet === decision.conditionsTotal ? "ARMED" : "WATCHING";
    default: return "WATCHING";
  }
}

function stateDetail(status: AiTradePlanStatus, decision: ThreeHorizonStrategyDecision): string {
  if (status === "ARMED") return `主要条件已满足：${decision.conditionsMet}/${decision.conditionsTotal}。${decision.rejectionReason}`;
  if (status === "ORDER_SUBMITTED") return `已向Bitget提交委托，orderId=${decision.bitgetOrderId ?? "待回查"}。`;
  if (status === "OPEN") return `Bitget持仓已建立，参考价格${decision.currentPrice ?? decision.entryPrice ?? "—"}。`;
  if (status === "REDUCED") return "持仓已发生部分止盈、减仓或进入退出流程。";
  if (status === "CLOSED") return `计划结束。${decision.rejectionReason}`;
  if (status === "EXPIRED") return "计划超过有效期且未继续执行。";
  if (status === "EXECUTION_ERROR") return `Bitget执行异常：${decision.rejectionReason}`;
  return decision.rejectionReason || "等待价格和结构条件。";
}

export async function prepareAiTradePlanBeforeExecution(input: {
  decision: ThreeHorizonStrategyDecision;
  profile: ThreeHorizonStrategyProfile;
  now: Date;
}): Promise<AiTradePlanExecutionGate> {
  if (!(await ensureAiTradePlanTables()) || !prisma) {
    return { plan: null, allowed: false, code: "PLAN_DB_UNAVAILABLE", reason: "AI事前计划数据库不可用，禁止提交订单。" };
  }
  if (input.decision.confidence < input.profile.planningMinConfidence) {
    return {
      plan: null,
      allowed: false,
      code: "PLANNING_CONFIDENCE_LOW",
      reason: `计划置信度${input.decision.confidence}%低于发布门槛${input.profile.planningMinConfidence}%，仅保留后台决策。`,
    };
  }
  const content = buildContent(input.decision, input.profile, input.now);
  if (!content) {
    return { plan: null, allowed: false, code: "PLAN_CONTENT_INCOMPLETE", reason: "缺少方向、入场、止损或目标，不能发布结构化计划。" };
  }
  let current = await findActivePlan(input.profile.strategyType, input.decision.symbol);
  if (current && current.direction !== input.decision.direction) {
    await supersedePlan(current, input.now, "预测或技术方向改变，原计划失效并创建新的计划组。" );
    current = null;
  }
  if (current && contentMateriallyChanged(current, content)) {
    await supersedePlan(current, input.now, "入场区域、止损或主要目标发生实质变化，保留旧版本并发布新版本。" );
    current = await createPlan(input.decision, input.profile, content, input.now, current.plan_group_id, Number(current.version) + 1);
  } else if (!current) {
    current = await createPlan(input.decision, input.profile, content, input.now, `grp_${randomUUID()}`, 1);
  } else {
    current = await updateDynamicPlan(current, input.decision, input.now);
  }

  const plan = mapPlan(current);
  const acceleratedProbe = ["PROBE_ENTRY", "DAILY_ACTIVITY_PROBE", "DAILY_MINIMUM_EXECUTION"].includes(input.decision.rejectionCode);
  const executionConfidenceFloor = acceleratedProbe
    ? Math.max(input.profile.planningMinConfidence, input.profile.minConfidence - 8)
    : input.profile.minConfidence;
  if (input.decision.confidence < executionConfidenceFloor) {
    return {
      plan,
      allowed: false,
      code: "CURRENT_CONFIDENCE_LOW",
      reason: `当前置信度${input.decision.confidence}%低于${acceleratedProbe ? "探路仓" : "确认仓"}执行门槛${executionConfidenceFloor}%，本轮禁止下单。`,
    };
  }
  if (plan.tier !== "FORMAL") {
    return { plan, allowed: false, code: "CANDIDATE_PLAN_ONLY", reason: "候选计划尚未达到本次入场批次的执行门槛。" };
  }
  const leadMinutes = input.decision.rejectionCode === "LIVE_COMMISSIONING" || acceleratedProbe
    ? 1
    : MIN_LEAD_MINUTES[input.profile.strategyType];
  const ageMinutes = Math.max(0, (input.now.getTime() - new Date(plan.publishedAt).getTime()) / 60_000);
  if (ageMinutes + 1e-9 < leadMinutes) {
    return {
      plan,
      allowed: false,
      code: "PLAN_LEAD_TIME",
      reason: `${plan.strategyLabel}计划必须在可执行订单前至少发布${leadMinutes}分钟；目前已发布${round(ageMinutes, 1)}分钟，本轮不下单。`,
    };
  }
  if (plan.status !== "ARMED" && plan.status !== "WATCHING") {
    return { plan, allowed: false, code: "PLAN_STATE_NOT_EXECUTABLE", reason: `计划当前状态${plan.status}不允许创建新订单。` };
  }
  return {
    plan,
    allowed: true,
    code: "PLAN_PUBLISHED_BEFORE_EXECUTION",
    reason: `AI计划V${plan.version}已提前发布并锁定，满足${leadMinutes}分钟事前展示要求。`,
  };
}

export async function syncAiTradePlanFromDecision(decision: ThreeHorizonStrategyDecision, now = new Date()): Promise<void> {
  if (!(await ensureAiTradePlanTables()) || !prisma) return;
  const rows = await prisma.$queryRawUnsafe<PlanRow[]>(
    `SELECT p.* FROM trade_ai_plans p
     LEFT JOIN trade_three_horizon_decisions d ON d.plan_id = p.id
     WHERE d.id = $1 OR p.source_decision_id = $1
     ORDER BY p.version DESC LIMIT 1`,
    decision.id
  );
  const current = rows[0];
  if (!current) return;
  await updateDynamicPlan(current, decision, now);
}

export async function syncAiTradePlansFromRecentDecisions(now = new Date()): Promise<number> {
  if (!(await ensureAiTradePlanTables()) || !prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    strategy_type: ThreeHorizonStrategyType;
    mode: "SHADOW" | "DEMO" | "LIVE";
    symbol: string;
    status: ThreeHorizonStrategyDecision["status"];
    direction: ThreeHorizonStrategyDecision["direction"];
    confidence: number;
    technical_score: number;
    forecast_score: number;
    conditions: unknown;
    rejection_code: string;
    rejection_reason: string;
    current_price: number | null;
    entry_price: number | null;
    stop_loss: number | null;
    target_1: number | null;
    target_2: number | null;
    quantity: number | null;
    risk_amount_usdt: number | null;
    risk_pct: number | null;
    max_holding_until: Date | null;
    expires_at: Date | null;
    client_oid: string | null;
    bitget_order_id: string | null;
    protection_order_id: string | null;
    tp1_done: boolean;
    entry_stage: number;
    max_entry_stages: number;
    scale_in_order_id: string | null;
    opened_at: Date | null;
    closed_at: Date | null;
    realized_pnl_usdt: number | null;
    created_at: Date;
    updated_at: Date;
    plan_id: string | null;
  }>>(`
    SELECT * FROM trade_three_horizon_decisions
    WHERE plan_id IS NOT NULL
    ORDER BY updated_at DESC LIMIT 80
  `);
  let count = 0;
  for (const row of rows) {
    const conditions = Array.isArray(row.conditions)
      ? row.conditions
      : typeof row.conditions === "string"
        ? JSON.parse(row.conditions)
        : [];
    const decision: ThreeHorizonStrategyDecision = {
      id: row.id,
      runId: "reconcile",
      planId: row.plan_id,
      strategyType: row.strategy_type,
      strategyLabel: STRATEGY_LABEL[row.strategy_type as ThreeHorizonStrategyType],
      mode: row.mode,
      symbol: row.symbol,
      status: row.status,
      direction: row.direction,
      confidence: Number(row.confidence),
      technicalScore: Number(row.technical_score),
      forecastScore: Number(row.forecast_score),
      conditionsMet: (conditions as Array<{ met?: boolean }>).filter((item) => item.met).length,
      conditionsTotal: conditions.length,
      conditions: conditions as ThreeHorizonStrategyDecision["conditions"],
      rejectionCode: row.rejection_code,
      rejectionReason: row.rejection_reason,
      currentPrice: row.current_price,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      target1: row.target_1,
      target2: row.target_2,
      quantity: row.quantity,
      riskAmountUsdt: row.risk_amount_usdt,
      riskPct: row.risk_pct,
      maxHoldingUntil: iso(row.max_holding_until),
      expiresAt: iso(row.expires_at),
      clientOid: row.client_oid,
      bitgetOrderId: row.bitget_order_id,
      protectionOrderId: row.protection_order_id,
      tp1Done: Boolean(row.tp1_done),
      entryStage: Number(row.entry_stage ?? 0),
      maxEntryStages: Number(row.max_entry_stages ?? 2),
      scaleInOrderId: row.scale_in_order_id,
      openedAt: iso(row.opened_at),
      closedAt: iso(row.closed_at),
      realizedPnlUsdt: row.realized_pnl_usdt,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
    await syncAiTradePlanFromDecision(decision, now);
    count += 1;
  }
  return count;
}

async function loadEvents(planIds: string[]): Promise<Map<string, AiTradePlanEvent[]>> {
  const map = new Map<string, AiTradePlanEvent[]>();
  if (!prisma || !planIds.length) return map;
  const placeholders = planIds.map((_, index) => `$${index + 1}`).join(",");
  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `SELECT id, plan_id, event_type, title, detail, status, bitget_order_id,
            client_oid, price, quantity, event_at
     FROM trade_ai_plan_events
     WHERE plan_id IN (${placeholders})
     ORDER BY event_at ASC, created_at ASC`,
    ...planIds
  );
  for (const row of rows) {
    const list = map.get(row.plan_id) ?? [];
    list.push(mapEvent(row));
    map.set(row.plan_id, list);
  }
  return map;
}


async function getLatestIntentDecisions(): Promise<AiTradeIntentDecision[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<IntentDecisionRow[]>(`
    SELECT DISTINCT ON (strategy_type, symbol)
      symbol, strategy_type, direction, status, confidence, technical_score,
      forecast_score, conditions, current_price, entry_price, stop_loss,
      target_1, target_2, risk_pct, max_holding_until, rejection_reason, updated_at
    FROM trade_three_horizon_decisions
    ORDER BY strategy_type, symbol,
      CASE WHEN status IN ('OPEN','PARTIAL','ORDER_SUBMITTED','CLOSING') THEN 0 ELSE 1 END,
      updated_at DESC, created_at DESC
  `);
  return rows.map((row) => {
    const rawConditions = Array.isArray(row.conditions) ? row.conditions : [];
    const conditions = rawConditions.filter((condition): condition is ThreeHorizonCondition =>
      Boolean(condition) &&
      typeof condition === "object" &&
      "key" in condition &&
      "label" in condition &&
      "met" in condition &&
      "value" in condition &&
      "weight" in condition
    );
    const met = conditions.filter((condition) => condition.met).length;
    return {
      symbol: row.symbol,
      strategyType: row.strategy_type,
      strategyLabel: STRATEGY_LABEL[row.strategy_type],
      direction: row.direction,
      status: row.status,
      confidence: Number(row.confidence || 0),
      technicalScore: Number(row.technical_score || 0),
      forecastScore: Number(row.forecast_score || 0),
      conditions,
      currentPrice: row.current_price == null ? null : Number(row.current_price),
      entryPrice: row.entry_price == null ? null : Number(row.entry_price),
      stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
      target1: row.target_1 == null ? null : Number(row.target_1),
      target2: row.target_2 == null ? null : Number(row.target_2),
      conditionsMet: met,
      conditionsTotal: conditions.length,
      riskPct: row.risk_pct == null ? null : Number(row.risk_pct),
      maxHoldingUntil: row.max_holding_until ? row.max_holding_until.toISOString() : null,
      rejectionReason: row.rejection_reason || "",
      updatedAt: row.updated_at.toISOString(),
    };
  });
}

async function expireStaleAiTradePlans(now: Date): Promise<number> {
  if (!prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; version: number }>>(
    `UPDATE trade_ai_plans SET
       status='EXPIRED', closed_at=COALESCE(closed_at,$1::timestamptz),
       close_reason=COALESCE(close_reason,'计划超过有效期且未形成委托或持仓。'), updated_at=NOW()
     WHERE expires_at <= $1::timestamptz
       AND status IN ('PUBLISHED','WATCHING','ARMED','EXECUTION_ERROR')
     RETURNING id,version`,
    now.toISOString()
  );
  for (const row of rows) {
    await appendEvent({
      planId: row.id,
      eventType: "PLAN_EXPIRED",
      title: STATUS_LABEL.EXPIRED,
      detail: "计划超过有效期且未形成委托或持仓，已自动退出有效计划列表。",
      status: "EXPIRED",
      eventAt: now,
      dedupe: `v${row.version}:${now.toISOString().slice(0, 16)}`,
    });
  }
  return rows.length;
}

function parseRuntimeQuotes(value: unknown): Array<{ symbol?: unknown; price?: unknown; capturedAt?: unknown }> {
  if (Array.isArray(value)) return value as Array<{ symbol?: unknown; price?: unknown; capturedAt?: unknown }>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as Array<{ symbol?: unknown; price?: unknown; capturedAt?: unknown }> : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function getRuntimeMarketQuotes(now: Date): Promise<AiTradeMarketQuote[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<RuntimeQuoteStateRow[]>(
    `SELECT latest_quotes FROM trade_bitget_runtime_state WHERE id='default' LIMIT 1`
  ).catch(() => []);
  return parseRuntimeQuotes(rows[0]?.latest_quotes)
    .map((row) => {
      const symbol = String(row.symbol ?? "").toUpperCase();
      const price = Number(row.price);
      const capturedAt = typeof row.capturedAt === "string" ? row.capturedAt : "";
      const timestamp = Date.parse(capturedAt);
      const ageSeconds = Number.isFinite(timestamp)
        ? Math.max(0, Math.floor((now.getTime() - timestamp) / 1000))
        : null;
      return {
        symbol,
        price,
        capturedAt,
        ageSeconds,
        fresh: ageSeconds != null && ageSeconds <= 180,
      };
    })
    .filter((row) => row.symbol && Number.isFinite(row.price) && row.price > 0 && row.capturedAt);
}

export async function getPublishedAiTradePlans(limit = 30): Promise<AiTradePlan[]> {
  if (!(await ensureAiTradePlanTables()) || !prisma) return [];
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await prisma.$queryRawUnsafe<PlanRow[]>(
    `SELECT * FROM trade_ai_plans
     ORDER BY published_at DESC, version DESC
     LIMIT ${safeLimit}`
  );
  const events = await loadEvents(rows.map((row: PlanRow) => row.id));
  return rows.map((row: PlanRow) => mapPlan(row, events.get(row.id) ?? []));
}

export async function getAiTradePlanDashboard(now = new Date()): Promise<AiTradePlanDashboard> {
  const databaseReady = await ensureAiTradePlanTables();
  if (databaseReady) await expireStaleAiTradePlans(now).catch(() => 0);
  const [storedPlans, decisions, quotes]: [AiTradePlan[], AiTradeIntentDecision[], AiTradeMarketQuote[]] = databaseReady
    ? await Promise.all([getPublishedAiTradePlans(60), getLatestIntentDecisions(), getRuntimeMarketQuotes(now)])
    : [[], [], []];
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote] as const));
  const plans = storedPlans.map((plan) => {
    const quote = quoteBySymbol.get(plan.symbol.toUpperCase());
    if (!quote) return plan;
    return {
      ...plan,
      currentPrice: quote.price,
      distanceToEntryPct: distancePct(quote.price, plan.entryZoneLow, plan.entryZoneHigh),
    };
  });
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60_000);
  const dayKey = beijingNow.toISOString().slice(0, 10);
  const today = (value: string | null) => value ? new Date(new Date(value).getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10) === dayKey : false;
  const grouped = new Map<string, AiTradePlan[]>();
  for (const plan of plans) {
    const key = `${plan.strategyType}:${plan.symbol.toUpperCase()}`;
    const list = grouped.get(key) ?? [];
    list.push(plan);
    grouped.set(key, list);
  }
  const groups = Array.from(grouped.values()).map((list) =>
    [...list].sort((a, b) => b.version - a.version)
  );
  const latestPlans = groups.map((list) => list[0]).filter((plan): plan is AiTradePlan => Boolean(plan));
  const firstPublications = groups.map((list) => list[list.length - 1]).filter((plan): plan is AiTradePlan => Boolean(plan));
  return {
    databaseReady,
    generatedAt: now.toISOString(),
    summary: {
      // Count unique plan groups, not every replacement version.
      publishedToday: firstPublications.filter((plan) => today(plan.publishedAt)).length,
      watching: latestPlans.filter((plan) => plan.status === "WATCHING" || plan.status === "PUBLISHED").length,
      armed: latestPlans.filter((plan) => plan.status === "ARMED").length,
      submittedOrOpen: latestPlans.filter((plan) => ["ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"].includes(plan.status)).length,
      closedToday: latestPlans.filter((plan) => plan.status === "CLOSED" && today(plan.closedAt)).length,
    },
    decisions,
    quotes,
    plans,
    notice: "价格来自最近一次Bitget实盘行情快照；计划先发布并锁定，达到技术触发与风控条件后才提交订单。",
  };
}
