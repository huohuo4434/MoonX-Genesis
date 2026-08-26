import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("funnel facts come from the complete Beijing-day latest-per-symbol query", () => {
  const source = readFileSync(resolve("lib/live-status-readonly.ts"), "utf8");
  assert.match(source, /SELECT DISTINCT ON \(strategy_type, UPPER\(symbol\)\)/);
  assert.match(source, /updated_at >= \$\{day\.start\} AND updated_at < \$\{day\.end\}/);
  assert.match(source, /ORDER BY strategy_type, UPPER\(symbol\), updated_at DESC, created_at DESC/);
  assert.match(source, /client_oid, bitget_order_id/);
  assert.doesNotMatch(source, /timezone\('Asia\/Shanghai', updated_at\)::date/);
  const funnelQuery = source.indexOf("SELECT DISTINCT ON (strategy_type, UPPER(symbol))");
  const following = source.slice(funnelQuery, source.indexOf("`;", funnelQuery));
  assert.doesNotMatch(following, /LIMIT 120/);
});

test("funnel time range has exact Beijing-day UTC boundaries and a migration index", async () => {
  const { beijingDayUtcRange } = await import("../lib/trading-signals/trading-candidate-funnel-core");
  const range = beijingDayUtcRange(new Date("2026-08-27T15:59:59.000Z"));
  assert.equal(range.start.toISOString(), "2026-08-26T16:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-08-27T16:00:00.000Z");
  const migration = readFileSync(resolve("prisma/migrations/20260827023000_trading_funnel_updated_at_index/migration.sql"), "utf8");
  assert.match(migration, /trade_three_horizon_decisions_updated_at_funnel_idx/);
  assert.match(migration, /updated_at DESC/);
});
