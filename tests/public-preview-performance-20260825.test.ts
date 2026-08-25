import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

test("public feature preview stays a server component", () => {
  const source = read("components/access/PublicFeaturePreview.tsx");
  assert.doesNotMatch(source, /^"use client"/);
  assert.doesNotMatch(source, /useLocale|LocaleProvider/);
  assert.match(source, /locale: "zh" \| "en"/);
});

test("every public feature preview supplies an explicit locale", () => {
  for (const file of [
    "app/member/ai-trading/page.tsx",
    "app/member/alpha-feed/page.tsx",
    "app/member/btc-eth-cycle/page.tsx",
    "app/member/daily/page.tsx",
    "app/member/early-altcoin-radar/page.tsx",
    "app/member/monthly/page.tsx",
    "app/member/sector-resonance/page.tsx",
    "app/member/signals/page.tsx",
    "app/member/stock-picks/page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /<PublicFeaturePreview/);
    assert.match(source, /locale=/);
  }
});

test("admin loading state explains session recovery instead of showing an empty skeleton", () => {
  const source = read("app/admin/loading.tsx");
  assert.match(source, /正在验证登录状态并载入后台/);
  assert.match(source, /登录已过期/);
  assert.match(source, /\/login\?next=\/admin/);
  assert.match(source, /重新登录/);
});
