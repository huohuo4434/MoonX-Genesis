import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { requiresPersistentManageOnly } from "../lib/trading-signals/unified-live-freeze-policy-core";
import type { UnifiedLiveCustodyIssue } from "../types/unified-live-trading";

const issue = (code: UnifiedLiveCustodyIssue["code"], severity: UnifiedLiveCustodyIssue["severity"] = "BLOCKER") => ({
  code,
  severity,
  detail: code,
}) satisfies UnifiedLiveCustodyIssue;

test("transient exchange snapshot outage blocks only the current cycle", () => {
  assert.equal(requiresPersistentManageOnly([issue("SNAPSHOT_UNAVAILABLE")]), false);
});

test("real custody blockers still require explicit audited LIVE restore", () => {
  for (const code of [
    "ORPHAN_EXCHANGE_POSITION",
    "PROTECTION_MISSING",
    "ORPHAN_EXCHANGE_PROTECTION",
    "UNKNOWN_EXCHANGE_PROTECTION_SIDE",
    "TIME_EXIT_DUE",
    "DUPLICATE_SLICE",
  ] as const) {
    assert.equal(requiresPersistentManageOnly([issue(code)]), true, code);
  }
  assert.equal(requiresPersistentManageOnly([issue("SITE_ONLY_POSITION", "WARN")]), false);
  assert.equal(
    requiresPersistentManageOnly([issue("SNAPSHOT_UNAVAILABLE"), issue("PROTECTION_MISSING")]),
    true,
  );
});

test("production scheduled member AI desk refresh uses an authenticated dedicated cron", () => {
  const root = process.cwd();
  const route = readFileSync(resolve(root, "app/api/cron/member-ai-trading-desk-sync/route.ts"), "utf8");
  const runtime = readFileSync(resolve(root, "lib/bitget/demo-runtime.ts"), "utf8");
  const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8")) as {
    crons: Array<{ path: string; schedule: string }>;
  };
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /authorization/);
  assert.match(route, /syncMemberAiTradingDeskSnapshot/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /placeBitgetDemoMarketOrder|setUnifiedLiveMode|runThreeHorizonStrategyEngine/);
  assert.match(runtime, /memberDeskSync: \{ ok: true, mode: "DEDICATED_CRON" \}/);
  const cron = vercel.crons.find((item) => item.path === "/api/cron/member-ai-trading-desk-sync");
  assert.equal(cron?.schedule, "*/2 * * * *");
});
