import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("member branch outlook preserves locked forecasts and keeps date windows conditional", () => {
  const data = read("lib/data/member-market-branches-20260813.ts");
  assert.match(data, /不覆盖任何已锁定预测/);
  assert.match(data, /不能用本更新事后改成命中/);
  assert.match(data, /日期是观察窗，不是无脑下单点/);
  assert.match(data, /Google本周原预测仍按原文独立验证/);
  assert.doesNotMatch(data, /19号就是最低点/);
});

test("branch outlook contains all five requested assets and explicit confirmation or invalidation", () => {
  const data = read("lib/data/member-market-branches-20260813.ts");
  for (const token of ["GOOGL", "SPX", "QQQ", "BTC", "ASTEROID", "315—325", "342—350", "3400万—3500万", "2000万"]) {
    assert.match(data, new RegExp(token));
  }
  assert.match(data, /假跌破收回/);
  assert.match(data, /低点抬高/);
  assert.match(data, /有效跌破315/);
});

test("branch content is obtained only after member access succeeds", () => {
  const route = read("app/member/weekly/page.tsx");
  const access = read("lib/data/weekly-analysis-access.ts");
  const data = read("lib/data/member-market-branches-20260813.ts");
  assert.match(data, /import "server-only"/);
  assert.match(route, /if \(payload\.mode === "locked"\)/);
  assert.match(route, /const branchOutlook = getMemberMarketBranchOutlook20260813\(\)/);
  assert.ok(route.indexOf('if (payload.mode === "locked")') < route.indexOf("getMemberMarketBranchOutlook20260813()"));
  assert.match(access, /getWeeklyForecastAccessDecision/);
});

test("member page renders a dedicated rolling branch section without exposing it in the locked page", () => {
  const page = read("components/member/MemberWeeklyPage.tsx");
  const component = read("components/member/MemberMarketBranchOutlook.tsx");
  assert.match(page, /MemberMarketBranchOutlookSection outlook=\{branchOutlook\}/);
  assert.match(component, /会员独享 · 滚动研究/);
  assert.match(component, /历史诚信边界/);
  const lockedStart = page.indexOf("export function MemberWeeklyLockedPage");
  const fullStart = page.indexOf("export function MemberWeeklyFullPage");
  assert.ok(lockedStart >= 0 && fullStart > lockedStart);
  assert.doesNotMatch(page.slice(lockedStart, fullStart), /branchOutlook/);
});
