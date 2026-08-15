import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateTeacherResearch } from "../lib/research/teacher-method-evaluation-core";

const complete = {
  authoritativeDirection: "BULL" as const,
  liuyao: { originalHexagram: "本卦", mutualHexagram: "互卦", changedHexagram: "变卦", movingLine: 2, direction: "BULL" as const },
  qimen: { chartAvailable: true, timingWindow: "2026-08-17..2026-08-23" },
  chan: { available: true, complete: true, direction: "BULL" as const },
  fundamentals: { available: true, direction: "BULL" as const },
};

test("complete aligned evidence only creates a research candidate", () => {
  const result = evaluateTeacherResearch(complete);
  assert.equal(result.action, "RESEARCH_CANDIDATE");
  assert.equal(result.executionAuthority, "RESEARCH_ONLY");
  assert.equal(result.tradingEligible, false);
});

test("missing moving line, missing qimen chart and conflicts all fail closed to WAIT", () => {
  assert.deepEqual(evaluateTeacherResearch({ ...complete, liuyao: { ...complete.liuyao, movingLine: null } }).action, "WAIT");
  assert.deepEqual(evaluateTeacherResearch({ ...complete, qimen: { chartAvailable: false, timingWindow: null } }).action, "WAIT");
  const conflict = evaluateTeacherResearch({ ...complete, chan: { available: true, complete: true, direction: "BEAR" } });
  assert.equal(conflict.action, "WAIT");
  assert.ok(conflict.hardWaitReasons.includes("CHAN_DIRECTION_CONFLICT"));
});

test("teacher opinions without a formal direction can never choose BUY or SELL", () => {
  const result = evaluateTeacherResearch({ ...complete, authoritativeDirection: "NEUTRAL" });
  assert.equal(result.action, "WAIT");
  assert.equal(result.direction, "NEUTRAL");
  assert.equal(result.tradingEligible, false);
});

test("rulebook preserves provenance, missing rules and MOOX attribution", () => {
  const source = readFileSync("lib/data/teacher-method-rulebook-20260815.ts", "utf8");
  for (const missing of ["补丁十九精确公式未恢复", "G3/G5定义未恢复", "特殊卦完整表缺失"]) assert.match(source, new RegExp(missing));
  assert.match(source, /status: "MISSING_RULE"/);
  assert.match(source, /method: "MOOX_POLICY"/);
  assert.match(source, /sourcePublishedAt: null/);
  assert.doesNotMatch(source, /lib\/bitget|lib\/trading-signals|placeOrder|submitOrder/);
});

test("member page loads the server-only rulebook only after login, membership and device gates", () => {
  const page = readFileSync("app/member/technical-methods/page.tsx", "utf8");
  const gate = page.indexOf('gate.status === "DEVICE_REQUIRED"');
  const dynamicImport = page.indexOf('import("@/lib/data/teacher-method-rulebook-20260815")');
  const evaluationImport = page.indexOf('import("@/lib/research/teacher-method-evaluation-core")');
  assert.ok(gate >= 0 && dynamicImport > gate);
  assert.ok(evaluationImport > gate);
  assert.doesNotMatch(page, /^import .*teacher-method-rulebook-20260815/m);
  assert.match(page, /TeacherMethodRulebookPanel/);
  assert.match(page, /evaluateTeacherResearch\(\{/);
  assert.match(page, /movingLine: null/);
  assert.match(page, /chartAvailable: false/);
  assert.match(page, /fundamentals: \{ available: false/);
  const panel = readFileSync("components/member/TeacherMethodRulebookPanel.tsx", "utf8");
  assert.match(panel, /研究检查：\{evaluation\.action\}/);
  assert.match(panel, /PUBLIC_INTERPRETATION_LABEL_ZH/);
  assert.doesNotMatch(panel, /老师研究委员会/);
  assert.match(panel, /evaluation\.hardWaitReasons/);
});
