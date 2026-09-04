import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync("app/member/key-dates/page.tsx", "utf8");
const page = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(name: string) {
  const node = page.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name);
  return node;
}
function detailDepthFor(node: ts.Node, expression: string) {
  const depths: number[] = [];
  function visit(child: ts.Node, depth: number) {
    const next = depth + (ts.isJsxElement(child) && child.openingElement.tagName.getText(page) === "details" ? 1 : 0);
    if (ts.isJsxExpression(child) && child.expression?.getText(page) === expression) depths.push(next);
    child.forEachChild(nested => visit(nested, next));
  }
  visit(node, 0);
  return depths;
}

test("current card keeps action and risk conditions visible while folding evidence once", () => {
  const card = declaration("KeyDateEntry");
  for (const field of ["guidance.label", "guidance.note", "item.title", "cycleSummary", "item.confirmation", "item.invalidation"]) {
    assert.deepEqual(detailDepthFor(card, field), [0], `${field} must remain visible exactly once`);
  }
  for (const field of ["item.primaryView", "item.derivation", "item.weeklyAssist", "item.consensusNote", "item.gann.note"]) {
    assert.deepEqual(detailDepthFor(card, field), [1], `${field} belongs in folded evidence`);
  }
  assert.doesNotMatch(card.getText(page), /<details[^>]*\bopen[\s=>]/);
  assert.match(card.getText(page), /const cycleSummary = item.primaryView.split\("。", 1\)\[0\]/);
});

test("dated research archive is folded after current assets, with original records retained", () => {
  const archive = declaration("HistoricalResearchConsensus").getText(page);
  assert.match(archive, /return <details/);
  assert.doesNotMatch(archive, /<details[^>]*\bopen[\s=>]/);
  assert.match(archive, /2026年8月30日/);
  assert.match(archive, /不是当前建议/);
  assert.match(archive, /RESEARCH_CONSENSUS_REVIEWS_20260830\.map/);
  const route = declaration("MemberKeyDatesPage").getText(page);
  assert.ok(route.indexOf("<HistoricalResearchConsensus") > route.indexOf("SECTOR_GROUPS.map"));
  assert.doesNotMatch(source, /LatestResearchConsensus|8月30日新增资料/);
});

test("active means an ongoing window, not that its focus date is today", () => {
  const status = declaration("statusLabel").getText(page);
  assert.match(status, /窗口进行中/);
  assert.doesNotMatch(status, /"今日"/);
  assert.match(source, /MEMBERSHIP_REQUIRED/);
  assert.match(source, /DEVICE_REQUIRED/);
});
