import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyMemberDeskSyncError } from "../lib/diagnostics/member-desk-sync-error";

test("snapshot diagnostics identify bounded failures without echoing sensitive provider data", () => {
  assert.equal(classifyMemberDeskSyncError(new Error("交易台设置读取超时")), "SETTINGS_READ_TIMEOUT");
  assert.equal(classifyMemberDeskSyncError(new Error("快照读取超过发布预算。")), "PUBLISH_BUDGET_EXCEEDED");
  assert.equal(classifyMemberDeskSyncError(new Error("快照未写入：记录缺失或已有更新版本。")), "SNAPSHOT_WRITE_NOT_APPLIED");
  const privateError = Object.assign(new Error("postgres://private:secret@private-host/db token=secret"), { code: "P2024" });
  assert.equal(classifyMemberDeskSyncError(privateError), "DATABASE_CONNECTION_OR_POOL");
  assert.equal(classifyMemberDeskSyncError(new Error("api-key=secret")), "UNKNOWN");
  assert.equal(classifyMemberDeskSyncError({ message: "secret", code: "P2024" }), "UNKNOWN");
  assert.equal(classifyMemberDeskSyncError(null), "UNKNOWN");
  assert.equal(classifyMemberDeskSyncError(new Error("数据库快照读取超过4秒")), "LIVE_STATE_READ_TIMEOUT");
  assert.equal(classifyMemberDeskSyncError(new Error("实盘实验快照缺失")), "LIVE_EXPERIMENT_MISSING");
  assert.equal(classifyMemberDeskSyncError(new Error("数据库没有返回实盘状态快照")), "LIVE_STATE_MISSING");
  assert.equal(classifyMemberDeskSyncError(new Error("计划数据库未连接")), "PLAN_DATABASE_UNAVAILABLE");
  assert.equal(classifyMemberDeskSyncError(Object.assign(new Error("private SQL and connection details"), { code: "P2010" })), "DATABASE_QUERY_FAILED");
});

test("cron diagnostics keep authorization, snapshot-only behavior and generic failure response", () => {
  const route = readFileSync(new URL("../app/api/cron/member-ai-desk-sync/route.ts", import.meta.url), "utf8");
  assert.match(route, /!secret \|\| request.headers.get\("authorization"\) !== `Bearer \$\{secret\}`/);
  assert.ok(route.indexOf('status: 401') < route.indexOf('syncMemberAiTradingDeskSnapshot();'));
  assert.match(route, /console.warn\("MEMBER_DESK_SYNC_FAILED", \{\s*category: classifyMemberDeskSyncError\(error\),\s*durationMs: Date.now\(\) - startedAt,\s*\}\)/);
  assert.match(route, /error: "Member snapshot synchronization failed" \}, \{ status: 503 \}/);
  assert.doesNotMatch(route, /runPrediction|runTrading|error\.message|error\.stack/);
});
