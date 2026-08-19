import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "components/home/HomeMobileAppView.tsx",
  "components/member/StrategyCenterPage.tsx",
  "components/member/StrategyDetailPage.tsx",
  "lib/presentation/strategy-center.ts",
  "app/member/strategy/page.tsx",
  "app/member/strategy/[strategyId]/page.tsx",
]) assert.ok(exists(rel), `missing ${rel}`);

const nav = read("config/member-channel-navigation.ts");
assert.match(nav, /strategyCenter:\s*"\/member\/strategy"/);
assert.match(nav, /labelZh:\s*"首页"[\s\S]*labelZh:\s*"研究"[\s\S]*labelZh:\s*"交易"[\s\S]*labelZh:\s*"策略"[\s\S]*labelZh:\s*"我的"/);

const bottom = read("components/layout/MobileBottomNav.tsx");
assert.match(bottom, /MOOX_V7207_APP_BOTTOM_NAV/);
assert.match(bottom, /item\.key === "memberNav\.channel"/);

const home = read("components/home/HomeLandingBoard.tsx");
assert.match(home, /HomeMobileAppView/);
assert.match(home, /getPublicUnifiedLiveSnapshot/);
assert.match(home, /className="hidden md:block"/);
assert.match(home, /resonanceCount/);
assert.match(home, /divergenceCount/);

const strategy = read("lib/presentation/strategy-center.ts");
assert.match(strategy, /SELECT strategy_type, enabled, mode, last_scan_at FROM trade_three_horizon_profiles/);
assert.match(strategy, /SELECT id, strategy_type, symbol, status, direction/);
assert.match(strategy, /return30dPct:\s*null/);
assert.match(strategy, /sharpeRatio:\s*null/);
assert.doesNotMatch(strategy, /\$executeRaw(?!Unsafe<T\[]>\(sql\))|CREATE TABLE|ALTER TABLE|UPDATE trade_|INSERT INTO|DELETE FROM|createMany|updateMany|deleteMany|prediction-auto-trader|runThreeHorizonStrategyEngine/);

const centerPage = read("app/member/strategy/page.tsx");
const detailPage = read("app/member/strategy/[strategyId]/page.tsx");
assert.match(centerPage, /getMemberDevicePageAccess/);
assert.match(detailPage, /getMemberDevicePageAccess/);
assert.doesNotMatch(centerPage + detailPage, /method:\s*"POST"|method:\s*'POST'/);

const detail = read("components/member/StrategyDetailPage.tsx");
assert.match(detail, /不使用累计盈亏伪装净值/);
assert.match(detail, /完整交易记录/);
assert.match(detail, /订单与策略动作/);
assert.match(detail, /当前运行/);

console.log("MOOX V7.20.7 APP VISUAL + STRATEGY CENTER STATIC REGRESSION PASSED");
