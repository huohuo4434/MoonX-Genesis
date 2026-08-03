import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const service = () => read("lib/trading-signals/strategy-validation.ts");

test("phase3 migration is additive and permanently locks real-money trading", () => {
  const migration = read("prisma/migrations/20260804030000_strategy_validation_phase3/migration.sql");
  for (const table of [
    "trade_strategy_validation_state",
    "trade_strategy_equity_snapshots",
    "trade_strategy_reconciliation_events",
    "trade_strategy_trade_metrics",
    "trade_strategy_daily_reports",
    "trade_strategy_experiments",
    "trade_strategy_experiment_trials",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /real_trading_locked BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(migration, /CHECK \(real_trading_locked = TRUE\)/);
  assert.match(migration, /ON CONFLICT \(id\) DO UPDATE SET real_trading_locked = TRUE/);
  assert.match(migration, /pg_constraint/);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});

test("Bitget closed-position parser keeps official net pnl fee and funding fields", () => {
  const client = read("lib/bitget/demo-client.ts");
  for (const token of [
    "cumRealisedPnl",
    "netProfit",
    "totalFunding",
    "openFeeTotal",
    "closeFeeTotal",
    "cashDividend",
  ]) {
    assert.match(client, new RegExp(token));
  }
  assert.match(client, /\/api\/v3\/position\/history-position/);
  assert.match(client, /paptrading:\s*"1"/);
});

test("server runtime executes phase3 after account reconciliation and exposes its report", () => {
  const runtime = read("lib/bitget/demo-runtime.ts");
  const runtimeTypes = read("types/bitget-demo-runtime.ts");
  assert.match(runtime, /runStrategyValidationCycle/);
  assert.match(runtime, /action: "PHASE3_VALIDATION"/);
  assert.match(runtime, /closedMetricsUpserted/);
  assert.match(runtime, /getStrategyValidationDashboard/);
  assert.match(runtimeTypes, /validation: Record<string, unknown> \| null/);
});

test("reconciliation checks missing positions protection orders orphan positions and duplicate clientOid", () => {
  const source = service();
  assert.match(source, /LOCAL_OPEN_WITHOUT_EXCHANGE_POSITION/);
  assert.match(source, /POSITION_WITHOUT_PROTECTION/);
  assert.match(source, /EXCHANGE_POSITION_WITHOUT_THREE_HORIZON_DECISION/);
  assert.match(source, /DUPLICATE_CLIENT_OID/);
  assert.match(source, /protectionMatchesDecision/);
  assert.match(source, /resolved = TRUE, resolved_at = \$2/);
});

test("equity snapshots measure 30-day heartbeat availability and account drawdown", () => {
  const source = service();
  assert.match(source, /SNAPSHOT_INTERVAL_MS = 5 \* 60_000/);
  assert.match(source, /INTERVAL '30 days'/);
  assert.match(source, /REQUIRED_STABLE_DAYS = 30/);
  assert.match(source, /REQUIRED_HEARTBEAT_PCT = 99/);
  assert.match(source, /maxAccountDrawdownPct/);
});

test("closed trade metrics include net profit fees funding slippage and R multiple", () => {
  const source = service();
  for (const token of [
    "gross_pnl_usdt",
    "open_fee_usdt",
    "close_fee_usdt",
    "funding_usdt",
    "cash_dividend_usdt",
    "net_pnl_usdt",
    "entry_slippage_bps",
    "r_multiple",
  ]) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /match\.netProfit/);
  assert.match(source, /match\.cumRealisedPnl/);
});

test("validation gate requires adequate samples positive expectancy profit factor and controlled drawdown", () => {
  const source = service();
  assert.match(source, /MIN_CLOSED_TRADES = 30/);
  assert.match(source, /metric\.sampleReady/);
  assert.match(source, /metric\.expectancyR[^\n]*> 0/);
  assert.match(source, /metric\.profitFactor[^\n]*>= 1\.1/);
  assert.match(source, /MAX_ACCEPTABLE_DRAWDOWN_PCT/);
  assert.match(source, /DEMO_VALIDATED/);
});

test("A/B experiments stay shadow-only and cannot submit exchange orders", () => {
  const source = service();
  const migration = read("prisma/migrations/20260804030000_strategy_validation_phase3/migration.sql");
  assert.match(source, /confidence_delta/);
  assert.match(source, /experimentTrialsOpened/);
  assert.match(source, /experimentTrialsClosed/);
  assert.match(source, /allMandatoryMet\(decision\)/);
  assert.match(migration, /baseline/);
  assert.match(migration, /strict/);
  assert.match(migration, /flex/);
  assert.doesNotMatch(source, /placeBitgetDemoOrder|submitBitget|createBitgetDemoOrder/);
});

test("admin API is authenticated validated and exposes refresh plus experiment toggles", () => {
  const route = read("app/api/admin/bitget-demo/validation/route.ts");
  assert.match(route, /requireAdmin/);
  assert.match(route, /z\.discriminatedUnion\("action"/);
  assert.match(route, /z\.literal\("refresh"\)/);
  assert.match(route, /z\.literal\("setExperiment"\)/);
  assert.match(route, /setStrategyExperimentEnabled/);
});

test("admin page exposes gate metrics experiments and reconciliation events", () => {
  const page = read("app/admin/bitget-demo/page.tsx");
  const client = read("components/admin/StrategyValidationClient.tsx");
  assert.match(page, /StrategyValidationClient/);
  assert.match(client, /Phase 3 模拟验收中心/);
  assert.match(client, /真钱永久锁定/);
  assert.match(client, /A\/B影子实验/);
  assert.match(client, /最近对账异常/);
  assert.match(client, /三套策略净绩效/);
});

test("phase3 project test is registered and no live-money credential path is introduced", () => {
  const packageJson = JSON.parse(read("package.json")) as { scripts: { test: string } };
  assert.match(packageJson.scripts.test, /tests\/strategy-validation-phase3\.test\.ts/);
  const source = [
    service(),
    read("app/api/admin/bitget-demo/validation/route.ts"),
    read("components/admin/StrategyValidationClient.tsx"),
    read("types/strategy-validation.ts"),
  ].join("\n");
  assert.doesNotMatch(source, /BITGET_(?!DEMO_)(?:API_KEY|SECRET_KEY|PASSPHRASE)/);
  assert.doesNotMatch(source, /unlockRealTrading|enableLiveTrading|LIVE_ORDER/);
  assert.doesNotMatch(source, /Record<string,\s*any>|:\s*any\b|as\s+any\b/);
});
