import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readTradingSnapshot } from "../lib/presentation/read-trading-snapshot";
import { memberDeskRefreshPresentation, startMemberDeskPolling } from "../lib/member-ai-desk-polling-core";
import { conciseSnapshotFresh } from "../lib/presentation/concise-trade-plan";
import { memberTradesToday } from "../lib/presentation/member-trade-day";
import { assetNameEn } from "../lib/i18n/english-content";

const source = (file: string) => readFileSync(file, "utf8");
const valid = { settings: {}, runtime: {}, experiment: {}, stats: {}, planSummary: {}, ledgerSource: "BITGET_LIVE", publishedPlans: [], positions: [], recentTrades: [], strategies: [] };

test("today's trade count uses Beijing date regardless of array order and missing is not zero", () => {
  const now = Date.parse("2026-09-12T16:01:00Z"); // Sep 13 Beijing
  const rows = [{ date: "2026-09-13", trades: 3 }, { date: "2026-09-12", trades: 7 }];
  assert.equal(memberTradesToday(rows, now), 3);
  assert.equal(memberTradesToday([...rows].reverse(), now), 3);
  assert.equal(memberTradesToday(rows, Date.parse("2026-09-12T15:59:00Z")), 7);
  assert.equal(memberTradesToday([], now), null);
  assert.equal(memberTradesToday([{ date: "2026-09-12", trades: 7 }], now), null);
  assert.equal(memberTradesToday(rows, NaN), null);
  assert.equal(assetNameEn("国际银价"), "Silver");
});

test("snapshot reader only GETs the member endpoint and rejects malformed payloads and private errors", async t => {
  let payload: unknown = valid;
  t.mock.method(globalThis, "fetch", async (url: unknown, options: RequestInit) => {
    assert.equal(url, "/api/member/ai-trading-desk");
    assert.equal(options.method, undefined);
    assert.equal(options.cache, "no-store");
    return new Response(JSON.stringify(payload));
  });
  assert.deepEqual(await readTradingSnapshot(new AbortController().signal), valid);
  for (payload of [null, {}, { ...valid, positions: null }, { ...valid, ledgerSource: "OTHER" }]) {
    await assert.rejects(readTradingSnapshot(new AbortController().signal), /SNAPSHOT_UNAVAILABLE/);
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("private server details"); });
  await assert.rejects(readTradingSnapshot(new AbortController().signal), error => (error as Error).message === "SNAPSHOT_UNAVAILABLE");
});

test("reader cancels promptly on unmount and already-aborted requests", async t => {
  t.mock.method(globalThis, "fetch", (_url: unknown, options: RequestInit) => new Promise((_resolve, reject) => {
    const fail = () => reject(new Error("aborted"));
    if (options.signal?.aborted) fail();
    else options.signal?.addEventListener("abort", fail, { once: true });
  }));
  const controller = new AbortController();
  const pending = readTradingSnapshot(controller.signal);
  controller.abort();
  await assert.rejects(pending, /SNAPSHOT_UNAVAILABLE/);
  await assert.rejects(readTradingSnapshot(controller.signal), /SNAPSHOT_UNAVAILABLE/);
});

test("plan and execution pages use identical freshness including future and invalid timestamps", () => {
  const now = Date.parse("2026-09-12T14:00:00Z");
  for (const age of [-1, 0, 119_999, 120_000, 120_001, 180_000]) {
    const lastSyncedAt = new Date(now - age).toISOString();
    assert.equal(memberDeskRefreshPresentation("", true, { lastSyncedAt, nowMs: now }).stale, !conciseSnapshotFresh(lastSyncedAt, now));
  }
  assert.equal(memberDeskRefreshPresentation("", true, { lastSyncedAt: null, nowMs: now }).stale, true);
});

test("hidden tabs do not poll and a visible next tick resumes reading", async () => {
  let visible = false, reads = 0;
  let tick = () => {};
  const stop = startMemberDeskPolling({ read: async () => ++reads, shouldPoll: () => visible,
    onSnapshot: () => {}, onError: () => assert.fail(), intervalMs: 60_000,
    setIntervalFn: ((fn: () => void) => { tick = fn; return 1; }) as unknown as typeof setInterval,
    clearIntervalFn: (() => {}) as typeof clearInterval,
  });
  tick(); assert.equal(reads, 0);
  visible = true; tick(); await Promise.resolve(); assert.equal(reads, 1);
  stop();
});

test("member plan readers share bounded reads; connection tutorial is opt-in", () => {
  for (const file of ["components/member/AiTradingDeskClient.tsx", "components/member/ConciseTradePlans.tsx", "components/member/MemberAiTradingDashboardLazy.tsx"]) {
    assert.match(source(file), /readTradingSnapshot/);
    assert.doesNotMatch(source(file), /method:\s*["']POST|\/api\/admin\//);
  }
  const ai = source("components/member/AiTradingDeskClient.tsx");
  assert.match(ai, /symbol=\{selectedSymbol\}/);
  assert.match(ai, /snapshot.syncStatus !== "OK"/);
  assert.ok(ai.indexOf('data-conclusion-first="1"') < ai.indexOf("<ConciseTradePlans"));
  assert.match(ai, /snapshot.settings.showTradeHistory \?/);
  assert.match(ai, /snapshot.settings.showAbsolutePnl \?/);
  assert.match(source("components/member/MemberAiTradingDashboardLazy.tsx"), /open \? <ConnectionGuide/);
  assert.match(source("lib/presentation/read-trading-snapshot.ts"), /setTimeout\(abort, 25_000\)/);
});

test("weekly report preserves full locked path and all published rows, with original detail folded", () => {
  const page = source("app/member/weekly-report/page.tsx");
  assert.match(page, /directionEn\(row.overallDirection\) : row.overallDirection/);
  assert.doesNotMatch(page, /mooxDirectionLabel|pickTop|\.sort\(|\.slice\(/);
  assert.match(page, /published.map/);
  assert.match(page, /<details/);
  assert.match(page, /getMemberDevicePageAccess/);
  assert.match(page, /lang="zh-CN"/);
  const nav = source("components/member/HorizonReadingNav.tsx");
  assert.doesNotMatch(nav, /1—4周|72小时|30—90分钟/);
  assert.match(nav, /daily\?research=1/);
  for (const file of ["components/member/MemberWeeklyPage.tsx", "components/member/MemberMonthlyPage.tsx"]) {
    assert.doesNotMatch(source(file), /mooxDirectionLabel/);
    assert.match(source(file), /directionEn\(/);
  }
});
