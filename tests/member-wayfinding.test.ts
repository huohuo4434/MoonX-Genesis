import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberWayfinding } from "../components/member/MemberWayfinding";
import { MEMBER_UPDATE_NOTES } from "../lib/member-updates/catalog";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const render = (locale: "en" | "zh-CN", home = false) => renderToStaticMarkup(React.createElement(MemberWayfinding, { locale, home }));

test("bilingual shortcuts link to existing pages and preserve locale and research switches", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    const html = render(locale);
    if (locale === "en") assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
    assert.match(html, /id="member-guide"/);
    assert.match(html, /<details/);
    assert.doesNotMatch(html, /<details[^>]*\bopen/);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links.length, 16);
    for (const link of links) {
      assert.match(link, locale === "en" ? /^\/en\/member(?:\/|#)/ : /^\/member(?:\/|#)/);
      const path = link.replace(/^\/en/, "").split(/[?#]/)[0];
      assert.ok(existsSync(`app${path}/page.tsx`), path);
    }
    for (const route of ["daily?research=1", "key-dates?research=1", "sector-resonance?detail=1", "monthly", "annual-outlook", "gann", "videos", "notes", "consultations"]) assert.ok(links.some(l => l.endsWith(`/member/${route}`)), route);
    assert.match(html, locale === "en" ? /not an entry signal/ : /不是可用入场信号/);
  }
});

test("both home modes and member desk expose wayfinding before the chart", () => {
  for (const source of ["components/home/HomeWelcome.tsx", "components/home/HomeLandingBoard.tsx"]) assert.match(readFileSync(source, "utf8"), /MemberWayfinding locale=\{locale\} home/);
  const desk = readFileSync("components/member/MemberOperationDesk.tsx", "utf8");
  assert.ok(desk.indexOf("<MemberWayfinding") < desk.indexOf("<ConciseTradePlans"));
  for (const locale of ["en", "zh-CN"] as const) {
    const html = render(locale, true);
    assert.equal([...html.matchAll(/href=/g)].length, 3);
    assert.match(html, /member#member-guide/);
    if (locale === "en") assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
  }
});

test("new announcement preserves earlier releases and does not imply strategy migration", () => {
  assert.equal(MEMBER_UPDATE_NOTES[0].releasedAt, "2026-09-12");
  assert.ok(MEMBER_UPDATE_NOTES.some(n => n.version === "V7.21.0"));
  assert.ok(MEMBER_UPDATE_NOTES[0].preserved.some(s => s.includes("不改变自动交易")));
  assert.doesNotMatch(readFileSync("components/member/MemberWayfinding.tsx", "utf8"), /fetch\(|useEffect|localStorage|\/api\//);
});
