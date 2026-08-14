import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { MEMBER_RESEARCH_NAV, PUBLIC_MORE_NAV, PUBLIC_PRIMARY_NAV } from "../config/navigation";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("navigation has one clear destination per href and keeps specialist tools in the member group", () => {
  const all = [...PUBLIC_PRIMARY_NAV, ...MEMBER_RESEARCH_NAV, ...PUBLIC_MORE_NAV];
  assert.equal(new Set(all.map((item) => item.href)).size, all.length);
  assert.deepEqual(PUBLIC_MORE_NAV.map((item) => item.href), ["/member/monthly", "/guide", "/methodology", "/pricing", "/support"]);
  assert.deepEqual(MEMBER_RESEARCH_NAV.map((item) => item.labelZh), ["早期山寨币雷达", "AI交易信号", "缠论执行台", "创始人周期"]);
});

test("mobile menu defensively removes duplicate routes", () => {
  const navbar = read("components/layout/Navbar.tsx");
  assert.match(navbar, /mobileMemberNav = memberNav\.filter/);
  assert.match(navbar, /mobileMoreNav = moreNav\.filter/);
  assert.match(navbar, /会员工具/);
  assert.match(navbar, /帮助与账户/);
});

test("homepage shows the product before pricing and no longer publishes raw plan-ledger positions", () => {
  const page = read("app/page.tsx");
  const quick = read("components/home/HomeQuickStart.tsx");
  assert.ok(page.indexOf("<HomeTodaySection />") < page.indexOf("<HomeQuickStart />"));
  assert.ok(page.indexOf("<HomeQuickStart />") < page.indexOf("<HomeFeaturedAssets />"));
  assert.equal(page.includes("HomeTomorrowSection"), false);
  assert.equal(page.includes("HomeMembershipComparison"), false);
  assert.ok(page.includes("HomePricingEntry"));
  assert.doesNotMatch(quick, /getAiTradePlanDashboard|OPEN|PARTIALLY_FILLED|ORDER_SUBMITTED/);
  assert.match(quick, /不把计划账本冒充真实持仓/);
  assert.equal(existsSync(resolve(process.cwd(), "components/home/HomeValueOverview.tsx")), false);
});

test("primary navigation stays focused and moves monthly detail under more", () => {
  assert.deepEqual(PUBLIC_PRIMARY_NAV.map((item) => item.href), [
    "/#moonx-view",
    "/member/weekly",
    "/member/ai-trading",
    "/featured-stocks",
    "/verification",
  ]);
  assert.ok(PUBLIC_MORE_NAV.some((item) => item.href === "/member/monthly"));
});

test("account page separates the four essential member actions from optional specialist research", () => {
  const account = read("components/account/AccountPageClient.tsx");
  for (const href of ["/member/weekly", "/member/tomorrow", "/member/ai-trading", "/member/technical-methods"]) {
    assert.ok(account.includes(`href: "${href}"`), href);
  }
  assert.match(account, /会员最重要的四个入口/);
  assert.match(account, /更多专项研究（需要时再看）/);
  assert.match(account, /无数据就是等待/);
});
