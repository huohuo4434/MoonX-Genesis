import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildPromotionReadinessSummary } from "../lib/admin/promotion-readiness.ts";

const healthy = {
  todayPublished: 9,
  tomorrowPublished: 9,
  focusCurrent: 19,
  focusTotal: 19,
  focusAffectedAssets: [],
  cycleGapCount: 0,
  consultationAvailable: true,
  pendingConsultations: 0,
  failedConsultations: 0,
} as const;

test("promotion readiness never calls a blocked site ready", () => {
  const summary = buildPromotionReadinessSummary({
    ...healthy,
    cycleGapCount: 3,
  });
  assert.equal(summary.status, "HOLD");
  assert.equal(summary.blockerCount, 1);
  assert.ok(summary.actions.some((item) => item.key === "cycle"));
});

test("operational backlog remains pilot-only instead of a false blocker", () => {
  const summary = buildPromotionReadinessSummary({
    ...healthy,
    focusCurrent: 4,
    focusAffectedAssets: ["BTC", "ETH", "闪迪"],
  });
  assert.equal(summary.status, "PILOT");
  assert.equal(summary.blockerCount, 0);
  assert.equal(summary.actionCount, 1);
  assert.match(summary.actions.find((item) => item.key === "focus")?.detail ?? "", /BTC/);
});

test("fully healthy input is the only path to comprehensive promotion readiness", () => {
  const summary = buildPromotionReadinessSummary(healthy);
  assert.equal(summary.status, "READY");
  assert.equal(summary.actions.length, 0);
});

test("critical admin pages guard before expensive data and public member previews keep data locked", () => {
  const root = process.cwd();
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  for (const file of ["app/admin/page.tsx", "app/admin/site-health/page.tsx"]) {
    const source = read(file);
    const guard = source.indexOf("await requireAdminOrRedirect(");
    const data = source.indexOf("await Promise.all(");
    assert.ok(guard >= 0 && data > guard, `${file} must guard before data loading`);
  }
  for (const file of [
    "app/member/daily/page.tsx",
    "app/member/stock-picks/page.tsx",
    "app/member/sector-resonance/page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /LOGIN_REQUIRED[\s\S]*MEMBERSHIP_REQUIRED/);
    assert.match(source, /PublicFeaturePreview/);
    assert.match(source, /nextPath=\{path\}/);
  }
});
