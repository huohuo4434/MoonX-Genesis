import { evaluateLiveDuration } from "./live-duration-core";

export const CONTINUOUS_CONFIRMATION = "PREPARE_CONTINUOUS_KEEP_RISK";
export const CONTINUOUS_EVENT = "LIVE_CONTINUOUS_PREPARED_V1";
export function continuousPayloadShape(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array:${value.length}`;
  if (typeof value !== "object") return typeof value;
  const row = value as { list?: unknown; cursor?: unknown };
  return `object/list:${row.list === null ? "null" : Array.isArray(row.list) ? `array:${row.list.length}` : typeof row.list}/cursor:${row.cursor ? "present" : "empty"}`;
}
export function assertEmptyExchangePayloads(positions: unknown, orders: unknown, tpsl: unknown, trigger: unknown) {
  const list = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? value as { list?: unknown; cursor?: unknown } : null;
  const p = list(positions), o = list(orders);
  // Missing data never proves absence of exposure. Even unknown/zero-size rows block.
  if (!p || !o || !Array.isArray(p.list) || !Array.isArray(o.list)
    || !Array.isArray(tpsl) || !Array.isArray(trigger)) throw new Error("EXCHANGE_UNKNOWN");
  if (p.list.length || o.list.length || tpsl.length || trigger.length || p.cursor || o.cursor) throw new Error("EXCHANGE_NOT_EMPTY");
}
export type ContinuousTransitionRow = {
  status: string; duration_mode: string | null; started_at: Date | string | null;
  ends_at: Date | string | null; stop_reason: string; initial_equity_usdt: number | null;
  current_equity_usdt: number | null; peak_equity_usdt: number | null;
  max_drawdown_usdt: number | null; max_drawdown_pct: number | null;
};
export function assertContinuousTransition(input: {
  row: ContinuousTransitionRow; equity: number; openingEquity: number;
  dailyLossLimit: number; drawdownLimit: number; observedAt: number; now: Date;
}) {
  const { row, now } = input;
  const duration = evaluateLiveDuration({ status: row.status, durationMode: row.duration_mode, startedAt: row.started_at, endsAt: row.ends_at }, now);
  if (row.status !== "COMPLETED" || !duration.expired || duration.mode !== "FIXED"
    || !["30天实盘实验到期，已停止新开仓。", "定期实盘运行已到期，已停止新开仓。", "已配置的运行期限到期，已停止新开仓。"].includes(row.stop_reason)) throw new Error("NOT_EXPIRY_COMPLETED");
  const age = now.getTime() - input.observedAt;
  if (!Number.isFinite(age) || age < 0 || age > 30_000) throw new Error("SNAPSHOT_STALE");
  for (const value of [row.initial_equity_usdt, row.current_equity_usdt, row.peak_equity_usdt,
    input.equity, input.openingEquity, input.dailyLossLimit, input.drawdownLimit]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error("RISK_EVIDENCE_INVALID");
  }
  for (const value of [row.max_drawdown_usdt, row.max_drawdown_pct]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("RISK_EVIDENCE_INVALID");
  }
  if (input.equity - input.openingEquity <= -input.dailyLossLimit
    || Math.max(row.peak_equity_usdt!, input.equity) - input.equity >= input.drawdownLimit
    || row.max_drawdown_usdt! >= input.drawdownLimit) throw new Error("RISK_LIMIT_REACHED");
}
export function assertCurrentEntryEpoch(epoch: string | null, decisionCreatedAt: Date | string | null, now = new Date()) {
  if (epoch === null) return;
  const e = Date.parse(epoch), d = decisionCreatedAt ? new Date(decisionCreatedAt).getTime() : NaN;
  if (!Number.isFinite(e) || !Number.isFinite(d) || e > now.getTime() || d < e || d > now.getTime()) throw new Error("OLD_ENTRY_INTENT_BLOCKED");
}
