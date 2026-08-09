import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function blockBetween(source, start, end) {
  const a = source.indexOf(start);
  assert.ok(a >= 0, `missing start marker: ${start}`);
  const b = source.indexOf(end, a + start.length);
  assert.ok(b > a, `missing end marker: ${end}`);
  return source.slice(a, b);
}

test("site doctrine is explicit: metaphysics sets direction and technicals only set levels", () => {
  const doctrine = read("lib/forecasts/moox-direction-doctrine.ts");
  assert.match(doctrine, /Metaphysical research determines the official direction/);
  assert.match(doctrine, /Technical analysis only helps with price levels/);
  assert.match(doctrine, /MOOX唯一方向：看涨/);
  assert.match(doctrine, /MOOX唯一方向：看跌/);
  assert.match(doctrine, /MOOX方向：不明确/);
  assert.match(doctrine, /先跌后涨/);
  assert.match(doctrine, /先涨后跌/);
});

test("member forecast surfaces lead with the one official direction", () => {
  for (const file of [
    "components/conviction/ConvictionDetailClient.tsx",
    "components/member/MemberWeeklyPage.tsx",
    "components/member/MemberMonthlyPage.tsx",
    "components/member/MemberTomorrowPage.tsx",
    "components/home/TodayDailyForecastView.tsx",
    "components/education/PlainLanguageSummary.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /MOOX.*唯一方向|MOOX OFFICIAL DIRECTION/, file);
  }
  const levels = read("components/forecasts/PriceLevelsBlock.tsx");
  assert.match(levels, /技术点位 · 只负责位置与风控/);
  assert.match(levels, /不会把官方看涨改成看跌/);
});

test("direction evidence excludes technical votes on the focus-stock detail page", () => {
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(detail, /directionViews = .*filter/);
  assert.match(detail, /技术\|价格\|支撑\|压力\|technical\|price\|support\|resistance/);
  assert.match(detail, /这里只展示参与方向判断的玄学证据；技术分析不进入方向投票/);
});

test("Google keeps V3 audit history and publishes V4 with one bullish metaphysical call", () => {
  const source = read("lib/data/conviction/google-forecasts.ts");
  assert.match(source, /GOOGL-W1-20260810-V3/);
  assert.match(source, /GOOGL-W1-20260810-V4/);
  assert.match(source, /GOOGL-M1-20260808-V3/);
  assert.match(source, /GOOGL-M1-20260808-V4/);
  const weeklyV4 = blockBetween(source, 'id: "GOOGL-W1-20260810-V4"', 'id: "GOOGL-W2-20260817-V2"');
  assert.match(weeklyV4, /direction: "上涨"/);
  assert.match(weeklyV4, /MOOX唯一方向：看涨/);
  assert.match(weeklyV4, /周卦看涨 \+ 月卦看涨/);
  assert.match(weeklyV4, /技术分析只负责找位置/);
  assert.doesNotMatch(weeklyV4, /跌破.*看涨.*失效|回踩做多优先/);
  assert.doesNotMatch(weeklyV4, /external-tech.*weight: 10/);
});

test("Google unclear week is stated as unclear instead of being forced by technicals", () => {
  const source = read("lib/data/conviction/google-forecasts.ts");
  const w4 = blockBetween(source, 'id: "GOOGL-W4-20260831-V2"', 'id: "GOOGL-M1-20260808-V4"');
  assert.match(w4, /direction: "震荡"/);
  assert.match(w4, /方向不明确/);
  assert.match(w4, /技术分析也不能替玄学补出一个方向/);
});

test("watchlist ranking uses multi-horizon metaphysical resonance and treats bearish calls equally", () => {
  const source = read("lib/data/conviction/resonance-ranking.ts");
  assert.match(source, /HORIZON_WEIGHT/);
  assert.match(source, /weekVote/);
  assert.match(source, /monthVote/);
  assert.match(source, /week and month disagree/);
  assert.match(source, /direction: "UNCLEAR"/);
  assert.match(source, /upWeight > downWeight/);
  assert.match(source, /downWeight > upWeight/);
  assert.doesNotMatch(source, /BULLISH.*\+\s*\d{3,}/);
  assert.match(source, /signals\.sort\(\(a, b\) => b\.score - a\.score/);
});

test("public watchlist gets ranked order but not member direction payload", () => {
  const access = read("lib/data/conviction/access.ts");
  assert.match(access, /rankOrder: resonanceSignals\.map/);
  assert.match(access, /resonanceSignals: fullAccess \? resonanceSignals : null/);
  const list = read("components/conviction/ConvictionListClient.tsx");
  assert.match(list, /rankIndex/);
  assert.match(list, /共振强弱实时排列/);
  const card = read("components/conviction/ResearchSpotlightCard.tsx");
  assert.match(card, /mode === "fullAccess" && signal/);
  assert.match(card, /本周 MOOX 唯一方向/);
});

test("public focus-card copy does not leak protected technical levels", () => {
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  for (const forbidden of ["348–355.5", "378.37–382.4", "500–510", "65,391", "66,000", "63,000", "84,000", "1,860", "138.62"]) {
    assert.equal(teaser.includes(forbidden), false, `public teaser leaked ${forbidden}`);
  }
  assert.match(teaser, /本周唯一方向/);
  assert.match(teaser, /多周期共振/);
});

test("SPCX member page leads with four-horizon bullish resonance and demotes technicals", () => {
  const page = read("components/conviction/SpcxResearchPage.tsx");
  assert.match(page, /4周期看涨共振/);
  assert.match(page, /↑ 看涨｜唯一方向/);
  assert.match(page, /技术点位参考｜不决定方向/);
  assert.match(page, /实时技术点位｜只负责位置与风控/);
});

test("methodology exposes only three official calls", () => {
  const source = read("components/methodology/MethodologyPageClient.tsx");
  assert.match(source, /↑ 看涨/);
  assert.match(source, /↓ 看跌/);
  assert.match(source, /↔ 方向不明确/);
  assert.match(source, /先涨后跌、先跌后涨、冲高回落等词只描述运行路径/);
});
