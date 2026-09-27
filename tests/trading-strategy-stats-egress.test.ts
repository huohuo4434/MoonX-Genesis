import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
const start = source.indexOf("async function buildStrategyStats(");
const end = source.indexOf("export async function runThreeHorizonStrategyEngine(", start);
assert.ok(start > 0 && end > start);
const functionSource = source.slice(start, end);
const now = new Date("2026-09-27T12:00:00Z");
const rows = [
  { strategy_type: "SWING", created_at: now, status: "CLOSED", realized_pnl_usdt: "12", risk_amount_usdt: "6", run_id: "r1", bitget_order_id: "order", rejection_code: null },
  { strategy_type: "SWING", created_at: now, status: "CLOSED", realized_pnl_usdt: "-6", risk_amount_usdt: "3", run_id: "r1", bitget_order_id: "order2", rejection_code: null },
  { strategy_type: "SWING", created_at: now, status: "SHADOW_READY", realized_pnl_usdt: null, risk_amount_usdt: null, run_id: "r2", bitget_order_id: null, rejection_code: null },
  { strategy_type: "SCALP", created_at: now, status: "ERROR", realized_pnl_usdt: null, risk_amount_usdt: null, run_id: "r3", bitget_order_id: null, rejection_code: "ORDER_ERROR" },
  { strategy_type: "SCALP", created_at: new Date("2026-09-20T00:00:00Z"), status: "CLOSED", realized_pnl_usdt: 0, risk_amount_usdt: 0, run_id: "old", bitget_order_id: null, rejection_code: null },
  { strategy_type: "SCALP", created_at: now, status: "BLOCKED", realized_pnl_usdt: null, risk_amount_usdt: null, run_id: "r4", bitget_order_id: null, rejection_code: "RISK_BLOCK" },
];

function harness(options: { legacy?: boolean; missing?: boolean; fail?: boolean } = {}) {
  const queries: string[] = [];
  const code = options.legacy ? functionSource.replace(/SELECT strategy_type,[\s\S]*?FROM trade_three_horizon_decisions/, "SELECT * FROM trade_three_horizon_decisions") : functionSource;
  const context: any = {
    Date, Set,
    prisma: options.missing ? null : { $queryRawUnsafe: async (sql: string) => {
      queries.push(sql);
      assert.match(sql.trim(), /^SELECT /);
      assert.match(sql, /ORDER BY created_at DESC\s+LIMIT 2000/);
      if (options.fail) throw Error("READ_FAILED");
      const fields = sql.match(/SELECT ([\s\S]*?)FROM/)![1].split(",").map(s => s.trim());
      return rows.map(row => fields[0] === "*" ? {...row, conditions: [{large: "unused"}], source_snapshot: "unused"} : Object.fromEntries(fields.map(key => [key, row[key as keyof typeof row]])));
    } },
    beijingStartOfDay: () => new Date("2026-09-26T16:00:00Z"),
    round: (value: number, places: number) => Number(value.toFixed(places)),
    average: (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length,
  };
  runInNewContext(ts.transpileModule(code + "\nglobalThis.readStats = buildStrategyStats;", {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, context);
  return { queries, read: context.readStats };
}
const profiles = [{strategyType: "SWING"}, {strategyType: "SCALP"}, {strategyType: "EMPTY"}];

test("thin statistics query preserves legacy results, window and read-only behavior", async () => {
  const current = harness();
  const legacy = harness({legacy: true});
  const actual = JSON.parse(JSON.stringify(await current.read(profiles, now)));
  assert.deepEqual(actual, JSON.parse(JSON.stringify(await legacy.read(profiles, now))));
  assert.equal(actual[0].netPnlUsdt, 6);
  assert.equal(actual[0].scansToday, 2);
  assert.equal(actual[0].wins, 1);
  assert.equal(actual[1].orderAttemptsToday, 1);
  assert.equal(actual[2].winRatePct, null);
  assert.equal(current.queries.length, 1);
  assert.doesNotMatch(current.queries[0], /SELECT\s+\*|source_snapshot|conditions|raw_payload/);
});

test("statistics retains empty-database and query-error behavior", async () => {
  assert.equal((await harness().read([], now)).length, 0);
  assert.equal((await harness({missing: true}).read(profiles, now)).length, 0);
  await assert.rejects(harness({fail: true}).read(profiles, now), /READ_FAILED/);
});
