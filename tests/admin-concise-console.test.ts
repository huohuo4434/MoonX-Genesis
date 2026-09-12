import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminNav } from "../components/admin/AdminNav";
import { readConsultationList } from "../lib/admin/consultation-list-client";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const read = (path: string) => readFileSync(path, "utf8");
const renderNav = (current: string) => renderToStaticMarkup(React.createElement(AdminNav, { current }));

test("eight primary admin entries, collapsed low-frequency groups, no lost routes", () => {
  const html = renderNav("/admin");
  const primary = html.slice(0, html.indexOf("<details"));
  assert.equal((primary.match(/href=/g) ?? []).length, 8);
  assert.equal((html.match(/<details/g) ?? []).length, 3);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.doesNotMatch(html, /暂无咨询申请/);
  const baseline = execFileSync("git", ["show", "05f0601a:components/admin/AdminNav.tsx"], { encoding: "utf8" });
  const routes = [...baseline.matchAll(/href: "([^"]+)"/g)].map(m => m[1]);
  for (const route of routes) {
    assert.ok(html.includes(`href="${route}"`), route);
    assert.ok(existsSync(`app${route}/page.tsx`), route);
    assert.equal(html.split(`href="${route}"`).length - 1, 1, `${route} duplicated`);
  }
  const research = renderNav("/admin/iching/cases");
  assert.equal((research.match(/<details[^>]*\bopen/g) ?? []).length, 1);
  assert.equal((research.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(primary, /href="\/admin\/consultations"/);
});

test("overview fetches four essentials after auth; no blanket readiness or decorative stats", () => {
  const source = read("app/admin/page.tsx");
  assert.ok(source.indexOf("await requireAdminOrRedirect") < source.indexOf("await Promise.allSettled"));
  assert.doesNotMatch(source, /getPublicVerificationSnapshot|getKnowledgeGrowthStats|PromotionReadinessPanel|LiuyaoAnnualCoverage2026|具备全面推广条件/);
  assert.match(source, /tile.value \?\? "读取失败"/);
  assert.match(source, /queue\?\.total \?\? null/);
  assert.match(source, /cycleGaps\.blockingTaskCount \+ cycleGaps\.actionTaskCount/);
  assert.match(source, /本页检查的内容与问卦队列暂无待办/);
  for (const link of source.matchAll(/<Link\b[^>]+>/g)) assert.match(link[0], /prefetch=\{false\}/);
});

test("consultation list distinguishes loading and failed reads from a confirmed empty result", async (t) => {
  const sample = { id: "request-1", kind: "LIUYAO", status: "APPROVED", created_at: "2026-09-12T00:00:00Z" };
  for (const [label, response, expected] of [
    ["empty", Response.json({ requests: [] }), []],
    ["completed remains visible", Response.json({ requests: [sample] }), [sample]],
    ["missing requests", Response.json({}), null],
    ["null body", Response.json(null), null],
    ["malformed row", Response.json({ requests: [{}] }), null],
    ["truncated body", new Response(""), null],
    ["unauthorized", new Response("denied", { status: 403 }), null],
  ] as const) {
    await t.test(label, async (t) => {
      t.mock.method(globalThis, "fetch", async (_url, options) => {
        assert.equal(_url, "/api/admin/consultations");
        assert.equal(options?.cache, "no-store");
        assert.ok(options?.signal);
        return response;
      });
      if (expected === null) await assert.rejects(() => readConsultationList(new AbortController().signal));
      else assert.deepEqual(await readConsultationList(new AbortController().signal), expected);
    });
  }
  await t.test("network failure", async (t) => {
    t.mock.method(globalThis, "fetch", async () => { throw new Error("network"); });
    await assert.rejects(() => readConsultationList(new AbortController().signal));
  });
  const source = read("components/admin/AdminConsultationQueue.tsx");
  assert.match(source, /useState<"loading" \| "ready" \| "error">\("loading"\)/);
  assert.match(source, /setTimeout\(abort, 15_000\)/);
  assert.match(source, /return \(\) => controller.abort\(\)/);
  assert.match(source, /重试读取/);
  assert.ok(source.indexOf('listState === "error"') < source.indexOf("目前没有会员问卦"));
  assert.ok(source.indexOf('role="status"') < source.indexOf("{detailData ? ("));
});
