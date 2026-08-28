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

