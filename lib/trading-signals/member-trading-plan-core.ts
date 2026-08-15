import { createHash } from "crypto";
import type { AiTradePlan } from "@/types/ai-trade-plan";
import type { ChanMultiTimeframeDecision } from "@/types/chan-execution";
import type { MemberTradingPlan, MemberTradingPlanState } from "@/types/member-trading-plan";

const ACTIVE_SOURCE_STATUSES = new Set(["PUBLISHED", "WATCHING", "ARMED", "OPEN", "REDUCED"]);

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isMemberPlanFormal(plan: AiTradePlan, nowMs: number): boolean {
  const published = timestamp(plan.forecastPublishedAt);
  const locked = timestamp(plan.forecastLockedAt);
  const from = timestamp(plan.forecastValidFrom);
  const until = timestamp(plan.forecastValidUntil);
  return Boolean(
    plan.forecastId && plan.forecastVersion && plan.forecastHorizon &&
    plan.tier === "FORMAL" && plan.contentHash.trim().length >= 8 &&
    published != null && published <= nowMs && locked != null && locked <= nowMs &&
    from != null && from <= nowMs && until != null && nowMs <= until &&
    ACTIVE_SOURCE_STATUSES.has(plan.status) &&
    (plan.direction === "LONG" || plan.direction === "SHORT")
  );
}

function stateFor(input: {
  plan: AiTradePlan;
  formal: boolean;
  chan: ChanMultiTimeframeDecision;
}): MemberTradingPlanState {
  if (!input.formal) return "NO_AUTHORITY";
  const expected = input.plan.direction === "LONG" ? "BULL" : "BEAR";
  if (
    input.chan.authoritativeDirection !== expected ||
    input.chan.reasons.includes("STRUCTURE_OPPOSES_AUTHORITY")
  ) return "CONFLICT_WAIT";
  if (["OPEN", "REDUCED"].includes(input.plan.status)) return "RISK_REDUCE";
  if (["CLOSED", "CANCELLED", "EXPIRED", "INVALIDATED", "SUPERSEDED"].includes(input.plan.status)) {
    return "EXIT_OR_PROTECT";
  }
  const sourceArmed = input.plan.status === "ARMED" &&
    input.plan.conditionsTotal > 0 && input.plan.conditionsMet >= input.plan.conditionsTotal;
  if (sourceArmed && input.chan.action === "BUY_CANDIDATE" && input.plan.direction === "LONG") return "LONG_READY";
  if (sourceArmed && input.chan.action === "SELL_CANDIDATE" && input.plan.direction === "SHORT") return "SHORT_READY";
  return "WAIT_CONFIRMATION";
}

function statusReason(state: MemberTradingPlanState, chan: ChanMultiTimeframeDecision): string {
  if (state === "LONG_READY") return "正式方向看多，四周期缠论结构完成并出现同向候选买点。";
  if (state === "SHORT_READY") return "正式方向看空，四周期缠论结构完成并出现同向候选卖点。";
  if (state === "NO_AUTHORITY") return "没有当前有效且已发布锁定的正式预测，禁止生成执行候选。";
  if (state === "CONFLICT_WAIT") return "正式方向与缠论结构冲突，保持等待。";
  if (state === "RISK_REDUCE") return "已有计划处于持仓管理阶段，只允许减仓或保护，不新增敞口。";
  if (state === "EXIT_OR_PROTECT") return "计划已结束或失效，只允许退出与保护。";
  return chan.reasons.length ? `等待确认：${chan.reasons.join("、")}` : "方向已锁定，等待缠论结构完成确认。";
}

export function buildMemberTradingPlan(input: {
  plan: AiTradePlan;
  chan: ChanMultiTimeframeDecision;
  currentPrice: number | null;
  generatedAt: string;
}): MemberTradingPlan {
  const nowMs = Date.parse(input.generatedAt);
  const formal = Number.isFinite(nowMs) && isMemberPlanFormal(input.plan, nowMs);
  const state = stateFor({ plan: input.plan, formal, chan: input.chan });
  const controlling = input.chan.timeframeSignals.find((row) => row.timeframe === "4H")
    ?? input.chan.timeframeSignals[0];
  const revisionId = createHash("sha256").update(JSON.stringify({
    source: input.plan.contentHash,
    version: input.plan.version,
    state,
    action: input.chan.action,
    stages: input.chan.timeframeSignals.map((row) => [row.timeframe, row.stage.code]),
    confirmation: input.chan.confirmation,
    invalidation: input.chan.invalidation,
  })).digest("hex").slice(0, 24);
  const ready = state === "LONG_READY" || state === "SHORT_READY";
  return {
    schema: "moonx.member.trading-plan.v1",
    planId: input.plan.id,
    planGroupId: input.plan.planGroupId,
    version: input.plan.version,
    revisionId,
    symbol: input.plan.symbol,
    generatedAt: input.generatedAt,
    validUntil: input.plan.forecastValidUntil ?? input.plan.expiresAt,
    state,
    authority: {
      direction: formal ? input.plan.direction : "NEUTRAL",
      horizon: input.plan.forecastHorizon,
      forecastId: input.plan.forecastId,
      forecastVersion: input.plan.forecastVersion,
      publishedAt: input.plan.forecastPublishedAt,
      lockedAt: input.plan.forecastLockedAt,
      validFrom: input.plan.forecastValidFrom,
      validUntil: input.plan.forecastValidUntil,
      valid: formal,
    },
    chan: {
      action: input.chan.action,
      technicalBias: input.chan.technicalBias,
      stage: controlling?.stage.code ?? "STRUCTURE_INCOMPLETE",
      stageLabel: controlling?.stage.labelZh ?? "结构证据不足",
      confirmation: input.chan.confirmation ?? controlling?.stage.confirmation ?? null,
      invalidation: input.chan.invalidation ?? controlling?.stage.invalidation ?? null,
      reasons: [...input.chan.reasons],
      timeframes: input.chan.timeframeSignals.map((row) => ({
        timeframe: row.timeframe,
        available: row.available,
        complete: row.complete,
        stage: row.stage.code,
        stageLabel: row.stage.labelZh,
      })),
    },
    execution: {
      currentPrice: input.currentPrice,
      entryZone: [input.plan.entryZoneLow, input.plan.entryZoneHigh],
      confirmationAboveOrBelow: input.chan.confirmation ?? controlling?.stage.confirmation ?? null,
      stopLoss: input.plan.protectiveStop,
      takeProfits: [input.plan.target1, input.plan.target2, input.plan.target3],
      triggerRule: input.plan.triggerRule,
      invalidationRule: input.plan.invalidationRule,
      statusReason: statusReason(state, input.chan),
    },
    risk: {
      paperOnly: true,
      serverExecutionAllowed: false,
      memberLocalAgentEligible: ready,
      tradingEligible: ready,
      riskPerTradePct: Math.max(0.1, Math.min(1, input.plan.riskPercent)),
      maxPositionPct: 5,
      leverageCap: 1,
      allowScaleIn: false,
    },
    evidence: {
      formalPublishedPlanOnly: true,
      researchOnlyExcluded: true,
      sourcePlanContentHash: input.plan.contentHash,
    },
  };
}
