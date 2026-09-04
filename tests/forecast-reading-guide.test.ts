import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PLAIN_DIRECTIONS } from "../lib/forecasts/plain-direction";
import { forecastReadingGuide } from "../lib/presentation/forecast-reading-guide";
import { PlainLanguageSummary } from "../components/education/PlainLanguageSummary";
import { memberDeskRefreshPresentation } from "../lib/member-ai-desk-polling-core";
import type { AiTradingDeskSnapshot } from "../types/ai-trading-desk";

// tsx uses the repository's classic JSX transform for server render tests.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

for (const direction of PLAIN_DIRECTIONS) {
  test(`reading guide preserves the full ${direction} path in both locales`, () => {
    const zh = forecastReadingGuide(direction);
    const en = forecastReadingGuide(direction, true);
    assert.equal(zh.direction, direction);
    assert.equal(zh.label, direction);
    assert.equal(en.direction, direction);
    assert.ok(en.label.length > 0);
    assert.doesNotMatch(en.meaning + en.watch, /[\u4e00-\u9fff]/);
    assert.ok(zh.meaning && zh.watch);
  });
}

test("missing, unknown and ambiguous prose cannot manufacture a direction", () => {
  for (const raw of [undefined, null, "", "NO_AUTHORITY", "看涨但也可能看跌", "请立刻买入"]) {
    assert.equal(forecastReadingGuide(raw).direction, null);
    assert.equal(forecastReadingGuide(raw).label, "观点待核对");
  }
  assert.equal(forecastReadingGuide(" 探底回升 ").direction, "先跌后涨");
  assert.equal(forecastReadingGuide("冲高回落").direction, "先涨后跌");
  assert.equal(forecastReadingGuide("震荡").direction, "震荡");
});

test("two-stage outlook never claims its turning point is already confirmed", () => {
  assert.match(forecastReadingGuide("先跌后涨").meaning, /不等于现在已经见底/);
  assert.match(forecastReadingGuide("先涨后跌").meaning, /不等于现在已经见顶/);
  assert.match(forecastReadingGuide("下跌").watch, /不是立即做空指令/);
});

test("rendered guidance exposes dates and provided conditions without an extra click", () => {
  const html = renderToStaticMarkup(React.createElement(PlainLanguageSummary, {
    direction: "先跌后涨", period: "2026-09-07 — 2026-09-12",
    confirmation: "收盘站稳 62520 后观察回踩", invalidation: "跌破 61000 停止跟随",
  }));
  for (const text of ["先跌后涨", "2026-09-07", "2026-09-12", "62520", "61000", "等什么确认", "什么情况停止跟随", "不是必然顶底"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /<details|<button/);
});

test("missing conditions are explicit rather than invented, in Chinese and English", () => {
  const zh = renderToStaticMarkup(React.createElement(PlainLanguageSummary, { direction: "上涨" }));
  assert.match(zh, /未提供明确入场确认/);
  assert.match(zh, /未提供明确失效条件/);
  const en = renderToStaticMarkup(React.createElement(PlainLanguageSummary, { direction: "上涨", en: true }));
  assert.match(en, /No explicit entry confirmation/);
  assert.match(en, /No explicit invalidation/);
  assert.doesNotMatch(en, /[\u4e00-\u9fff]/);
});

test("a successful HTTP refresh does not make an old snapshot current", () => {
  const nowMs = Date.parse("2026-09-04T04:00:00Z");
  for (const lastSyncedAt of ["2026-08-27T00:38:00Z", null, "invalid", "2026-09-04T04:01:01Z", "2026-09-04T03:56:59.999Z"]) {
    const result = memberDeskRefreshPresentation("", false, { lastSyncedAt, nowMs });
    assert.equal(result.stale, true);
    assert.match(result.statusLabel!, /当前状态待核验/);
    assert.notEqual(result.serverLabel, "正常");
  }
  for (const lastSyncedAt of ["2026-09-04T04:00:00Z", "2026-09-04T03:57:00Z"]) {
    assert.equal(memberDeskRefreshPresentation("", false, { lastSyncedAt, nowMs }).stale, false);
  }
  assert.equal(memberDeskRefreshPresentation("", true, { lastSyncedAt: "2026-09-04T04:00:00Z", nowMs: NaN }).stale, true);
  assert.equal(memberDeskRefreshPresentation("network", true, { lastSyncedAt: "2026-09-04T04:00:00Z", nowMs }).stale, true);
  assert.match(memberDeskRefreshPresentation("", true, { lastSyncedAt: null, nowMs }).statusLabel!, /CURRENT STATE UNKNOWN/);
});

test("member pages wire forecast dates and stale-state suppression without order actions", () => {
  const read = (file: string) => readFileSync(file, "utf8");
  const daily = read("app/member/daily/page.tsx");
  assert.match(daily, /<PlainLanguageSummary/);
  assert.match(daily, /confirmation=\{forecast.confirmation\}/);
  assert.match(daily, /invalidation=\{forecast.invalidation\}/);
  assert.doesNotMatch(daily, /九大|nine core|Nine-market/);
  assert.equal((daily.match(/id=\{`daily-/g) ?? []).length, 1);
  assert.match(read("components/member/MemberWeeklyPage.tsx"), /period=\{`\$\{a.weekStart\} — \$\{a.weekEnd\}`\}/);
  assert.match(read("components/member/MemberMonthlyPage.tsx"), /period=\{`\$\{item.periodStart\} — \$\{item.periodEnd\}`\}/);
  const desk = read("components/member/AiTradingDeskClient.tsx");
  assert.match(desk, /lastSyncedAt: snapshot.lastSyncedAt, nowMs: checkedAt/);
  assert.match(desk, /!stale \? <AiTradeIntentBoard/);
  assert.match(desk, /data-stale-desk="1"/);
  assert.match(desk, /历史快照持仓 · 不代表当前/);
  assert.doesNotMatch(desk, /ACTIVE MODE|AI正在从动态候选池寻找下一笔/);
  assert.doesNotMatch(desk, /method:\s*["']POST/);
});

test("first paint cannot advertise old health, execution permission, or candidate levels as current", async () => {
  const { AiTradingDeskClient } = await import("../components/member/AiTradingDeskClient");
  const { LocaleProvider } = await import("../lib/i18n/LocaleProvider");
  const initial = {
    generatedAt: "2026-08-27T00:38:00Z", lastSyncedAt: "2026-08-27T00:38:00Z",
    mode: "BITGET_LIVE_EXPERIMENT", operationalState: "LIVE_POSITION", operationalStateLabel: "实盘持仓中",
    executionAllowed: true, serverHealthy: true, syncStatus: "OK", syncMessage: "旧健康文案不应显示",
    latestQuoteAt: "2026-08-27T00:36:00Z", quoteReady: true,
    runtime: { quoteAgeSeconds: 100, lastHeartbeatAt: "2026-08-27T00:38:00Z" },
    experiment: { dailyHistory: [], dailyPnlUsdt: 54321.23, pnlUsdt: 98765.43, initialEquityUsdt: 1000.8 },
    planSummary: { closedToday: 0, submittedOrOpen: 0 },
    intentDecisions: [], publishedPlans: [], positions: [], recentTrades: [],
  } as unknown as AiTradingDeskSnapshot;
  for (const locale of ["zh-CN", "en"] as const) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, {
      initialLocale: locale, messages: {}, children: React.createElement(AiTradingDeskClient, { initial }),
    }));
    assert.match(html, /data-stale-desk="1"/);
    assert.doesNotMatch(html, /旧健康文案不应显示|实盘持仓中|54,321.23|98,765.43|ACTIVE MODE/);
    assert.ok(html.includes(locale === "en" ? "Historical snapshot positions" : "历史快照持仓"));
  }
});
