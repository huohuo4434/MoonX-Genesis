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

test("member AI desk refresh remains authenticated and on-demand without competing with the minute live runner", () => {
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
  const probe = readFileSync(resolve(root, "lib/trading-signals/member-ai-trading-desk.ts"), "utf8");
  const probeIndex = probe.indexOf("FROM trade_member_ai_desk_settings AS settings");
  const ddlIndex = probe.indexOf("CREATE TABLE IF NOT EXISTS trade_member_ai_desk_settings");
  assert.ok(probeIndex >= 0 && ddlIndex > probeIndex);
  assert.match(probe, /snapshot\.last_synced_at/);
  assert.match(probe, /snapshot\.last_error/);
  assert.match(probe, /member AI trading desk schema probe failed/);
  assert.match(probe, /if \(schemaMissing\) return "MISSING_SCHEMA"/);
  assert.match(probe, /rows\.length > 0 \? "READY" : "MISSING_ROWS"/);
  assert.match(probe, /return "UNAVAILABLE"/);
  assert.match(probe, /initialProbe === "MISSING_SCHEMA" && !\(await ensurePredictionAutoTraderTables\(\)\)/);
  assert.match(probe, /if \(initialProbe === "MISSING_SCHEMA"\) \{[\s\S]{0,180}CREATE TABLE IF NOT EXISTS trade_member_ai_desk_settings/);
  assert.match(probe, /ALTER TABLE trade_member_ai_desk_settings[\s\S]{0,700}ADD COLUMN IF NOT EXISTS updated_at/);
  assert.match(probe, /ALTER TABLE trade_member_ai_desk_snapshot[\s\S]{0,500}ADD COLUMN IF NOT EXISTS last_synced_at[\s\S]{0,200}ADD COLUMN IF NOT EXISTS last_error/);
  assert.match(probe, /probeMemberAiTradingDeskSchema\(\) !== "READY"/);
  assert.ok(probe.indexOf("probeMemberAiTradingDeskSchema() !== \"READY\"") > probe.indexOf("ALTER TABLE trade_member_ai_desk_snapshot"));
  assert.match(probe, /const evaluatedSnapshot = applyAiDeskOperationalState\([\s\S]{0,5000}, new Date\(\)\)/);
  assert.equal((probe.match(/markAiDeskSnapshotReadOnly\(/g) ?? []).length >= 4, true);
  assert.equal(/lastReadableSnapshot[\s\S]{0,260}applyAiDeskOperationalState\(/.test(probe), false);
  assert.match(probe, /stale \|\| Boolean\(row\.last_error\)[\s\S]{0,120}markAiDeskSnapshotReadOnly/);
  assert.match(runtime, /memberDeskSync: \{ ok: true, mode: "ON_DEMAND" \}/);
  const cron = vercel.crons.find((item) => item.path === "/api/cron/member-ai-trading-desk-sync");
  assert.equal(cron, undefined);
});
