import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COMMITTEE_ROLE_DEFINITIONS } from "../lib/ai-committee/roles";
import type {
  CommitteeInput,
  CommitteeReview,
  CommitteeRoleOpinion,
} from "../lib/ai-committee/types";
import {
  hasBlockingGate,
  runInputGates,
  runOutputGates,
} from "../lib/ai-committee/verification";

const input: CommitteeInput = {
  asset: "闪迪",
  symbol: "SNDK",
  horizon: "未来7天",
  asOf: "2026-08-07 06:00",
  marketContext: "价格处于震荡区间。",
  technicalEvidence: "日线仍在压力位下方，4小时结构修复。",
  liuyaoQimenEvidence: "周卦显示先修复后承压。",
  macroEvidence: "",
  existingView: "震荡偏多。",
  riskConstraints: "2倍以内杠杆，小仓分批。",
  sourceNotes: "",
};

const opinions: CommitteeRoleOpinion[] = COMMITTEE_ROLE_DEFINITIONS.map((role) => ({
  roleId: role.id,
  roleName: role.name,
  stance: role.id === "CONTRARIAN" ? "BEARISH" : "MIXED",
  confidence: 62,
  thesis: `${role.name}结论`,
  evidenceRefs: role.id === "LIUYAO_QIMEN" ? ["LIUYAO_QIMEN"] : ["TECHNICAL"],
  supportingPoints: ["有提供证据"],
  risks: ["仍有不确定性"],
  invalidation: "突破或跌破关键位置后失效。",
  proposedAction: "仅供内部观察。",
  dataGaps: [],
}));

const review: CommitteeReview = {
  roleId: "REVIEWER",
  verdict: "MIXED",
  confidence: 68,
  consensus: "短期修复但不是确认反转。",
  disagreements: ["反方认为压力仍未解除。"],
  finalView: "震荡修复，等待确认。",
  timeWindow: "未来3至7天。",
  invalidation: "有效跌破支撑后失效。",
  riskPlan: "小仓、分批、硬止损。",
  publishDecision: "NEEDS_REVIEW",
  publishReason: "仍需人工确认实时行情。",
  unsupportedClaims: [],
  nextChecks: ["核对最新价格和成交量。"],
};

test("AI委员会定义五个Builder和一个独立Reviewer", () => {
  assert.equal(COMMITTEE_ROLE_DEFINITIONS.length, 5);
  assert.deepEqual(
    COMMITTEE_ROLE_DEFINITIONS.map((role) => role.id),
    ["MARKET_STRUCTURE", "LIUYAO_QIMEN", "MACRO_EVENT", "CONTRARIAN", "RISK"]
  );
});

test("输入闸门要求至少两类证据和市场锚点", () => {
  const valid = runInputGates(input);
  assert.equal(hasBlockingGate(valid), false);

  const invalid = runInputGates({
    ...input,
    marketContext: "",
    technicalEvidence: "",
    liuyaoQimenEvidence: "只有单一卦象",
    existingView: "",
  });
  assert.equal(hasBlockingGate(invalid), true);
});

test("输出闸门保留分歧、失效条件和证据追踪", () => {
  const gates = runOutputGates(opinions, review);
  assert.equal(hasBlockingGate(gates), false);
  assert.ok(gates.some((gate) => gate.id === "builder-reviewer-separation" && gate.passed));
  assert.ok(gates.some((gate) => gate.id === "research-only" && gate.passed));
});

test("存在未支持论断时不得批准发布", () => {
  const badReview: CommitteeReview = {
    ...review,
    publishDecision: "APPROVED",
    unsupportedClaims: ["没有证据的价格目标"],
  };
  const gates = runOutputGates(opinions, badReview);
  assert.ok(gates.some((gate) => gate.id === "unsupported-claims" && !gate.passed));
  assert.equal(hasBlockingGate(gates), true);
});

test("后台路由和导航已接入，且API包含管理员鉴权", () => {
  const nav = readFileSync("components/admin/AdminNav.tsx", "utf8");
  const route = readFileSync("app/api/admin/ai-committee/route.ts", "utf8");
  const page = readFileSync("app/admin/ai-committee/page.tsx", "utf8");
  assert.match(nav, /\/admin\/ai-committee/);
  assert.match(route, /requireAdmin/);
  assert.match(page, /AiCommitteeClient/);
});

test("项目规则明确委员会不能直接触发实盘", () => {
  const agents = readFileSync("AGENTS.md", "utf8");
  const docs = readFileSync("docs/MOOX_AI_WORKBENCH_PHASE1.md", "utf8");
  assert.match(agents, /RESEARCH_ONLY/);
  assert.match(agents, /never directly triggers Bitget orders/i);
  assert.match(docs, /never automatic trading/i);
});
