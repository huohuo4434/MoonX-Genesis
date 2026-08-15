import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Tencent keeps the original locked monthly V1 and adds the Aug 9 dossier", () => {
  const oldSource = read("lib/data/conviction/vibe-focus-forecasts.ts");
  const source = read("lib/data/conviction/tencent-forecasts.ts");
  assert.match(oldSource, /TENCENT-M1-20260803-V1/);
  for (const id of [
    "TENCENT-W1-20260810-V2",
    "TENCENT-W2-20260817-V2",
    "TENCENT-W3-20260824-V2",
    "TENCENT-CALENDAR-20260809-V2",
  ]) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /VIBE_FOCUS_PERIOD_FORECASTS/);
  assert.match(source, /火雷噬嗑/);
  assert.match(source, /巽为风（六冲）/);
  assert.match(source, /山风蛊（归魂）/);
  assert.match(source, /地天泰（六合）/);
  assert.match(source, /火泽睽/);
  assert.match(source, /天地否（六合）/);
  for (const time of ["07:00", "07:01", "07:02", "07:03"]) assert.match(source, new RegExp(time));
});

test("Tencent member roadmap contains September through December while public teaser stays non-directional", () => {
  const source = read("lib/data/conviction/tencent-forecasts.ts");
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  for (const month of ["2026-09", "2026-10", "2026-11", "2026-12"]) {
    assert.match(source, new RegExp(month));
  }
  for (const secret of ["8/17–23风险周", "10月六冲", "11月再分歧", "12月泰六合", "震荡下跌", "冲高回落"]) {
    assert.equal(teaser.includes(secret), false, `Tencent public teaser leaked ${secret}`);
  }
});

test("BTC becomes a spotlight dossier without exposing external technical levels publicly", () => {
  const seed = read("lib/data/conviction/seed.ts");
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  const access = read("lib/data/conviction/access.ts");
  const registry = read("lib/data/conviction/focus-static-forecast-registry.ts");
  assert.match(seed, /id: "bitcoin"/);
  assert.match(seed, /slug: "btc"/);
  assert.match(access, /listStaticFocusForecasts\(assetId\)/);
  assert.match(registry, /case "btc": return listBtcPeriodForecasts20260801\(\)/);
  for (const secret of ["65391", "65,391", "66000", "66,000", "63000", "63,000", "84000", "84,000"]) {
    assert.equal(seed.includes(secret), false, `BTC public seed leaked ${secret}`);
    assert.equal(teaser.includes(secret), false, `BTC public teaser leaked ${secret}`);
  }
});

test("BTC Aug 8 technical cross-check refines timing but does not rewrite the locked weekly direction", () => {
  const source = read("lib/data/conviction/btc-forecasts-20260801.ts");
  assert.match(source, /id: "BTC-W2-20260810-V2"[\s\S]*?direction: "震荡上涨"/);
  assert.match(source, /8\/8外部技术交叉验证（不改锁定方向）/);
  assert.match(source, /58,000–66,000/);
  assert.match(source, /65,391/);
  assert.match(source, /63,000/);
  assert.match(source, /84,000/);
  assert.match(source, /先回踩\/确认 → 再判断突破延续/);
});


test("ETH Aug 8 technical cross-check is member-side and preserves the locked Aug 10–16 view", () => {
  const source = read("lib/data/conviction/eth-forecasts.ts");
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  assert.match(source, /ETH-W2-20260810-V1[\s\S]*?direction: "震荡上涨"/);
  assert.match(source, /8\/8外部技术交叉验证（不改锁定方向）/);
  assert.match(source, /1,860/);
  assert.match(source, /调整之后上涨/);
  assert.match(source, /ETH_VISIBLE_PERIOD_ORDER[\s\S]*?"WEEK_2"/);
  assert.equal(teaser.includes("1,860"), false, "ETH public teaser leaked the external technical level");
});

test("SPCX external wave levels stay in member research only", () => {
  const member = read("lib/data/spcx-member-20260808.ts");
  const pub = read("lib/data/spcx-public-20260808.ts");
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  for (const level of ["101.74", "109.59", "130.64", "138.62"]) {
    assert.match(member, new RegExp(level.replace(".", "\\.")));
    assert.equal(pub.includes(level), false, `SPCX public payload leaked ${level}`);
    assert.equal(teaser.includes(level), false, `SPCX public teaser leaked ${level}`);
  }
  assert.match(member, /外部波浪技术观点/);
  assert.match(member, /作为独立技术票/);
});

test("SPCX page renders external technical cross-validation from member response", () => {
  const page = read("components/conviction/SpcxResearchPage.tsx");
  assert.match(page, /externalTechnicalView/);
  assert.match(page, /技术点位参考｜不决定方向/);
});

test("calendar month path is supported by the shared period model and rendered only from full forecast payload", () => {
  const model = read("lib/data/conviction/asteroid-forecasts.ts");
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(model, /calendarMonthPath\?/);
  assert.match(model, /sourceNote\?/);
  assert.match(detail, /逐月路线/);
  assert.match(detail, /来源：\{item\.sourceNote\}/);
  assert.match(detail, /f\.calendarMonthPath/);
});
