import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assessMethodEvidence,
  deriveForwardValidatedWeight,
  resolveMethodDirectionCommittee,
  type ForwardMethodSample,
  type StructuredMethodEvidence,
} from "../lib/research/method-evidence-input-core.ts";

const now = new Date("2026-08-15T04:00:00.000Z");
const base: StructuredMethodEvidence = {
  kind: "LIUYAO",
  sourceLabel: "internal-source-01",
  sourcePublishedAt: "2026-08-14T02:00:00.000Z",
  applicableStart: "2026-08-17",
  applicableEnd: "2026-08-23",
  direction: "UP",
  confirmation: "周线收盘站稳关键结构",
  invalidation: "周线收盘跌破失效位",
  primaryHexagram: "原卦",
  mutualHexagram: "互卦",
  changedHexagram: "变卦",
  movingLines: [2, 5],
  isStaticHexagram: false,
};

test("完整六爻证据只锁为前瞻研究，永不具备交易权限", () => {
  const result = assessMethodEvidence(base, now);
  assert.equal(result.state, "FORWARD_LOCKED");
  assert.equal(result.executionAuthority, "RESEARCH_ONLY");
  assert.equal(result.tradingEligible, false);
  assert.equal(result.evidenceGrade, "FULL_CHART");
});

test("视频或语音里的明确六爻解读无需补排盘截图即可锁定为前瞻样本", () => {
  const verbal = assessMethodEvidence({
    ...base,
    evidenceMode: "AUDIO_INTERPRETATION",
    verbalInterpretation: "老师明确判断下周先冲高、周中回落，并给出周三至周四的主要风险窗口。",
    primaryHexagram: undefined,
    mutualHexagram: undefined,
    changedHexagram: undefined,
    movingLines: undefined,
    isStaticHexagram: undefined,
  }, now);
  assert.equal(verbal.state, "FORWARD_LOCKED");
  assert.equal(verbal.evidenceGrade, "VERBAL_INTERPRETATION");
  assert.equal(verbal.tradingEligible, false);
  const vague = assessMethodEvidence({ ...base, evidenceMode: "AUDIO_INTERPRETATION", verbalInterpretation: "可能涨跌" }, now);
  assert.equal(vague.state, "WAIT");
  assert.ok(vague.hardWaitReasons.includes("LIUYAO_VERBAL_INTERPRETATION_REQUIRED"));
});

test("六爻缺互卦或动爻字段、来源来自未来都必须WAIT", () => {
  const result = assessMethodEvidence({ ...base, mutualHexagram: "", movingLines: undefined, sourcePublishedAt: "2026-08-16T00:00:00.000Z" }, now);
  assert.deepEqual(result.hardWaitReasons.sort(), ["LIUYAO_MOVING_LINES_REQUIRED", "LIUYAO_MUTUAL_REQUIRED", "SOURCE_FROM_FUTURE"]);
});

test("系统必须在预测周期开始前锁定，历史补录不能冒充前瞻", () => {
  const result = assessMethodEvidence(base, new Date("2026-08-17T01:00:00.000Z"));
  assert.equal(result.state, "WAIT");
  assert.ok(result.hardWaitReasons.includes("NOT_LOCKED_BEFORE_PERIOD"));
});

test("静卦必须显式声明并与零动爻和无变卦互相一致", () => {
  const ready = assessMethodEvidence({ ...base, isStaticHexagram: true, movingLines: [], changedHexagram: "无变卦（静卦）" }, now);
  assert.equal(ready.state, "FORWARD_LOCKED");
  const pastWindow = assessMethodEvidence({
    ...base, kind: "QIMEN", direction: "TIMING_ONLY",
    qimenChart: "九宫、值符、值使、九星、八门、八神、天盘、地盘完整记录",
    qimenChartReviewed: true,
    qimenWindowStart: "2026-08-14T01:00:00.000Z", qimenWindowEnd: "2026-08-14T05:00:00.000Z",
  }, now);
  assert.ok(pastWindow.hardWaitReasons.includes("QIMEN_WINDOW_NOT_FORWARD"));
  assert.ok(pastWindow.hardWaitReasons.includes("QIMEN_WINDOW_OUTSIDE_PERIOD"));
  const invalid = assessMethodEvidence({ ...base, isStaticHexagram: true, movingLines: [3], changedHexagram: "乾为天" }, now);
  assert.ok(invalid.hardWaitReasons.includes("LIUYAO_STATIC_WITH_MOVING_LINES"));
  assert.ok(invalid.hardWaitReasons.includes("LIUYAO_STATIC_CHANGED_INVALID"));
});

test("奇门必须有完整盘和明确时间窗，且只能负责择时", () => {
  const invalid = assessMethodEvidence({ ...base, kind: "QIMEN", direction: "UP", qimenChart: "摘要", qimenWindowStart: "", qimenWindowEnd: "" }, now);
  assert.equal(invalid.state, "WAIT");
  assert.ok(invalid.hardWaitReasons.includes("QIMEN_COMPLETE_CHART_REQUIRED"));
  assert.ok(invalid.hardWaitReasons.includes("QIMEN_WINDOW_REQUIRED"));
  assert.ok(invalid.hardWaitReasons.includes("QIMEN_TIMING_ONLY"));
  const ready = assessMethodEvidence({
    ...base,
    kind: "QIMEN",
    direction: "TIMING_ONLY",
    qimenChart: "九宫、值符、值使、九星、八门、八神、天盘、地盘完整记录",
    qimenChartReviewed: true,
    qimenWindowStart: "2026-08-18T01:00:00.000Z",
    qimenWindowEnd: "2026-08-18T05:00:00.000Z",
  }, now);
  assert.equal(ready.state, "FORWARD_LOCKED");
});

function samples(count: number, result: ForwardMethodSample["result"]): ForwardMethodSample[] {
  return Array.from({ length: count }, (_, index) => ({
    sourceId: `S-${index}`,
    market: "US",
    horizon: "WEEK",
    regime: "TRENDING",
    sourcePublishedAt: "2026-08-01T00:00:00.000Z",
    lockedAt: "2026-08-01T01:00:00.000Z",
    forecastStart: "2026-08-03",
    scoreEligible: true,
    result,
  }));
}

test("不足10个前瞻样本不得调权，达到门槛后才有限调整", () => {
  const scope = { market: "US", horizon: "WEEK", regime: "TRENDING" };
  assert.deepEqual(deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: samples(9, "FULL_HIT"), scope }), {
    eligibleSamples: 9, minimumSamples: 10, weightedHitRate: 100, effectiveWeightPct: 10, adjustmentState: "BASE_WEIGHT",
  });
  const adjusted = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: samples(10, "FULL_HIT"), scope });
  assert.equal(adjusted.adjustmentState, "FORWARD_ADJUSTED");
  assert.equal(adjusted.effectiveWeightPct, 15);
  const hindsight = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: [{ ...samples(1, "FULL_HIT")[0]!, sourcePublishedAt: "2026-08-04T00:00:00.000Z" }], scope });
  assert.equal(hindsight.eligibleSamples, 0);
  const lateIngest = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: [{ ...samples(1, "FULL_HIT")[0]!, lockedAt: "2026-08-04T00:00:00.000Z" }], scope });
  assert.equal(lateIngest.eligibleSamples, 0);
  const wrongScope = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: samples(10, "FULL_HIT"), scope: { market: "US", horizon: "MONTH", regime: "TRENDING" } });
  assert.equal(wrongScope.eligibleSamples, 0);
  const unclassified = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: samples(10, "FULL_HIT").map((sample) => ({ ...sample, regime: "UNCLASSIFIED" })), scope: { market: "US", horizon: "WEEK", regime: "UNCLASSIFIED" } });
  assert.equal(unclassified.adjustmentState, "BASE_WEIGHT");
});

test("证据冲突时委员会默认WAIT，不输出折中方向", () => {
  const ready = assessMethodEvidence(base, now);
  const result = resolveMethodDirectionCommittee([
    { readiness: ready, direction: "UP", weightPct: 20 },
    { readiness: ready, direction: "DOWN", weightPct: 10 },
  ]);
  assert.deepEqual(result, { action: "WAIT", direction: "NEUTRAL", reason: "EVIDENCE_CONFLICT" });
});

test("动态权重样本必须按唯一sourceId计算，重复样本不能凑满门槛", () => {
  const duplicate = samples(10, "FULL_HIT").map((sample) => ({ ...sample, sourceId: "SAME" }));
  const result = deriveForwardValidatedWeight({ baseWeightPct: 10, maxWeightPct: 20, samples: duplicate, scope: { market: "US", horizon: "WEEK", regime: "TRENDING" } });
  assert.equal(result.eligibleSamples, 1);
  assert.equal(result.adjustmentState, "BASE_WEIGHT");
});

test("生产入口先鉴权再动态加载私有存储，交易模块保持零接线", () => {
  const route = readFileSync("app/api/admin/asset-research/upload/route.ts", "utf8");
  const core = readFileSync("lib/research/method-evidence-input-core.ts", "utf8");
  const store = readFileSync("lib/data/asset-research-upload-store.ts", "utf8");
  const weights = readFileSync("lib/research/teacher-source-weights.ts", "utf8");
  assert.ok(route.indexOf("requireAdmin()") < route.indexOf("await import(\"@/lib/data/asset-research-upload-store\")"));
  assert.doesNotMatch(route + core, /bitget|placeOrder|prediction-auto-trader/i);
  assert.match(core, /executionAuthority: "RESEARCH_ONLY"/);
  assert.match(core, /tradingEligible: false/);
  assert.match(store, /upsert: false/);
  assert.doesNotMatch(store, /records\.slice\(0,\s*500\)/);
  assert.match(store, /fileSha256/);
  assert.match(weights, /tag\.startsWith\("horizon:"\)/);
});
