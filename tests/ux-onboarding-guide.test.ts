import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

test("beginner guide and onboarding are wired into the site", () => {
  assert.match(read("app/guide/page.tsx"), /1分钟使用说明/);
  assert.match(read("config/navigation.ts"), /guide:\s*"\/guide"/);
  assert.match(read("app/layout.tsx"), /MemberWelcomeGuide/);
  assert.match(read("app/page.tsx"), /HomeQuickStart/);
});

test("forecast cards include plain-language guidance", () => {
  assert.match(read("components/home/TodayDailyForecastView.tsx"), /PlainLanguageSummary/);
  assert.match(read("components/member/MemberWeeklyPage.tsx"), /PlainLanguageSummary/);
  assert.match(read("components/member/MemberMonthlyPage.tsx"), /PlainLanguageSummary/);
});

test("verification page exposes pending locked records without early verdicts", () => {
  assert.match(read("app/verification/page.tsx"), /PendingVerificationSummary/);
  assert.match(read("lib/accuracy/get-pending-verification.ts"), /AWAITING_RESULT/);
});

test("guide and pricing links keep path typed as a required string", () => {
  const guide = read("app/guide/page.tsx");
  const pricing = read("components/payments/PricingPageContent.tsx");
  assert.doesNotMatch(guide, /\.map\(\(\[title, body, path\]\)/);
  assert.doesNotMatch(pricing, /\.map\(\(\[label, path\]\)/);
  assert.match(guide, /\.map\(\(\{ title, body, path \}\)/);
  assert.match(pricing, /\.map\(\(\{ label, path \}\)/);
});
