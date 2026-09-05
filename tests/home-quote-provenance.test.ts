import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeTechnicalLevelView, technicalQuoteLabel } from "../components/home/HomeTechnicalLevelView";
import { LocaleProvider } from "../lib/i18n/LocaleProvider";
import { buildPublicFooterColumns } from "../config/member-channel-navigation";
import en from "../messages/en.json";
import type { ChanInstrument } from "../types/chan-execution";
import type { IntradayTechnicalLevels } from "../lib/market-data/intraday-chan-levels";
import { emptyFounderQuote, PLAN_DAYS, OFFICIAL_PLAN_PRICES } from "../lib/payments/founder-discount-shared";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const instrument: ChanInstrument = { symbol: "NDX", label: "NDX", formalPlanSymbol: "NDX", provider: "YAHOO_CHART", providerSymbol: "QQQ", market: "INDEX_COMMODITY" };
const levels: IntradayTechnicalLevels = {
  key: "NDX", support: "716.46—716.79", resistance: "720.52—720.72", invalidation: "—",
  currentPrice: 718, move24hPct: null, supportValue: 716.46, resistanceValue: 720.52,
  source: "CHAN_4H", sourceLabel: "4H结构", primaryTimeframe: "4H", structureBasis: "ACTIVE_CENTER",
  capturedAt: "2026-09-05T00:00:00.000Z", error: null,
};
const render = (snapshot: IntradayTechnicalLevels | null, target: ChanInstrument | null = instrument, mode: "cells" | "inline" = "inline") => renderToStaticMarkup(React.createElement(HomeTechnicalLevelView, { levels: snapshot, instrument: target, mode }));

test("ETF levels retain their numbers and visibly identify quote units", () => {
  for (const mode of ["inline", "cells"] as const) {
    const html = render(levels, instrument, mode);
    assert.match(html, /QQQ ETF/);
    assert.match(html, /美元\/份（非NDX指数点）/);
    assert.match(html, /716.46—716.79/);
    assert.match(html, /4H技术参考/);
    assert.match(html, /读取 .*08:00 北京时间/);
    assert.doesNotMatch(html, /实时|收盘时间/);
  }
});

test("futures and crypto quote labels do not masquerade as spot or index values", () => {
  assert.match(technicalQuoteLabel({ ...instrument, providerSymbol: "GC=F" }), /黄金期货.*非现货/);
  assert.match(technicalQuoteLabel({ ...instrument, providerSymbol: "SI=F" }), /白银期货.*非现货/);
  assert.match(technicalQuoteLabel({ ...instrument, providerSymbol: "SPY" }), /非SPX指数点/);
  assert.match(technicalQuoteLabel({ ...instrument, provider: "BITGET_PUBLIC", providerSymbol: "BTCUSDT" }), /BTCUSDT.*Bitget合约.*USDT/);
});

test("unavailable or unidentified snapshots hide numbers instead of fabricating fallbacks", () => {
  for (const html of [render(null), render({ ...levels, source: "UNAVAILABLE" }), render(levels, null)]) {
    assert.doesNotMatch(html, /716.46|720.52|读取/);
    assert.match(html, /技术行情暂不可用/);
  }
  assert.doesNotMatch(render({ ...levels, capturedAt: "invalid" }), /Invalid Date|北京时间/);
});

test("legacy repair cannot fetch or overwrite server-owned homepage rows", async () => {
  const source = readFileSync("components/system/SiteClarityGuards.tsx", "utf8");
  const start = source.indexOf("async function repairDailyLevels()");
  const end = source.indexOf("const MULTI_VIEW_PANEL_ID", start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let fetched = 0;
  const promise = runInNewContext(`${compiled}\nrepairDailyLevels()`, {
    findDailyLevelTable: () => ({ dataset: { serverLevels: "true" } }),
    loadActionable: () => { fetched++; throw new Error("Unexpected quote fetch"); },
    headerIndexes: () => { throw new Error("Server table must not be inspected or mutated"); },
  });
  await promise;
  assert.equal(fetched, 0);
  const home = readFileSync("components/home/HomeLandingBoard.tsx", "utf8");
  assert.match(home, /<table data-server-levels="true"/);
  assert.match(home, /\{forecast \? <Suspense[^]*?<HomeIntradayLevelPair/);
  const loader = readFileSync("components/home/HomeIntradayLevelPair.tsx", "utf8");
  assert.match(loader, /resolveIntradayTechnicalTarget\(symbol\)/);
  assert.match(loader, /direction\?\.trim\(\) \? await getIntradayTechnicalLevels/);
});

test("English footer labels resolve and links stay in English", async () => {
  const { Footer } = await import("../components/layout/Footer");
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { initialLocale: "en", messages: en, children: React.createElement(Footer, { footerColumns: buildPublicFooterColumns() }) }));
  assert.match(html, /Member Channel/);
  assert.doesNotMatch(html, /Content unavailable|[\u4e00-\u9fff]/);
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) assert.ok(match[1].startsWith("/en"), match[1]);
});

test("referral button preserves locale without changing its destination", () => {
  const source = readFileSync("components/payments/PricingPageContent.tsx", "utf8");
  assert.match(source, /href=\{referralHref\}/);
  assert.ok(source.includes('encodeURIComponent(href("/account/invite"))'));
  assert.ok(source.includes('encodeURIComponent(href("/pricing"))'));
});

test("all plan links preserve language and login return paths without altering prices", async () => {
  const { PricingPlansClient } = await import("../components/payments/PricingPlansClient");
  const plans = (Object.keys(PLAN_DAYS) as (keyof typeof PLAN_DAYS)[]).map((code, index) => ({ id: code, code, name: code, duration_days: PLAN_DAYS[code], price_usdt: OFFICIAL_PLAN_PRICES[code], access_level: "member" as const, active: true, sort_order: index }));
  for (const locale of ["en", "zh-CN"] as const) for (const isLoggedIn of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { initialLocale: locale, messages: en, children: React.createElement(PricingPlansClient, { plans, supportEmail: "support@example.com", trc20Address: "", bep20Address: "", founderQuote: emptyFounderQuote(), isLoggedIn }) }));
    const links = [...html.matchAll(/href="([^\"]+)"/g)].map((match) => match[1]).filter((value) => value.startsWith("/"));
    const prefix = locale === "en" ? "/en" : "";
    const expected = isLoggedIn ? plans.map((plan) => `${prefix}/checkout?plan=${plan.code}`) : plans.map(() => `${prefix}/login?next=${encodeURIComponent(`${prefix}/pricing`)}`);
    assert.deepEqual(links, expected);
    for (const price of [80, 200, 700]) assert.ok(html.includes(`${price} USDT`));
  }
});
