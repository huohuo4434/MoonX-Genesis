import { isFormallyLockedForecast } from "@/lib/trading-signals/formal-forecast-lock-core";
import type { ChanDirection } from "@/types/chan-execution";

type FormalLeg = {
  status: unknown;
  publishedAt: string | null;
  lockedAt: string | null;
  periodStart: string;
  periodEnd: string;
};

export type ChanDirectionPlan = {
  symbol: string;
  weeklyForecast: FormalLeg | null;
  monthlyForecast: FormalLeg | null;
  weeklyDirection: "LONG" | "SHORT" | "NEUTRAL";
  monthlyDirection: "LONG" | "SHORT" | "NEUTRAL";
};

export type ChanFormalDirectionResult = {
  direction: ChanDirection;
  sourceHorizon: "WEEK" | "MONTH" | null;
  reason: string;
};

function chanDirection(value: ChanDirectionPlan["weeklyDirection"]): ChanDirection {
  if (value === "LONG") return "BULL";
  if (value === "SHORT") return "BEAR";
  return "NEUTRAL";
}

function beijingDateKey(nowMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function formal(leg: FormalLeg | null, nowMs: number, maximumInclusiveDays: number): boolean {
  const today = beijingDateKey(nowMs);
  if (!leg || !validDateKey(leg.periodStart) || !validDateKey(leg.periodEnd)) return false;
  if (leg.periodStart > leg.periodEnd) return false;
  const startMs = Date.parse(`${leg.periodStart}T00:00:00.000Z`);
  const endMs = Date.parse(`${leg.periodEnd}T00:00:00.000Z`);
  const inclusiveDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  if (inclusiveDays < 1 || inclusiveDays > maximumInclusiveDays) return false;
  return Boolean(isFormallyLockedForecast({
    status: leg.status,
    publishedAt: leg.publishedAt,
    lockedAt: leg.lockedAt,
    nowMs,
  }) && leg.periodStart <= today && today <= leg.periodEnd);
}

export function resolveChanFormalDirection(input: {
  plan: ChanDirectionPlan | null;
  capturedNowMs: number;
}): ChanFormalDirectionResult {
  if (!input.plan) return { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_PLAN_UNAVAILABLE" };
  const weeklyFormal = formal(input.plan.weeklyForecast, input.capturedNowMs, 14);
  const monthlyFormal = formal(input.plan.monthlyForecast, input.capturedNowMs, 62);
  const weekly = weeklyFormal ? chanDirection(input.plan.weeklyDirection) : "NEUTRAL";
  const monthly = monthlyFormal ? chanDirection(input.plan.monthlyDirection) : "NEUTRAL";

  if (weeklyFormal && weekly === "NEUTRAL") {
    return { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_WEEKLY_DIRECTION_UNCLEAR" };
  }
  if (weekly !== "NEUTRAL" && monthly !== "NEUTRAL" && weekly !== monthly) {
    return { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_WEEK_MONTH_CONFLICT" };
  }
  if (weekly !== "NEUTRAL") return { direction: weekly, sourceHorizon: "WEEK", reason: "FORMAL_WEEKLY" };
  if (monthly !== "NEUTRAL") return { direction: monthly, sourceHorizon: "MONTH", reason: "FORMAL_MONTHLY_FALLBACK" };
  return { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_DIRECTION_UNAVAILABLE" };
}

export async function readChanFormalDirectionWithDependencies<TSettings>(input: {
  symbol: "BTCUSDT" | "ETHUSDT";
  capturedNowMs: number;
}, dependencies: {
  readSettings: (options: { readOnly: true }) => Promise<TSettings>;
  resolvePlans: (settings: TSettings, now: Date, requestedSymbols: readonly string[]) => Promise<ChanDirectionPlan[]>;
}): Promise<ChanFormalDirectionResult> {
  try {
    const settings = await dependencies.readSettings({ readOnly: true });
    const requestedSymbol = input.symbol === "ETHUSDT" ? "ETH" : "BTC";
    const plans = await dependencies.resolvePlans(settings, new Date(input.capturedNowMs), [requestedSymbol]);
    const exact = plans.filter((plan) => plan.symbol.toUpperCase() === requestedSymbol);
    if (exact.length !== 1) return { direction: "NEUTRAL", sourceHorizon: null, reason: "SCOPED_FORMAL_PLAN_AMBIGUOUS" };
    return resolveChanFormalDirection({ plan: exact[0]!, capturedNowMs: input.capturedNowMs });
  } catch {
    return { direction: "NEUTRAL", sourceHorizon: null, reason: "FORMAL_DIRECTION_READ_FAILED" };
  }
}
