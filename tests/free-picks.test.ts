import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FreePicks } from "../components/education/FreePicks";
import { freePicksCatalogSchema, pickStatus, type FreePick } from "../lib/free-picks/core";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const text = { zh: "测试示例", en: "Test fixture" };
const pick: FreePick = {
  id: "test-pick", title: text, summary: text, symbol: "TEST", venue: "Fixture", currency: "USD", side: "LONG", horizon: text,
  publishedAt: "2026-09-12T10:00:00Z", validFrom: "2026-09-12T12:00:00Z", validUntil: "2026-09-14T12:00:00Z",
  sourcePublishedAt: "2026-09-11T10:00:00Z", sourceLockedAt: "2026-09-11T11:00:00Z", sourceRef: "INTERNAL_NOT_FOR_DISPLAY",
  entry: [100, 101], stop: 98, targets: [110, 115], costAllowance: 0.1, trigger: text, invalidation: text,
};
const base = { lastCheckedAt: "2026-09-12T10:00:00Z", checkNote: text, picks: [pick], reviews: [] };
const valid = (p: Partial<FreePick>) => freePicksCatalogSchema.safeParse({ ...base, picks: [{ ...pick, ...p }] }).success;

test("entry geometry, costs and first-target reward/risk fail closed", () => {
  assert.ok(valid({}));
  assert.ok(valid({ side: "SHORT", entry: [100,101], stop: 103, targets: [90,85] }));
  for (const patch of [{ entry: [101,100] }, { stop: 102 }, { targets: [102,115] }, { costAllowance: 5 }, { stop: NaN }, { targets: [110,109] }, { side: "SHORT" }])
    assert.equal(valid(patch as Partial<FreePick>), false, JSON.stringify(patch));
});
test("no retrospective lock/start and at most one pick every 72 hours", () => {
  assert.equal(valid({ sourceLockedAt: "2026-09-13T00:00:00Z" }), false);
  assert.equal(valid({ validFrom: "2026-09-12T09:59:00Z" }), false);
  assert.equal(valid({ validUntil: pick.validFrom }), false);
  assert.equal(freePicksCatalogSchema.safeParse({ ...base, picks: [pick, { ...pick, id: "second" }] }).success, false);
});
test("review must be unique, linked and after the full window", () => {
  const review = { pickId: pick.id, reviewedAt: "2026-09-15T00:00:00Z", outcome: "STOP", note: text, evidenceUrl: "https://example.com/verified" };
  assert.ok(freePicksCatalogSchema.safeParse({ ...base, reviews: [review] }).success);
  for (const reviews of [[review,review], [{ ...review, pickId: "missing" }], [{ ...review, reviewedAt: pick.validFrom }]])
    assert.equal(freePicksCatalogSchema.safeParse({ ...base, reviews }).success, false);
});
test("schedule and expiry have exact boundaries, without extending old levels", () => {
  assert.equal(pickStatus(pick, Date.parse(pick.validFrom)-1), "SCHEDULED");
  assert.equal(pickStatus(pick, Date.parse(pick.validFrom)), "OBSERVING");
  assert.equal(pickStatus(pick, Date.parse(pick.validUntil)), "EXPIRED");
});
test("bilingual public rendering preserves loss archives and hides future publication/internal references", () => {
  const catalog = freePicksCatalogSchema.parse({ ...base, reviews: [{ pickId: pick.id, reviewedAt: "2026-09-15T00:00:00Z", outcome: "STOP", note: text, evidenceUrl: "https://example.com/verified" }] });
  for (const locale of ["zh-CN", "en"] as const) {
    const render = (now: string) => renderToStaticMarkup(React.createElement(FreePicks, { catalog, locale, now: Date.parse(now) }));
    const html = render("2026-09-15T12:00:00Z");
    assert.match(html, locale === "en" ? /Stop reached/ : /触及止损/);
    assert.match(html, locale === "en" ? /Archive only/ : /原计划存档/);
    assert.doesNotMatch(html, /INTERNAL_NOT_FOR_DISPLAY/);
    assert.match(html, locale === "en" ? /Review due/ : /已到复核时间/);
    assert.ok(html.includes(locale === "en" ? "next=%2Fen%2Ffree-picks" : "next=%2Ffree-picks"));
    if (locale === "en") assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
    assert.doesNotMatch(render("2026-09-12T09:00:00Z"), /id="test-pick"/);
  }
});
test("production catalog is valid and append-only relative to the preceding published git version", () => {
  const file = "content/free-picks/catalog.json";
  const catalog = freePicksCatalogSchema.parse(JSON.parse(readFileSync(file,"utf8")));
  let previous;
  // On the initial introduction the file has no parent version. Thereafter compare
  // against HEAD, or its parent when tests run after committing a publication.
  for (const ref of ["HEAD", "HEAD^"]) {
    try { previous = JSON.parse(execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", stdio: ["ignore","pipe","ignore"] })); } catch { continue; }
    for (const field of ["picks", "reviews"] as const) for (const item of previous[field]) {
      const key = field === "picks" ? "id" : "pickId";
      assert.deepEqual(catalog[field].find(row => (row as Record<string, unknown>)[key] === item[key]), item, "Published records must not be deleted or rewritten");
    }
  }
});
