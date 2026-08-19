import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage verification ranks across nine markets instead of BTC/ETH recency only", () => {
  const src = read("components/home/HomeLandingBoard.tsx");
  assert.match(src, /近30天加权命中/);
  assert.match(src, /rankScore/);
  assert.match(src, /CORE_MARKETS\.some/);
  assert.match(src, /selected\.some\(\(current\) => canonicalSymbol\(current\.item\.symbol\)/);
});

test("technical levels use Chan/multi-source fallback before declaring data unavailable", () => {
  const src = read("lib/market-data/technical-price-structure.ts");
  assert.match(src, /loadChanCandles/);
  assert.match(src, /loadTechnicalBars/);
  assert.match(src, /SPX500/);
  assert.match(src, /NAS100/);
  assert.match(src, /XAU/);
});

test("early altcoin radar has scan time, source price, X heat and experimental Qimen", () => {
  const core = read("lib/trading-signals/early-altcoin-radar.ts");
  const page = read("app/member/early-altcoin-radar/page.tsx");
  const qimen = read("lib/forecasts/qimen-first-policy.ts");
  assert.match(core, /sourceMentionPriceUsd/);
  assert.match(core, /xMentions7d/);
  assert.match(core, /pairCreatedAt/);
  assert.match(core, /evaluateExperimentalQimenAt/);
  assert.match(qimen, /MOOX_ALTCOIN_QIMEN_EXPERIMENT_V1/);
  assert.match(page, /博主价/);
  assert.match(page, /X热度/);
  assert.match(page, /扫 \{formatDateTimeChina\(item\.firstSeenAt\)\}/);
});

test("market structure page explains purpose and exposes real positioning fields", () => {
  const page = read("app/member/market-structure/page.tsx");
  const loader = read("lib/market-data/crypto-derivatives-dashboard.ts");
  assert.match(page, /交易结构与多空数据/);
  assert.match(page, /持仓量 OI/);
  assert.match(page, /多空比/);
  assert.match(loader, /current-fund-rate/);
  assert.match(loader, /open-interest/);
  assert.match(loader, /futures-long-short/);
});

test("crypto picks show daily research date, clear rating names and requested risk tiers", () => {
  const list = read("components/conviction/MemberRecommendationList.tsx");
  assert.match(list, /A\+ · 核心跟踪/);
  assert.match(list, /A− · 高波动观察/);
  assert.match(list, /slug === "btc" \|\| slug === "eth"/);
  assert.match(list, /slug === "asteroid"/);
  assert.match(list, /今日分析/);
});

test("AI member desk enhancement uses a route overlay and does not require overwriting the current page shell", () => {
  const onboarding = read("components/member/MemberTradingOnboarding.tsx");
  const layout = read("app/member/ai-trading/layout.tsx");
  const perf = read("lib/trading-signals/admin-public-performance.ts");
  assert.match(onboarding, /短线.*1—3天/s);
  assert.match(onboarding, /中线.*1—15天/s);
  assert.match(onboarding, /长线.*1—3个月/s);
  assert.match(onboarding, /超长线.*约1年/s);
  assert.match(layout, /MOOX_V72063_AI_ROUTE_OVERLAY/);
  assert.match(layout, /AdminPublicTradingPerformance/);
  assert.match(layout, /MOOX会员只读监控-一键部署\.zip/);
  assert.doesNotMatch(layout, /placeBitget|MarketOrder|AUTO_ORDER|Paper入场/);
  assert.match(perf, /getBitgetDemoClosedPositions\(100\)/);
  assert.match(perf, /recentNetProfitUsdt/);
});
