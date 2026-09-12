import type { AiTradePlan } from "@/types/ai-trade-plan";

const ACTIVE = new Set(["PUBLISHED", "WATCHING", "ARMED", "ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED"]);
export type ConcisePlanState = "WAIT" | "CONDITIONAL" | "SUBMITTED" | "POSITION";

/** Presentation only. Never grants trading permission or manufactures missing levels. */
export function concisePlanState(plan: AiTradePlan, nowMs: number): ConcisePlanState {
  const started = (value: string | null) => Number.isFinite(Date.parse(value ?? "")) && Date.parse(value!) <= nowMs;
  const pending = (value: string | null) => Number.isFinite(Date.parse(value ?? "")) && Date.parse(value!) > nowMs;
  const values = [plan.entryZoneLow, plan.entryZoneHigh, plan.protectiveStop, plan.target1, plan.target2, plan.target3];
  const geometry = values.every((value) => Number.isFinite(value) && value > 0)
    && plan.entryZoneLow <= plan.entryZoneHigh
    && (plan.direction === "LONG"
      ? plan.protectiveStop < plan.entryZoneLow && plan.entryZoneHigh < plan.target1 && plan.target1 <= plan.target2 && plan.target2 <= plan.target3
      : plan.direction === "SHORT" && plan.target3 <= plan.target2 && plan.target2 <= plan.target1 && plan.target1 < plan.entryZoneLow && plan.entryZoneHigh < plan.protectiveStop);
  const valid = Number.isFinite(nowMs) && plan.tier === "FORMAL" && ACTIVE.has(plan.status)
    && Boolean(plan.forecastId && plan.forecastVersion && plan.forecastHorizon && plan.contentHash?.trim().length >= 8)
    && started(plan.publishedAt) && started(plan.forecastPublishedAt) && started(plan.forecastLockedAt)
    && started(plan.validFrom) && pending(plan.expiresAt)
    && started(plan.forecastValidFrom) && pending(plan.forecastValidUntil)
    && Boolean(plan.triggerRule?.trim()) && geometry;
  if (!valid) return "WAIT";
  if (["OPEN", "REDUCED", "PARTIALLY_FILLED"].includes(plan.status)) return "POSITION";
  if (plan.status === "ORDER_SUBMITTED") return "SUBMITTED";
  return "CONDITIONAL"; // ARMED is still not a fill, or an instruction to buy now.
}

export function latestConcisePlans(plans: readonly AiTradePlan[], mode: AiTradePlan["executionMode"]): AiTradePlan[] {
  const groups = new Map<string, AiTradePlan>();
  for (const plan of plans) {
    if (plan.executionMode !== mode) continue;
    const previous = groups.get(plan.planGroupId);
    if (!previous || plan.version > previous.version || (plan.version === previous.version && plan.updatedAt > previous.updatedAt)) groups.set(plan.planGroupId, plan);
  }
  // Select versions before filtering status: a cancellation must not resurrect an old entry.
  return [...groups.values()].filter((plan) => ACTIVE.has(plan.status))
    .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.strategyType.localeCompare(b.strategyType));
}

export function conciseSnapshotFresh(at: string | null, nowMs: number): boolean {
  const age = nowMs - Date.parse(at ?? "");
  return Number.isFinite(age) && age >= 0 && age <= 120_000;
}

export function concisePrice(value: number): string {
  return value.toLocaleString("en-US", { maximumSignificantDigits: 8 });
}
