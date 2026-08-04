import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function has(rel, ...patterns) {
  const text = read(rel);
  return patterns.every((pattern) => pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern));
}

const client = read("lib/bitget/demo-client.ts");
const runtime = read("lib/bitget/demo-runtime.ts");
const strategy = read("lib/trading-signals/three-horizon-strategy.ts");
const member = read("components/member/AiTradingDeskClient.tsx");
const admin = read("components/admin/BitgetDemoClient.tsx");
const desk = read("lib/trading-signals/member-ai-trading-desk.ts");
const assetCatalog = read("lib/presentation/asset-catalog.ts");
const requiredSymbols = ["BTCUSDT", "ETHUSDT", "HYPEUSDT", "MUUSDT", "QQQUSDT", "XAUTUSDT", "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT"];

check("ten requested futures symbols configured", requiredSymbols.every((symbol) => client.includes(`"${symbol}"`) && strategy.includes(symbol) && member.includes(symbol)));
check("USDT futures only", client.includes('const PRODUCT_TYPE = "USDT-FUTURES"') && !client.includes('BITGET_LIVE_ALLOWED_PRODUCT_TYPES'));
check("live leverage capped at two", client.includes("Math.min(live ? 2 : 3") && client.includes('process.env.BITGET_LIVE_LEVERAGE ?? 2'));
check("isolated margin enforced", client.includes('marginMode: "isolated"'));
check("runtime instrument validation for every symbol", client.includes("unavailableSymbols") && client.includes("account.symbols.some") && client.includes("/api/v3/market/instruments"));
check("API-restricted or offline instruments rejected", client.includes('available: status === "online"'));
check("30-day and 1000-USDT defaults", has("lib/bitget/demo-client.ts", 'numericEnv("BITGET_LIVE_INITIAL_CAPITAL_USDT", 1000', 'numericEnv("BITGET_LIVE_DURATION_DAYS", 30'));
check("100-USDT max drawdown stop", client.includes('numericEnv("BITGET_LIVE_MAX_DRAWDOWN_USDT", 100'));
check("20-USDT daily entry stop", client.includes('numericEnv("BITGET_LIVE_DAILY_LOSS_USDT", 20') && client.includes("今天停止新开仓"));
check("three positions and three entries per day", client.includes('numericEnv("BITGET_LIVE_MAX_CONCURRENT_POSITIONS", 3') && client.includes('numericEnv("BITGET_LIVE_MAX_TRADES_PER_DAY", 3'));
check("single position and gross exposure caps", client.includes("equity * 0.3") && client.includes("liveMaxGrossNotionalPct"));
check("asset-group exposure caps", client.includes('"CRYPTO" | "EQUITY" | "COMMODITY"') && client.includes("groupPctLimit") && client.includes("45") && client.includes("50") && client.includes("40"));
check("weekly strategy loss stop", strategy.includes('THREE_HORIZON_WEEKLY_LOSS_LIMIT_PCT", 4') && strategy.includes("weeklyLossPct >= WEEKLY_LOSS_LIMIT_PCT"));
check("0.5-percent risk per trade", strategy.includes("risk_per_trade_pct = CASE WHEN strategy_type='SWING' THEN 0.5") && member.includes("单笔计划风险0.5%"));
check("higher live confidence gates", strategy.includes("planning_min_confidence = CASE WHEN strategy_type='SWING' THEN 58") && strategy.includes("min_confidence = CASE WHEN strategy_type='SWING' THEN 68"));
check("partial profit at one R", strategy.includes("target1R: 1") && strategy.includes("position.total * 0.5"));
check("remaining target at 2.2R", strategy.includes("target2R: 2.2"));
check("breakeven stop after partial profit", strategy.includes("breakeven-protection") && strategy.includes("剩余仓位止损移动至保本"));
check("daily equity snapshot table", client.includes("trade_bitget_live_daily_snapshots") && client.includes("opening_equity_usdt") && client.includes("pnl_pct"));
check("no pre-start daily history pollution", client.includes("const dailySnapshot = row.started_at") && client.includes("history: [] as LiveDailySnapshot[]"));
check("daily PnL and percentage pinned at top", member.includes("Today PnL") && member.includes("今日盈亏") && member.includes("dailyPnlPct") && member.indexOf("Today PnL") < member.indexOf("Simple rules"));
check("cumulative PnL and drawdown percentages displayed", member.includes("pnlPct") && member.includes("maxDrawdownPct") && admin.includes("dailyPnlPct") && admin.includes("maxDrawdownPct"));
check("daily history shown", member.includes("dailyHistory") && member.includes("Daily live performance") && member.includes("每日实盘成绩"));
check("position and closed-trade return percentages", member.includes("profitRatePct") && member.includes("returnPct"));
check("all ten instruments shown in admin test", admin.includes("liveAllowedSymbols.map") && admin.includes("LIVE_ASSET_LABELS"));
check("public scan allows all ten current decisions", desk.includes("slice(0, 20)") || strategy.includes("slice(0, 20)"));
check("asset catalog aliases added without renaming core assets", ["SPYUSDT", "QQQUSDT", "XAUTUSDT", "XAGUSDT", "CLUSDT", "MUUSDT", "GOOGLUSDT"].every((symbol) => assetCatalog.includes(symbol)));
check("three-minute quote freshness gate remains", runtime.includes("QUOTE_HEALTH_SECONDS = 180"));
check("old demo execution disabled in live", runtime.includes('environment.mode !== "LIVE_EXPERIMENT"') && runtime.includes("实盘实验已禁用旧版镜像链路"));
check("close before protection cleanup remains", runtime.indexOf("先平仓，确认下一轮已无持仓后再撤保护单") >= 0 && runtime.indexOf("for (const position of positions)") < runtime.indexOf("for (const order of pending)"));
check("no embedded live credentials", !/BITGET_LIVE_(API_KEY|SECRET_KEY|PASSPHRASE)\s*=\s*["'][^"']+["']/.test([client, runtime, strategy, member, admin].join("\n")));

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nBitget multi-asset live audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
