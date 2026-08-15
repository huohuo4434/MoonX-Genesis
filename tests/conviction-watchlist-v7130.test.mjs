import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public watchlist uses one unified spotlight renderer", () => {
  const source = read("components/conviction/ConvictionListClient.tsx");
  assert.match(source, /ResearchSpotlightCard/);
  assert.doesNotMatch(source, /SpcxWatchlistFeature|AsteroidWatchlistFeature|GoogleWatchlistFeature|SndkWatchlistFeature/);
  assert.doesNotMatch(source, /PublicAssetCard/);
});

test("public teaser layer contains no protected numeric technical levels", () => {
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  for (const forbidden of ["500–510", "348–355.5", "378.37–382.4", "4000万–5000万", "7000万", "8000万FOMO", "$133.11", "135美元"]) {
    assert.equal(teaser.includes(forbidden), false, `public teaser leaked ${forbidden}`);
  }
});

test("seeded public cards no longer expose forecast answers", () => {
  const seed = read("lib/data/conviction/seed.ts");
  for (const forbidden of [
    "8月24—25日是第三次上冲",
    "未来一个月六爻判断为先跌后涨",
    "未来一个月中段偏强",
    "未来一个月更接近先跌后稳",
    "未来一个月六爻明显偏弱",
    "短期存在阶段性上行窗口",
    "The one-month Liu Yao path is down-then-up",
    "The one-month path is stronger mid-period",
  ]) {
    assert.equal(seed.includes(forbidden), false, `public seed leaked: ${forbidden}`);
  }
});

test("SPCX public page no longer exposes next-stage pivots or path", () => {
  const pub = read("lib/data/spcx-public-20260808.ts");
  assert.doesNotMatch(pub, /133\.11|observedClose|ipoPrice|recentLowApprox|REVISED_AFTER_UNLOCK_BREAKOUT|135美元附近|109—110|确认／回踩 → 再上|second push/);
  assert.match(pub, /下一阶段方向、关键枢轴、回踩条件和第二段路径只在会员版展示/);
});

test("active public client chain does not statically import Google protected daily dataset", () => {
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  const list = read("components/conviction/ConvictionListClient.tsx");
  assert.doesNotMatch(detail, /GoogleDailyResearch|google-focus-research-20260808/);
  assert.doesNotMatch(list, /GoogleWatchlistFeature|SndkWatchlistFeature|google-focus-research-20260808/);
});

test("SPCX public client contains no hard-coded member fallback levels", () => {
  const page = read("components/conviction/SpcxResearchPage.tsx");
  assert.doesNotMatch(page, /\$135 IPO pivot|109–110|135美元IPO枢轴|109—110美元/);
  assert.match(page, /具体技术锚点不再内置到公共客户端/);
});

test("MSFT V2 expands to sequential weeks and keeps external technical box member-side", () => {
  const source = read("lib/data/conviction/msft-forecasts.ts");
  for (const id of ["MSFT-W1-20260810-V2", "MSFT-W2-20260817-V1", "MSFT-W3-20260824-V1", "MSFT-M1-20260808-V2", "MSFT-M3-20260808-V1"]) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /500–510/);
  assert.match(source, /外部技术视频·8\/8/);
  assert.match(source, /旧版只覆盖一个月/);
});

test("Changxin preserves old versions and adds post-IPO V3 sequence", () => {
  const source = read("lib/data/conviction/longxin-forecasts.ts");
  for (const id of [
    "CXMT-WEEK-20260728-V2",
    "CXMT-M1-20260728-V2",
    "CXMT-W1-20260810-V3",
    "CXMT-W2-20260817-V1",
    "CXMT-W3-20260824-V1",
    "CXMT-M1-20260808-V3",
    "CXMT-M3-20260808-V2",
    "CXMT-Y1-20260808-V2",
    "CXMT-Y10-20260808-V2",
  ]) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /latest = new Map<ConvictionForecastType, ConvictionPeriodForecast>/);
});

test("Google keeps V2 audit records and adds V3 technical overlay", () => {
  const source = read("lib/data/conviction/google-forecasts.ts");
  for (const id of ["GOOGL-W1-20260810-V2", "GOOGL-W1-20260810-V3", "GOOGL-M1-20260808-V2", "GOOGL-M1-20260808-V3"]) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /348–355\.5/);
  assert.match(source, /378\.37–382\.4/);
  assert.match(source, /V2保持锁定|V2 保持锁定|V2保持/);
});

test("MSFT access is routed to dedicated multi-horizon data", () => {
  const source = read("lib/data/conviction/access.ts");
  const registry = read("lib/data/conviction/focus-static-forecast-registry.ts");
  assert.match(source, /listStaticFocusForecasts\(assetId\)/);
  assert.match(registry, /case "msft": return listMsftPeriodForecasts\(\)/);
  assert.match(source, /if \(assetId === "msft"\) return MSFT_PERIOD_ORDER/);
  assert.match(source, /if \(assetId === "msft"\) return MSFT_VISIBLE_PERIOD_ORDER/);
});

test("public detail lock copy promises no DOM-blurred secret text", () => {
  const source = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(source, /不会以模糊文字藏在网页DOM里/);
  assert.match(source, /服务器鉴权后才返回给会员/);
});
