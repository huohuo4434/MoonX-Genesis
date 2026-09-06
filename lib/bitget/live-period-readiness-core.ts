import { evaluateLiveDuration, type LiveDurationInput } from "./live-duration-core";

/** Read-only permission check; never extends dates or changes account state. */
export function livePeriodReadiness(input: LiveDurationInput | null | undefined, now = new Date()) {
  if (!input) return "UNAVAILABLE";
  if (!Number.isFinite(now.getTime())) return "INVALID";
  if (input.status === "STOPPED") return "STOPPED";
  const duration = evaluateLiveDuration(input, now);
  if (input.status === "COMPLETED" || duration.expired) return "EXPIRED";
  if (input.status === "NOT_STARTED") return "NOT_STARTED";
  if (input.status !== "ACTIVE" || !duration.valid) return "INVALID";
  return duration.due ? "READY" : "NOT_DUE";
}

/** Available balance is not equity. A real zero must reach loss/drawdown checks. */
export function requireCurrentLiveEquity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("LIVE_EQUITY_UNAVAILABLE");
  return value;
}

/** UTA /api/v3/account/assets: usdtEquity is account equity in USDT.
 * accountEquity is USD; assets[].equity is one coin, neither is interchangeable.
 * https://www.bitget.com/api-doc/uta/account/Get-Account */
export function readLiveUsdtEquity(account: { usdtEquity?: unknown }): number {
  const raw = account.usdtEquity;
  if (typeof raw === "number") return requireCurrentLiveEquity(raw);
  if (typeof raw !== "string" || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) throw new Error("LIVE_EQUITY_UNAVAILABLE");
  return requireCurrentLiveEquity(Number(raw));
}
