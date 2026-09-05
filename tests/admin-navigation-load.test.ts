import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("all shared admin navigation links disable speculative page reads", () => {
  const source = readFileSync("components/admin/AdminNav.tsx", "utf8");
  const item = source.slice(source.indexOf("function AdminLinkItem"), source.indexOf("export function AdminNav"));
  assert.match(item, /<Link\s+href=\{link.href\}\s+prefetch=\{false\}/);
  assert.equal((source.match(/<Link\b/g) ?? []).length, 1);
  assert.equal((source.match(/<AdminLinkItem\b/g) ?? []).length, 2, "both primary and expanded menus share the no-prefetch link");
});

test("live controls remain reachable and the executor is not mislabeled demo-only", () => {
  const source = readFileSync("components/admin/AdminNav.tsx", "utf8");
  assert.match(source, /href: "\/admin\/live-trading", label: "实盘开关与托管"/);
  assert.match(source, /href: "\/admin\/bitget-demo", label: "Bitget执行诊断"/);
  assert.doesNotMatch(source, /fetch\(|SET_MODE|RUN_AUDIT/);
});

test("live safety copy reads actual configuration rather than obsolete risk promises", () => {
  const page = readFileSync("app/admin/bitget-demo/page.tsx", "utf8");
  for (const key of ["liveInitialCapitalUsdt", "liveDurationDays", "leverage", "liveMaxConcurrentPositions", "liveMaxTradesPerDay", "liveMaxPositionNotionalUsdt", "liveDailyLossUsdt", "liveMaxDrawdownUsdt"]) {
    assert.ok(page.includes(`{environment.${key}}`), key);
  }
  const client = readFileSync("components/admin/BitgetDemoClient.tsx", "utf8");
  for (const key of ["leverage", "liveMaxConcurrentPositions", "liveMaxTradesPerDay"]) assert.ok(client.includes(`{dashboard.environment.${key}}`));
  for (const source of [page, client]) assert.doesNotMatch(source, /最多同时持有10个仓位|单日账户亏损达到100 USDT|回撤达到500 USDT|每日开单数量不设机械配额/);
  assert.match(page, /配置不代表实验已续期或可以开仓/);
});
