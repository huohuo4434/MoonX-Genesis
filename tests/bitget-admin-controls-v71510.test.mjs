import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const text = fs.readFileSync(new URL("../components/admin/BitgetDemoClient.tsx", import.meta.url), "utf8");

test("admin page has one RUN_NOW and one RESUME control path", () => {
  assert.equal((text.match(/runtimeAction\("RUN_NOW"\)/g) ?? []).length, 1);
  assert.equal((text.match(/runtimeAction\("RESUME"\)/g) ?? []).length, 1);
  assert.equal(text.includes("服务器立即检查一次"), false);
  assert.equal(text.includes("恢复服务器执行"), false);
});

test("AUTO_ORDER recovery uses separate legacy reconcile and resume-readiness gates", () => {
  assert.match(text, /const canRunNow = !dashboard\.runtime\.paused;/);
  assert.match(text, /const canResume = dashboard\.runtime\.paused && Boolean\(resumeReadiness\?\.safeToConsiderResume\);/);
  assert.match(text, /核对旧版订单错误（只读、不下单）/);
  assert.match(text, /检查恢复条件（只读）/);
  assert.match(text, /CONFIRM_LEGACY_ORDER_ERRORS_RECONCILED/);
  assert.match(text, /RESUME_LIVE_EXPERIMENT/);
  assert.equal(/failureAudit\?\.safeToConsiderResume/.test(text), false);
});
