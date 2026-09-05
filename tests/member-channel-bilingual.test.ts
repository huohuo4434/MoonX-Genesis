import assert from "node:assert/strict";
import test, { before } from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LATEST_MEMBER_UPDATE } from "../lib/member-updates/catalog";
import type { Locale } from "../lib/i18n/config";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
let MemberChannelContent: typeof import("../components/member/MemberChannelContent").MemberChannelContent;
let MemberUpdateNotice: typeof import("../components/member/MemberUpdateNotice").MemberUpdateNotice;
before(async () => {
  ({ MemberChannelContent } = await import("../components/member/MemberChannelContent"));
  ({ MemberUpdateNotice } = await import("../components/member/MemberUpdateNotice"));
});
const render = (locale: Locale, active: boolean) => renderToStaticMarkup(React.createElement(MemberChannelContent, { locale, active }));

for (const locale of ["en", "zh-CN", "zh-TW"] as const) {
  for (const active of [false, true]) {
    test(`member landing renders ${locale}, access=${active}, with language-safe links`, () => {
      const html = render(locale, active);
      const en = locale === "en";
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
      assert.equal((html.match(/<article\b/g) ?? []).length, 6);
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        assert.ok(en ? href.startsWith("/en/") : !href.startsWith("/en/"), href);
      }
      if (en) assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
      for (const route of ["monthly", "weekly", "daily", "videos", "key-dates", "updates", "weekly-review", "ai-trading"]) {
        assert.ok(html.includes(`href="${en ? "/en" : ""}/member/${route}"`), route);
      }
      assert.doesNotMatch(html, /会员视频（2期）|Member videos \(2/);
      assert.equal(html.includes('id="september-semiconductor-spotlight"'), active);
      if (!active) {
        assert.doesNotMatch(html, /SOXL|SNDK|Sep 7|9月7日/);
        assert.ok(html.includes(`next=${encodeURIComponent(en ? "/en/member" : "/member")}`));
      }
    });
  }
}

test("translated spotlight retains dates, per-asset confirmation and uncertainty", () => {
  const en = render("en", true);
  const zh = render("zh-CN", true);
  for (const text of ["SOXL", "SNDK", "MU", "Sep 7 – Oct 6", "Sep 7 – Oct 7", "Sep 7–13", "Sep 8", "Sep 14–20", "Sep 21", "4-hour", "higher low", "30-minute", "not a probability of profit", "misses and partial hits"]) assert.ok(en.includes(text), text);
  for (const text of ["9月7日—10月6日", "9月7日—10月7日", "9月7日—13日偏强", "日线、4H止跌且30分钟形成更高低点才确认", "高信心指正式周期证据的共振程度，不代表保证上涨", "不隐藏失败样本"]) assert.ok(zh.includes(text), text);
});

test("notice supports compact and full English without rewriting historical notes", () => {
  const renderNotice = (compact: boolean) => renderToStaticMarkup(React.createElement(MemberUpdateNotice, { note: LATEST_MEMBER_UPDATE, compact, locale: "en" }));
  const full = renderNotice(false);
  const compact = renderNotice(true);
  assert.doesNotMatch(full, /[\u4e00-\u9fff]/);
  assert.match(full, /two videos were listed at this release/);
  assert.match(full, /2026-08-30/);
  assert.doesNotMatch(compact, /<ul/);
  assert.match(compact, /href="\/en\/member\/updates"/);
  const fallback = renderToStaticMarkup(React.createElement(MemberUpdateNotice, { note: { ...LATEST_MEMBER_UPDATE, english: undefined }, locale: "en" }));
  assert.doesNotMatch(fallback, /[\u4e00-\u9fff]/);
  assert.match(fallback, /Member update/);
  assert.match(LATEST_MEMBER_UPDATE.title, /会员频道导航/);
});

test("page retains device authorization and heartbeat; presentation has no new data requests", () => {
  const page = readFileSync("app/member/page.tsx", "utf8");
  assert.match(page, /getMemberDevicePageAccess\(\)/);
  assert.match(page, /gate.status === "ALLOWED"/);
  assert.match(page, /active \? <MemberDeviceHeartbeat \/> : null/);
  assert.match(page, /getRequestLocale\(\)/);
  assert.match(page, /MemberChannelContent locale=\{locale\} active=\{active\}/);
  const content = readFileSync("components/member/MemberChannelContent.tsx", "utf8");
  assert.doesNotMatch(content, /useEffect|fetch\(|"use client"|lib\/auth|lib\/bitget|api\//);
  assert.match(content, /HorizonReadingNav en=\{en\}/);
});
