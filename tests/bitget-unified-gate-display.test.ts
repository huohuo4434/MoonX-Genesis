import test from "node:test";
import assert from "node:assert/strict";
import { isUnifiedNewEntryBlockedForDisplay } from "@/lib/presentation/bitget-live-status";

test("active legacy experiment never hides a unified MANAGE_ONLY entry block", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: { message: "影子扫描完成。Unified Live新开仓闸门未通过；阻断码：ACCOUNT_NEW_ENTRIES_DISABLED" },
    recentEvents: [],
  }), true);
});

test("the latest PAUSED_SKIP event also keeps the display fail closed", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: { message: "行情与账户对账完成" },
    recentEvents: [{ action: "PAUSED_SKIP", message: "本轮禁止新开仓。RUNTIME_MODE_MANAGE_ONLY" }],
  }), true);
});

test("healthy report without a unified block may display executable scanning", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: { message: "三周期扫描完成，统一实盘闸门通过" },
    recentEvents: [],
  }), false);
});

test("a scan-only candidate message alone is not presented as the authoritative account gate", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: { message: "影子扫描（禁止新开仓）：候选与事前计划继续刷新。" },
    recentEvents: [{ action: "THREE_HORIZON_SHADOW_SCAN", message: "本轮禁止新开仓" }],
  }), false);
});

test("a disconnected reconciled account remains blocked even when the persistent pause flag is false", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: {
      ok: false,
      paused: true,
      market: { ok: true },
      reconcile: { connected: false },
      message: "服务器行情正常，但账户对账未通过，本轮禁止新开仓。",
    },
    recentEvents: [],
  }), true);
});

test("stale market data blocks the display without relying on a unified permission code", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: {
      ok: false,
      market: { ok: false },
      reconcile: { connected: true },
      message: "行情未通过3分钟新鲜度检查，本轮禁止生成新入场与提交订单。",
    },
    recentEvents: [],
  }), true);
});

test("a structured healthy report is not blocked by unrelated strategy text", () => {
  assert.equal(isUnifiedNewEntryBlockedForDisplay({
    paused: false,
    lastReport: {
      ok: true,
      paused: false,
      market: { ok: true },
      reconcile: { connected: true },
      message: "影子扫描候选刷新完成。",
    },
    recentEvents: [{ action: "THREE_HORIZON_SHADOW_SCAN", message: "本轮禁止新开仓" }],
  }), false);
});
