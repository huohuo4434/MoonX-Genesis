import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeWelcome } from "../components/home/HomeWelcome";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const read = (file: string) => readFileSync(file, "utf8");
const render = (locale: "en" | "zh-CN", canViewDaily = false) => renderToStaticMarkup(React.createElement(HomeWelcome, { locale, canViewDaily }));

test("English welcome is entirely English and all navigation preserves the locale", () => {
  const html = render("en");
  assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
  assert.match(html, /Know the outlook/);
  for (const match of html.matchAll(/href="([^"]+)"/g)) assert.ok(match[1].startsWith("/en/"), match[1]);
  assert.match(html, /next=%2Fen%2Fmember%2Fdaily/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test("both languages explain horizons, access timing and uncertainty without return claims", () => {
  const en = render("en");
  const zh = render("zh-CN");
  for (const word of ["MONTH", "WEEK", "DAY", "00:00 UTC", "No payment required", "Forecasts can be wrong", "misses"]) assert.ok(en.includes(word), word);
  for (const word of ["看大方向", "定关注清单", "找位置", "08:00", "无需付款", "未命中", "预测可能出错"]) assert.ok(zh.includes(word), word);
  assert.doesNotMatch(zh, /稳赚|保证盈利|九大/);
  assert.doesNotMatch(en, /nine core|win rate of|guaranteed income/i);
  assert.match(zh, /next=%2Fmember%2Fdaily/);
});

test("daily access uses the localized research entry without exposing forecasts on the welcome", () => {
  const html = render("en", true);
  assert.match(html, /Open today&#x27;s research|Open today’s research|Open today's research/);
  assert.match(html, /href="\/en\/member\/daily"/);
  const home = read("components/home/HomeLandingBoard.tsx");
  assert.match(home, /!todayPayload\?\.allowed \|\| locale === "en"/);
  assert.match(home, /HomeWelcome locale=\{locale\}/);
  const source = read("components/home/HomeWelcome.tsx");
  assert.doesNotMatch(source, /getPublicAccuracy|fetch\(|useEffect|api\//);
});

test("public metadata and mobile market denominator no longer claim nine markets", () => {
  assert.doesNotMatch(read("app/page.tsx"), /九大|nine core/i);
  const mobile = read("components/home/HomeMobileAppView.tsx");
  assert.match(mobile, /publishedCount\}\/5/);
  assert.doesNotMatch(mobile, /publishedCount\}\/9|value="9"/);
});

test("pricing keeps disclosure and adds free signup without modifying payment processing", () => {
  const pricing = read("components/payments/PricingPageContent.tsx");
  assert.match(pricing, /Start free — no payment required/);
  assert.match(pricing, /id="membership-plans"/);
  assert.match(pricing, /Payments are in USDT/);
  assert.match(pricing, /<details[\s\S]*Explore the included research tools/);
  assert.match(pricing, /<PricingPlansClient/);
  assert.match(read("components/home/TomorrowViewFallback.tsx"), /if \(!document.querySelector\("\[data-home-dashboard\]"\)\) return/);
});
