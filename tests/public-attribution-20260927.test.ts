import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { publicAttributionText, projectAttributionForAudience } from "../lib/presentation/public-attribution";

test("annual-source names are redacted without claiming original authorship", () => {
  for (const name of ["丙午老师", "丙午老師", "Bingwu", "Bing Wu", "Bingwu's", "Bingwu’s"]) {
    assert.equal(publicAttributionText(name, "zh"), "参考资料");
    assert.equal(publicAttributionText(name, "en"), "reference material");
  }
  assert.equal(publicAttributionText("丙午年、丙申月"), "丙午年、丙申月");
  assert.equal(publicAttributionText("易老师综合解读"), "易老师综合解读");
});

test("internal provenance stays intact while member text is anonymized", () => {
  const original = { title: "丙午老师 annual reading", sourceIds: ["bingwu"], rawText: "source evidence" };
  assert.strictEqual(projectAttributionForAudience(original, { audience: "ADMIN" }), original);
  const member = projectAttributionForAudience(original, { audience: "MEMBER" });
  assert.doesNotMatch(JSON.stringify(member), /丙午老师|bingwu|source evidence/i);
  assert.equal(original.title, "丙午老师 annual reading");
});

test("recent research cards show Yi editorial identity while retaining source limitations", () => {
  for (const file of ["components/research/BtcAnnualReview20260927.tsx", "components/member/UsEquityXuReview.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /易老师/);
    assert.match(source, /不将外部原文表述为本人原创/);
    assert.match(source, /完整来源保留在内部核验记录/);
    assert.doesNotMatch(source, /丙午老师|Bing\s*Wu|狼叔|\bWolf\b|\bStone\b/i);
    assert.match(source, /不.*自动交易/);
  }
});

test("public route and component literals cannot reintroduce named annual-source branding", () => {
  const visit = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (["admin", "api", "node_modules"].includes(entry.name)) return [];
    const file = join(dir, entry.name);
    return entry.isDirectory() ? visit(file) : /\.tsx$/.test(file) ? [file] : [];
  });
  for (const file of [...visit("app"), ...visit("components")]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /丙午(?:老师|老師)|\bBing\s*Wu\b/i, file);
  }
});
