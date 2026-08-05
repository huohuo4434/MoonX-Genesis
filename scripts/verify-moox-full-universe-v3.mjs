import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [];
const expect = (condition, message) => checks.push({ ok: Boolean(condition), message });

const client = read("lib/bitget/demo-client.ts");
const runtime = read("lib/bitget/demo-runtime.ts");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const plans = read("lib/trading-signals/ai-trade-plans.ts");
const admin = read("app/admin/bitget-demo/page.tsx");
const member = read("components/member/AiTradingDeskClient.tsx");
const adminClient = read("components/admin/BitgetDemoClient.tsx");

expect(client.includes('MOOX_LIVE_MAX_TRADES_PER_DAY_V3", 10, 1, 10'), "daily new-trade limit is 10");
expect(client.includes('MOOX_LIVE_MAX_CONCURRENT_POSITIONS_V3", 10, 1, 10'), "concurrent-position limit is 10");
expect(client.includes('MOOX_LIVE_DAILY_LOSS_USDT_V3", 100'), "daily loss stop is 100 USDT");
expect(client.includes('MOOX_LIVE_MAX_DRAWDOWN_USDT_V3", 500'), "peak drawdown stop is 500 USDT");
expect(client.includes('marginMode: "isolated"'), "orders remain isolated margin");
expect(client.includes('Math.min(live ? 2 : 3'), "live leverage remains capped at 2x");
expect(client.includes("const groupCountLimit = environment.liveMaxConcurrentPositions"), "hidden per-group two-position cap removed");
expect(runtime.includes("const LIVE_STRATEGY_SYMBOLS_PER_RUN = 10"), "runtime scans ten symbols per live pass");
expect(strategy.includes("const LIVE_FULL_UNIVERSE_SYMBOLS"), "strategy has an authoritative ten-symbol universe");
expect((strategy.match(/symbols: \[\.\.\.LIVE_FULL_UNIVERSE_SYMBOLS\]/g) || []).length === 3, "all three horizons use the ten-symbol universe");
expect(strategy.includes("max_trades_per_day = 10"), "database profiles allow the global ten-trade policy");
expect(!strategy.includes("const commissioningPending"), "BTC/ETH commissioning no longer hard-blocks normal scans");
expect(strategy.includes("commissioningMessage = commissioning.message"), "commissioning result is audited while scans continue");
expect(strategy.includes('environment.mode !== "LIVE_EXPERIMENT" && dailyLossPct'), "old percentage daily stop no longer overrides live 100 USDT stop");
expect(plans.includes("CASE WHEN status IN ('OPEN','PARTIAL','ORDER_SUBMITTED','CLOSING') THEN 0 ELSE 1 END"), "latest-intent query no longer favors stale shadow records");
expect(admin.includes("每天最多新开10笔"), "admin page shows ten trades");
expect(admin.includes("最多同时持有10个仓位"), "admin page shows ten positions");
expect(admin.includes("100 USDT"), "admin page shows 100 USDT daily stop");
expect(admin.includes("500 USDT"), "admin page shows 500 USDT drawdown stop");
expect(member.includes("每天最多新开10笔"), "member page shows ten trades");
expect(adminClient.includes("不会强行凑单"), "admin console explicitly states no forced trading");

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "[OK]" : "[FAIL]"} ${item.message}`);
if (failed.length) {
  console.error(`Verification failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`Verification passed: ${checks.length} checks.`);
