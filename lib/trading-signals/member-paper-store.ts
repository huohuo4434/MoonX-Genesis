import "server-only";

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  MemberPaperAccount,
  MemberPaperEvent,
  MemberPaperPosition,
  MemberPaperSnapshot,
  MemberTradingPlan,
} from "@/types/member-trading-plan";

type AccountRow = {
  id: string;
  user_id: string;
  initial_cash: number;
  cash_balance: number;
  realized_pnl: number;
  peak_equity: number;
  max_drawdown_pct: number;
  paused: boolean;
  pause_reason: string;
  created_at: Date;
  updated_at: Date;
};

type PositionRow = {
  id: string;
  source_plan_id: string;
  source_plan_version: number;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  quantity: number;
  entry_price: number;
  current_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3: number;
  realized_pnl: number;
  unrealized_pnl: number;
  opened_at: Date;
  closed_at: Date | null;
};

type EventRow = { result_payload: MemberPaperSnapshot | string; request_fingerprint: string };
type PublicEventRow = {
  id: string;
  position_id: string | null;
  source_plan_id: string;
  source_plan_version: number;
  event_type: "ENTER" | "EXIT";
  price: number;
  quantity: number;
  realized_pnl: number;
  created_at: Date;
};

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function pnl(direction: "LONG" | "SHORT", entry: number, current: number, quantity: number): number {
  return finite((current - entry) * quantity * (direction === "LONG" ? 1 : -1));
}

function mapPosition(row: PositionRow): MemberPaperPosition {
  return {
    id: row.id,
    sourcePlanId: row.source_plan_id,
    sourcePlanVersion: row.source_plan_version,
    symbol: row.symbol,
    direction: row.direction,
    status: row.status,
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    currentPrice: Number(row.current_price),
    stopLoss: Number(row.stop_loss),
    takeProfits: [Number(row.target_1), Number(row.target_2), Number(row.target_3)],
    realizedPnl: Number(row.realized_pnl),
    unrealizedPnl: Number(row.unrealized_pnl),
    openedAt: row.opened_at.toISOString(),
    closedAt: row.closed_at?.toISOString() ?? null,
  };
}

async function ensureAccount(userId: string): Promise<void> {
  if (!prisma) throw new Error("Paper数据库未连接");
  await prisma.$executeRaw`
    INSERT INTO member_paper_accounts (
      id, user_id, initial_cash, cash_balance, peak_equity
    ) VALUES (
      ${`mpa_${randomUUID()}`}, ${userId}, 10000, 10000, 10000
    ) ON CONFLICT (user_id) DO NOTHING
  `;
}

async function readSnapshot(userId: string): Promise<MemberPaperSnapshot> {
  if (!prisma) throw new Error("Paper数据库未连接");
  const [accounts, positions, events] = await Promise.all([
    prisma.$queryRawUnsafe<AccountRow[]>(
      "SELECT * FROM member_paper_accounts WHERE user_id = $1 LIMIT 1",
      userId
    ),
    prisma.$queryRawUnsafe<PositionRow[]>(
      "SELECT * FROM member_paper_positions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 200",
      userId
    ),
    prisma.$queryRawUnsafe<PublicEventRow[]>(
      `SELECT id, position_id, source_plan_id, source_plan_version, event_type,
              price, quantity, realized_pnl, created_at
       FROM member_paper_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      userId
    ),
  ]);
  const row = accounts[0];
  if (!row) throw new Error("Paper账户不存在");
  const mapped = positions.map(mapPosition);
  const unrealized = mapped.filter((position) => position.status === "OPEN")
    .reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const equity = Number(row.cash_balance) + unrealized;
  const account: MemberPaperAccount = {
    id: row.id,
    userId: row.user_id,
    initialCash: Number(row.initial_cash),
    cashBalance: Number(row.cash_balance),
    realizedPnl: Number(row.realized_pnl),
    unrealizedPnl: unrealized,
    equity,
    peakEquity: Number(row.peak_equity),
    maxDrawdownPct: Number(row.max_drawdown_pct),
    paused: row.paused,
    pauseReason: row.pause_reason,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
  const publicEvents: MemberPaperEvent[] = events.map((event) => ({
    id: event.id,
    positionId: event.position_id,
    sourcePlanId: event.source_plan_id,
    sourcePlanVersion: Number(event.source_plan_version),
    eventType: event.event_type,
    price: Number(event.price),
    quantity: Number(event.quantity),
    realizedPnl: Number(event.realized_pnl),
    createdAt: event.created_at.toISOString(),
  }));
  return { schema: "moonx.member.paper.v1", generatedAt: new Date().toISOString(), account, positions: mapped, events: publicEvents };
}

export async function getMemberPaperSnapshot(userId: string): Promise<MemberPaperSnapshot> {
  await ensureAccount(userId);
  return readSnapshot(userId);
}

export async function markMemberPaperPositions(input: {
  userId: string;
  prices: Readonly<Record<string, number>>;
}): Promise<MemberPaperSnapshot> {
  await ensureAccount(input.userId);
  if (!prisma) throw new Error("Paper数据库未连接");
  await prisma.$transaction(async (tx) => {
    const accounts = await tx.$queryRawUnsafe<AccountRow[]>(
      "SELECT * FROM member_paper_accounts WHERE user_id = $1 FOR UPDATE",
      input.userId
    );
    const account = accounts[0];
    if (!account) throw new Error("Paper账户不存在");
    const positions = await tx.$queryRawUnsafe<PositionRow[]>(
      "SELECT * FROM member_paper_positions WHERE user_id = $1 AND status = 'OPEN' FOR UPDATE",
      input.userId
    );
    let totalUnrealized = 0;
    for (const position of positions) {
      const trusted = Number(input.prices[position.symbol.toUpperCase()]);
      if (!Number.isFinite(trusted) || trusted <= 0) {
        totalUnrealized += Number(position.unrealized_pnl);
        continue;
      }
      const price = trusted;
      const unrealized = pnl(position.direction, Number(position.entry_price), price, Number(position.quantity));
      totalUnrealized += unrealized;
      await tx.$executeRaw`
        UPDATE member_paper_positions SET current_price = ${price}, unrealized_pnl = ${unrealized}, updated_at = NOW()
        WHERE id = ${position.id} AND status = 'OPEN'
      `;
    }
    const equity = Number(account.cash_balance) + totalUnrealized;
    const peak = Math.max(Number(account.peak_equity), equity);
    const drawdown = peak > 0 ? Math.max(0, (peak - equity) / peak * 100) : 0;
    const pauseForDrawdown = drawdown >= 10;
    await tx.$executeRaw`
      UPDATE member_paper_accounts SET
        peak_equity = ${peak}, max_drawdown_pct = GREATEST(max_drawdown_pct, ${drawdown}),
        paused = CASE WHEN ${pauseForDrawdown} THEN TRUE ELSE paused END,
        pause_reason = CASE WHEN ${pauseForDrawdown} THEN 'Paper账户回撤达到10%' ELSE pause_reason END,
        updated_at = NOW()
      WHERE id = ${account.id}
    `;
  });
  return readSnapshot(input.userId);
}

export function buildMemberPaperRequestFingerprint(input: {
  action: "ENTER" | "EXIT";
  symbol: string;
  planId?: string;
  planVersion?: number;
  revisionId?: string;
  positionId?: string;
}): string {
  return createHash("sha256").update([
    input.action,
    input.symbol.trim().toUpperCase(),
    input.planId ?? "",
    String(input.planVersion ?? ""),
    input.revisionId ?? "",
    input.positionId ?? "",
  ].join(":"), "utf8").digest("hex");
}

export async function getMemberPaperIdempotentResult(input: {
  userId: string;
  idempotencyKey: string;
  fingerprint: string;
}): Promise<MemberPaperSnapshot | null> {
  if (!prisma) return null;
  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    "SELECT result_payload, request_fingerprint FROM member_paper_events WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1",
    input.userId,
    input.idempotencyKey
  );
  const row = rows[0];
  if (row && row.request_fingerprint !== input.fingerprint) throw new Error("幂等键已用于不同操作或计划");
  const value = row?.result_payload;
  if (!value) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) as Partial<MemberPaperSnapshot> : value;
  return parsed.schema === "moonx.member.paper.v1"
    ? parsed as MemberPaperSnapshot
    : readSnapshot(input.userId);
}

function requirePrice(plan: MemberTradingPlan): number {
  const price = Number(plan.execution.currentPrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error("实时价格不可用，Paper不执行");
  return price;
}

function validateRiskGeometry(plan: MemberTradingPlan, price: number): void {
  if (plan.execution.levelStatus !== "VALID" || !plan.execution.entryZone || plan.execution.stopLoss == null || !plan.execution.takeProfits) {
    throw new Error("执行点位不可用，Paper不执行");
  }
  const stop = plan.execution.stopLoss;
  const [target1, target2, target3] = plan.execution.takeProfits;
  const [low, high] = plan.execution.entryZone;
  const long = plan.authority.direction === "LONG";
  const valid = low <= high && (long
    ? stop < Math.min(low, price) && Math.max(high, price) < target1 && target1 < target2 && target2 < target3
    : stop > Math.max(high, price) && Math.min(low, price) > target1 && target1 > target2 && target2 > target3);
  if (!valid) throw new Error("止损止盈结构与当前价格不一致，Paper不执行");
}

export async function enterMemberPaperPlan(input: {
  userId: string;
  idempotencyKey: string;
  plan: MemberTradingPlan;
}): Promise<MemberPaperSnapshot> {
  const fingerprint = buildMemberPaperRequestFingerprint({
    action: "ENTER", symbol: input.plan.symbol, planId: input.plan.planId,
    planVersion: input.plan.version, revisionId: input.plan.revisionId,
  });
  const previous = await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint });
  if (previous) return previous;
  if (!prisma) throw new Error("Paper数据库未连接");
  if (!input.plan.risk.paperOnly || !input.plan.risk.tradingEligible || !["LONG_READY", "SHORT_READY"].includes(input.plan.state)) {
    throw new Error("当前计划尚未满足Paper入场条件");
  }
  const price = requirePrice(input.plan);
  validateRiskGeometry(input.plan, price);
  const stopLoss = input.plan.execution.stopLoss!;
  const takeProfits = input.plan.execution.takeProfits!;
  await ensureAccount(input.userId);
  const positionId = `mpp_${randomUUID()}`;
  let accountId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRawUnsafe<AccountRow[]>(
        "SELECT * FROM member_paper_accounts WHERE user_id = $1 FOR UPDATE",
        input.userId
      );
      const account = accounts[0];
      if (!account || account.paused) throw new Error(account?.pause_reason || "Paper账户已暂停");
      if (Number(account.max_drawdown_pct) >= 10) throw new Error("Paper账户回撤达到10%，禁止新增仓位");
      const openRows = await tx.$queryRawUnsafe<PositionRow[]>(
        "SELECT * FROM member_paper_positions WHERE user_id = $1 AND status = 'OPEN' FOR UPDATE",
        input.userId
      );
      const daily = await tx.$queryRawUnsafe<Array<{ realized: number }>>(
        `SELECT COALESCE(SUM(realized_pnl), 0) AS realized FROM member_paper_events
         WHERE user_id = $1 AND event_type = 'EXIT' AND created_at >= date_trunc('day', NOW())`,
        input.userId
      );
      if (Number(daily[0]?.realized ?? 0) <= -Number(account.initial_cash) * 0.02) {
        throw new Error("Paper账户当日亏损达到2%，禁止新增仓位");
      }
      if (openRows.length >= 4) throw new Error("Paper账户最多同时持有4个品种");
      const openNotional = openRows.reduce((sum, row) => sum + Number(row.current_price) * Number(row.quantity), 0);
      const openRisk = openRows.reduce((sum, row) => sum + Math.abs(Number(row.entry_price) - Number(row.stop_loss)) * Number(row.quantity), 0);
      const openUnrealized = openRows.reduce((sum, row) => sum + Number(row.unrealized_pnl), 0);
      const equity = Number(account.cash_balance) + openUnrealized;
      const stopDistance = Math.abs(price - stopLoss);
      const riskBudget = equity * input.plan.risk.riskPerTradePct / 100;
      const remainingRisk = Math.max(0, equity * 0.03 - openRisk);
      const remainingNotional = Math.max(0, equity * 0.20 - openNotional);
      const riskQuantity = stopDistance > 0 ? Math.min(riskBudget, remainingRisk) / stopDistance : 0;
      const positionQuantity = Math.min(equity * input.plan.risk.maxPositionPct / 100, remainingNotional) / price;
      const quantity = Math.min(riskQuantity, positionQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Paper组合总风险或总敞口已达上限");
      accountId = account.id;
      await tx.$executeRaw`
        INSERT INTO member_paper_positions (
          id, account_id, user_id, source_plan_id, source_plan_version, source_revision_id,
          symbol, direction, status, quantity, entry_price, current_price, stop_loss,
          target_1, target_2, target_3, realized_pnl, unrealized_pnl
        ) VALUES (
          ${positionId}, ${account.id}, ${input.userId}, ${input.plan.planId}, ${input.plan.version}, ${input.plan.revisionId},
          ${input.plan.symbol}, ${input.plan.authority.direction}, 'OPEN', ${quantity}, ${price}, ${price}, ${stopLoss},
          ${takeProfits[0]}, ${takeProfits[1]}, ${takeProfits[2]}, 0, 0
        )
      `;
      await tx.$executeRaw`
        UPDATE member_paper_accounts SET updated_at = NOW() WHERE id = ${account.id}
      `;
      await tx.$executeRaw`
        INSERT INTO member_paper_events (
          id, account_id, user_id, position_id, source_plan_id, source_plan_version,
          event_type, idempotency_key, request_fingerprint, price, quantity, realized_pnl, result_payload
        ) VALUES (
          ${`mpe_${randomUUID()}`}, ${account.id}, ${input.userId}, ${positionId}, ${input.plan.planId}, ${input.plan.version},
          'ENTER', ${input.idempotencyKey}, ${fingerprint}, ${price}, ${quantity}, 0, '{}'::jsonb
        )
      `;
    });
  } catch (error) {
    const retry = await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint });
    if (retry) return retry;
    throw error;
  }
  const snapshot = await readSnapshot(input.userId);
  await prisma.$executeRaw`
    UPDATE member_paper_events SET result_payload = ${JSON.stringify(snapshot)}::jsonb
    WHERE user_id = ${input.userId} AND idempotency_key = ${input.idempotencyKey} AND account_id = ${accountId}
  `;
  return (await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint })) ?? snapshot;
}

export async function exitMemberPaperPosition(input: {
  userId: string;
  idempotencyKey: string;
  symbol: string;
  positionId: string;
  price: number;
}): Promise<MemberPaperSnapshot> {
  const symbol = input.symbol.trim().toUpperCase();
  const fingerprint = buildMemberPaperRequestFingerprint({ action: "EXIT", symbol, positionId: input.positionId });
  const previous = await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint });
  if (previous) return previous;
  if (!prisma) throw new Error("Paper数据库未连接");
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("实时价格不可用，Paper不执行");
  await ensureAccount(input.userId);
  let accountId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRawUnsafe<AccountRow[]>(
        "SELECT * FROM member_paper_accounts WHERE user_id = $1 FOR UPDATE",
        input.userId
      );
      const account = accounts[0];
      if (!account) throw new Error("Paper账户不存在");
      const rows = await tx.$queryRawUnsafe<Array<PositionRow & { account_id: string }>>(
        "SELECT * FROM member_paper_positions WHERE user_id = $1 AND id = $2 AND symbol = $3 AND status = 'OPEN' LIMIT 1 FOR UPDATE",
        input.userId,
        input.positionId,
        symbol
      );
      const position = rows[0];
      if (!position) throw new Error("没有该品种的Paper持仓");
      const realized = pnl(position.direction, Number(position.entry_price), price, Number(position.quantity));
      accountId = account.id;
      const changed = await tx.$executeRaw`
        UPDATE member_paper_positions SET
          status = 'CLOSED', current_price = ${price}, realized_pnl = ${realized},
          unrealized_pnl = 0, closed_at = NOW(), updated_at = NOW()
        WHERE id = ${position.id} AND status = 'OPEN'
      `;
      if (changed !== 1) throw new Error("Paper持仓已由另一请求结算");
      await tx.$executeRaw`
        UPDATE member_paper_accounts SET
          cash_balance = cash_balance + ${realized}, realized_pnl = realized_pnl + ${realized},
          peak_equity = GREATEST(peak_equity, cash_balance + ${realized}),
          max_drawdown_pct = GREATEST(max_drawdown_pct,
            CASE WHEN peak_equity > 0 THEN (peak_equity - (cash_balance + ${realized})) / peak_equity * 100 ELSE 0 END),
          updated_at = NOW()
        WHERE id = ${position.account_id}
      `;
      await tx.$executeRaw`
        INSERT INTO member_paper_events (
          id, account_id, user_id, position_id, source_plan_id, source_plan_version,
          event_type, idempotency_key, request_fingerprint, price, quantity, realized_pnl, result_payload
        ) VALUES (
          ${`mpe_${randomUUID()}`}, ${position.account_id}, ${input.userId}, ${position.id}, ${position.source_plan_id}, ${position.source_plan_version},
          'EXIT', ${input.idempotencyKey}, ${fingerprint}, ${price}, ${position.quantity}, ${realized}, '{}'::jsonb
        )
      `;
    });
  } catch (error) {
    const retry = await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint });
    if (retry) return retry;
    throw error;
  }
  const snapshot = await readSnapshot(input.userId);
  await prisma.$executeRaw`
    UPDATE member_paper_events SET result_payload = ${JSON.stringify(snapshot)}::jsonb
    WHERE user_id = ${input.userId} AND idempotency_key = ${input.idempotencyKey} AND account_id = ${accountId}
  `;
  return (await getMemberPaperIdempotentResult({ userId: input.userId, idempotencyKey: input.idempotencyKey, fingerprint })) ?? snapshot;
}
