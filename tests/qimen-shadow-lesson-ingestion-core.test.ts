import assert from "node:assert/strict";
import test from "node:test";

import type { QimenFormalForecastSnapshot } from "@/lib/research/qimen-shadow-capture-core";
import {
  applyMasterQimenOnlyBackfill,
  applyTeacherQimenOnlyBackfill,
  qimenReportNeedsBackfill,
  selectQimenOnlyBackfillRows,
  selectValidExtractedQimenRows,
} from "@/lib/research/qimen-shadow-lesson-backfill-core";
import {
  buildQimenLessonExtractionReport,
  planQimenLessonReading,
  qimenLessonTranscriptSha256,
  selectNovelQimenLessonCandidates,
  type QimenLessonModelDraft,
} from "@/lib/research/qimen-shadow-lesson-ingestion-core";

const palaceLayout = "坎宫天盘庚地盘戊开门天心九天，坤宫天盘辛地盘己休门天蓬九地，震宫天盘壬地盘庚生门天任六合，巽宫天盘癸地盘辛伤门天冲白虎，中宫天盘戊地盘壬杜门天禽值符，乾宫天盘己地盘癸景门天辅玄武，兑宫天盘甲地盘乙死门天柱太阴，艮宫天盘乙地盘丙惊门天英腾蛇，离宫天盘丙地盘丁开门天芮九天";
const chartQuote = `起局时间2026年8月30日20时，阳遁三局，值符天心，值使开门；${palaceLayout}。`;
const assetQuote = "本次看BTC比特币未来走势。";
const directionQuote = "综合判断BTC本周未来上涨，多头走强。";
const windowQuote = "BTC本周适用时间为2026年8月30日至2026年9月3日。";
const stemsQuote = "BTC产品主用神为庚，辅助用神为戊。";
const transcript = [
  chartQuote, assetQuote, directionQuote, windowQuote, stemsQuote,
  "问题是BTC周走势。", "上涨宫为三宫。", "下跌宫为六宫。", "震荡宫为九宫。",
].join("\n");

const chartFacts = [
  { kind: "CHART_TIME" as const, value: "2026年8月30日20时", quote: chartQuote },
  { kind: "YIN_YANG_BUREAU" as const, value: "阳遁三局", quote: chartQuote },
  { kind: "DUTY_STAR" as const, value: "天心", quote: chartQuote },
  { kind: "DUTY_DOOR" as const, value: "开门", quote: chartQuote },
  { kind: "PALACE_LAYOUT" as const, value: palaceLayout, quote: chartQuote },
];
const sourceMeta = { sourceVersion: "lesson-v1", sourceTranscriptSha256: "a".repeat(64), sourceReportSha256: "b".repeat(64) };

function objectDraft(overrides: Partial<Extract<QimenLessonModelDraft, { schoolId: "OBJECT_YONGSHEN" }>> = {}): Extract<QimenLessonModelDraft, { schoolId: "OBJECT_YONGSHEN" }> {
  return {
    schoolId: "OBJECT_YONGSHEN",
    marketCode: "BTC",
    horizon: "SWING",
    direction: "UP",
    confidence: 88,
    applicableFrom: "2026-08-30",
    applicableUntil: "2026-09-03",
    chartComplete: true,
    chartFacts,
    primaryStems: ["庚"],
    secondaryStems: ["戊"],
    basis: "TEACHER_EXPLICIT",
    evidence: { sourceBlockQuote: transcript, chartQuote, assetQuote, directionQuote, windowQuote, stemsQuote },
    ...overrides,
  };
}

function directionalDraft(overrides: Partial<Extract<QimenLessonModelDraft, { schoolId: "DIRECTIONAL_PALACE" }>> = {}): Extract<QimenLessonModelDraft, { schoolId: "DIRECTIONAL_PALACE" }> {
  return {
    schoolId: "DIRECTIONAL_PALACE",
    marketCode: "BTC",
    horizon: "SWING",
    direction: "UP",
    confidence: 64,
    applicableFrom: "2026-08-30",
    applicableUntil: "2026-09-03",
    chartComplete: true,
    chartFacts,
    question: "BTC周走势",
    upPalace: 3,
    downPalace: 6,
    sidewaysPalace: 9,
    evidence: {
      sourceBlockQuote: transcript, chartQuote, assetQuote, directionQuote, windowQuote,
      questionQuote: "问题是BTC周走势。",
      upPalaceQuote: "上涨宫为三宫。",
      downPalaceQuote: "下跌宫为六宫。",
      sidewaysPalaceQuote: "震荡宫为九宫。",
    },
    ...overrides,
  };
}

function formal(overrides: Partial<QimenFormalForecastSnapshot> = {}): QimenFormalForecastSnapshot {
  return {
    kind: "WEEKLY",
    id: "btc-week-20260830-v2",
    marketCode: "BTC",
    periodStart: "2026-08-30",
    periodEnd: "2026-09-03",
    direction: "震荡上涨",
    version: 2,
    status: "LOCKED",
    publishedAt: new Date("2026-08-29T10:00:00.000Z"),
    lockedAt: new Date("2026-08-29T10:01:00.000Z"),
    ...overrides,
  };
}

test("课程读数只接受完整盘、逐字证据和明确窗口，自动置信度封顶且一律研究态", () => {
  const report = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft(), directionalDraft()] },
  });
  assert.equal(report.modelStatus, "EXTRACTED");
  assert.equal(report.accepted.length, 2);
  assert.equal(report.accepted[0]?.confidence, 70);
  assert.ok(report.accepted.every((item) => item.readiness === "RESEARCH_ONLY"));
  assert.equal(report.policy.mayTrade, false);
  assert.equal(report.policy.mayChangeForecast, false);
});

test("模型改写引文、缺完整盘字段、宫位重复或时间证据不全全部失败关闭", () => {
  const cases = [
    objectDraft({ evidence: { ...objectDraft().evidence, directionQuote: "原文里不存在的看涨结论" } }),
    objectDraft({ chartFacts: chartFacts.map((item) => item.kind === "YIN_YANG_BUREAU"
      ? { kind: "DAY_STEM" as const, value: "天心", quote: chartQuote }
      : item) }),
    directionalDraft({ downPalace: 3 }),
    objectDraft({ applicableUntil: "2026-09-04" }),
  ];
  const report = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: cases },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 4);
  assert.match(report.rejected.map((item) => item.reason).join("|"), /逐字|起局时间或阴阳遁|重复|适用日期/);
});

test("先跌后涨等双向路径不能被模型压缩成单一奇门方向", () => {
  const mixedDirection = "这里判断先下跌后上涨，等待反弹。";
  const report = buildQimenLessonExtractionReport({
    transcript: `${transcript}\n${mixedDirection}`,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ evidence: { ...objectDraft().evidence, directionQuote: mixedDirection } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /多个有效方向类别/);
});

test("方向失败、失效和多类别转折句不能被压缩成肯定单方向", () => {
  const cases = [
    "BTC反弹失败。",
    "BTC走强尝试失败。",
    "BTC上涨逻辑彻底失效。",
    "BTC震荡结束转为上涨。",
    "BTC震荡后转为下跌。",
  ];
  for (const quote of cases) {
    const source = transcript.replace(directionQuote, quote);
    const report = buildQimenLessonExtractionReport({
      transcript: source,
      generatedAt: "2026-08-30T12:10:00.000Z",
      modelStatus: "EXTRACTED",
      modelOutput: { drafts: [objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: source, directionQuote: quote } })] },
    });
    assert.equal(report.accepted.length, 0, quote);
  }
});

test("用神角色必须在各自标签片段内绑定，主辅互换或只给天地盘均拒绝", () => {
  for (const badStems of ["BTC产品主用神为庚，辅助用神为戊。", "BTC天盘庚、地盘戊。"]) {
    const source = transcript.replace(stemsQuote, badStems);
    const swapped = objectDraft({
      primaryStems: ["戊"],
      secondaryStems: ["庚"],
      evidence: { ...objectDraft().evidence, sourceBlockQuote: source, stemsQuote: badStems },
    });
    const report = buildQimenLessonExtractionReport({ transcript: source, generatedAt: "2026-08-30T12:10:00.000Z", modelStatus: "EXTRACTED", modelOutput: { drafts: [swapped] } });
    assert.equal(report.accepted.length, 0, badStems);
    assert.match(report.rejected[0]?.reason ?? "", /主用神角色|辅助用神角色/);
  }
});

test("证据块前置假设限定词也会失败关闭", () => {
  const source = `以下仅为假设。\n${transcript}`;
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: source } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /假设\/示例/);
});

test("不能截掉错误观点或转述后否认的上下文伪造肯定方向", () => {
  const cases = [
    {
      unit: "这是错误观点如下：BTC本周未来上涨，多头走强。",
      selected: "BTC本周未来上涨，多头走强。",
    },
    {
      unit: "有人说BTC本周上涨，但我不认同。",
      selected: "有人说BTC本周上涨，但我不认同。",
    },
  ];
  for (const item of cases) {
    const source = transcript.replace(directionQuote, item.unit);
    const report = buildQimenLessonExtractionReport({
      transcript: source,
      generatedAt: "2026-08-30T12:10:00.000Z",
      modelStatus: "EXTRACTED",
      modelOutput: { drafts: [objectDraft({ evidence: {
        ...objectDraft().evidence,
        sourceBlockQuote: source,
        directionQuote: item.selected,
      } })] },
    });
    assert.equal(report.accepted.length, 0, item.unit);
    assert.match(report.rejected[0]?.reason ?? "", /完整语义句|错误、反例、转述后否认/);
  }
});

test("市场外界分析师业内和引用观点都不能冒充讲述者本盘结论", () => {
  const thirdPartyDirections = [
    "市场普遍认为BTC本周未来上涨，多头走强。",
    "外界观点是BTC本周上涨。",
    "分析师称BTC本周上涨。",
    "业内判断BTC本周上涨。",
    "我引用一条观点：BTC本周上涨。",
    "综合判断华尔街看好BTC本周上涨。",
  ];
  for (const thirdPartyDirection of thirdPartyDirections) {
    const source = transcript.replace(directionQuote, thirdPartyDirection);
    const report = buildQimenLessonExtractionReport({
      transcript: source,
      generatedAt: "2026-08-30T12:10:00.000Z",
      modelStatus: "EXTRACTED",
      modelOutput: { drafts: [objectDraft({ evidence: {
        ...objectDraft().evidence,
        sourceBlockQuote: source,
        directionQuote: thirdPartyDirection,
      } })] },
    });
    assert.equal(report.accepted.length, 0, thirdPartyDirection);
    assert.match(report.rejected[0]?.reason ?? "", /明确归属于讲述者|第三方观点/);
  }
});

test("第一人称条件方向也不能在触发前登记成无条件确定方向", () => {
  const conditionalDirections = [
    "我认为BTC如果突破前高，本周未来上涨，多头走强。",
    "我认为BTC只有站上65000才上涨，本周多头走强。",
    "我认为BTC若突破前高则上涨，本周多头走强。",
    "我认为BTC在突破前高的情况下，本周未来上涨，多头走强。",
    "我认为BTC以突破前高为前提，本周未来上涨，多头走强。",
    "我认为BTC方向取决于能否突破前高，本周未来上涨。",
    "我认为BTC视行情而定，本周可能上涨。",
    "我认为BTC突破65000会继续上涨，本周多头走强。",
  ];
  for (const conditionalDirection of conditionalDirections) {
    const source = transcript.replace(directionQuote, conditionalDirection);
    const report = buildQimenLessonExtractionReport({
      transcript: source,
      generatedAt: "2026-08-30T12:10:00.000Z",
      modelStatus: "EXTRACTED",
      modelOutput: { drafts: [objectDraft({ evidence: {
        ...objectDraft().evidence,
        sourceBlockQuote: source,
        directionQuote: conditionalDirection,
      } })] },
    });
    assert.equal(report.accepted.length, 0, conditionalDirection);
    assert.match(report.rejected[0]?.reason ?? "", /尚未验证的条件触发/);
  }
});

test("错误窗口、错误用神和演示三宫都不能通过截短子引文登记", () => {
  const wrongWindowUnit = `这是错误窗口：${windowQuote}`;
  const wrongWindowSource = transcript.replace(windowQuote, wrongWindowUnit);
  const wrongStemUnit = `这是错误用神：${stemsQuote}`;
  const wrongStemSource = transcript.replace(stemsQuote, wrongStemUnit);
  const demoPalaceUnit = "仅作演示：上涨宫为三宫。";
  const demoPalaceSource = transcript.replace("上涨宫为三宫。", demoPalaceUnit);
  const report = buildQimenLessonExtractionReport({
    transcript: [wrongWindowSource, wrongStemSource, demoPalaceSource].join("\n---\n"),
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [
      objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: wrongWindowSource } }),
      objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: wrongStemSource } }),
      directionalDraft({ evidence: { ...directionalDraft().evidence, sourceBlockQuote: demoPalaceSource } }),
    ] },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 3);
  assert.ok(report.rejected.every((item) => /完整语义句|错误、反例、转述后否认|假设\/示例/.test(item.reason)));
});

test("短月日必须有数字边界，8月3日不能借8月30日子串通过", () => {
  const shortWindow = "BTC适用时间为2026/8/30到2026/8/31。";
  const source = transcript.replace(windowQuote, shortWindow);
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      applicableFrom: "2026-08-03",
      applicableUntil: "2026-08-31",
      evidence: { ...objectDraft().evidence, sourceBlockQuote: source, windowQuote: shortWindow },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /适用日期/);
});

test("普通会议话术不能由模型错标成完整奇门盘", () => {
  const fakeChart = "会议时间2026年8月30日20时，阳光资料第三局，资料布局完整，但这不是完整奇门盘。";
  const source = [fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const fakeFacts = [
    { kind: "CHART_TIME" as const, value: "2026年8月30日20时", quote: fakeChart },
    { kind: "YIN_YANG_BUREAU" as const, value: "阳光", quote: fakeChart },
    { kind: "PALACE_LAYOUT" as const, value: "布局完整", quote: fakeChart },
    { kind: "DAY_STEM" as const, value: "第三局", quote: fakeChart },
  ];
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      chartFacts: fakeFacts,
      evidence: { sourceBlockQuote: source, chartQuote: fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /可验证的起局时间|阴阳遁局数/);
});

test("只有起局时间局数和值符值使但原文未提供九宫盘仍失败关闭", () => {
  const incomplete = "只说起局时间2026年8月30日20时、阳遁三局、值符天心、值使开门，未提供九宫完整盘。";
  const source = [incomplete, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = chartFacts.filter((fact) => fact.kind !== "PALACE_LAYOUT").map((fact) => ({ ...fact, quote: incomplete }));
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      chartFacts: facts,
      evidence: { sourceBlockQuote: source, chartQuote: incomplete, assetQuote, directionQuote, windowQuote, stemsQuote },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /缺失完整奇门盘|多宫结构/);
});

test("相邻段落里的其他资产用神或另一问题三宫不能拼成同一读数", () => {
  const ethStems = "ETH产品主用神为庚，辅助用神为戊。";
  const objectSource = [chartQuote, assetQuote, directionQuote, windowQuote, ethStems].join("\n");
  const otherQuestion = "问题是ETH未来走势。";
  const directionalSource = [transcript, otherQuestion].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: [objectSource, directionalSource].join("\n---\n"),
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [
      objectDraft({ evidence: { sourceBlockQuote: objectSource, chartQuote, assetQuote, directionQuote, windowQuote, stemsQuote: ethStems } }),
      directionalDraft({ evidence: {
        ...directionalDraft().evidence,
        sourceBlockQuote: directionalSource,
        questionQuote: otherQuestion,
      } }),
    ] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected.map((item) => item.reason).join("|"), /所选资产|所选问题和资产/);
});

test("同一盘里第二个问题用看涨看跌横盘同义标签也不能跨问题拼宫", () => {
  const secondQuestion = "再看BTC日内，看涨四宫、看跌五宫、横盘六宫。";
  const source = `${transcript}\n${secondQuestion}`;
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [directionalDraft({
      downPalace: 5,
      evidence: {
        ...directionalDraft().evidence,
        sourceBlockQuote: source,
        downPalaceQuote: secondQuestion,
      },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /一个问题和一组三结果宫|一条对应资产的方向结论/);
});

test("只有一组三宫标签但属于后一个未标问题时也不能嫁接给前一个问题", () => {
  const question = "问题是BTC周走势。";
  const secondGroup = "再看BTC日内，看涨四宫、看跌五宫、横盘六宫。";
  const source = [chartQuote, assetQuote, directionQuote, windowQuote, stemsQuote, question, secondGroup].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [directionalDraft({
      question: "BTC周走势",
      upPalace: 4,
      downPalace: 5,
      sidewaysPalace: 6,
      evidence: {
        sourceBlockQuote: source,
        chartQuote,
        assetQuote,
        directionQuote,
        windowQuote,
        questionQuote: question,
        upPalaceQuote: "看涨四宫",
        downPalaceQuote: "看跌五宫",
        sidewaysPalaceQuote: "横盘六宫",
      },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /同一个问题段|一个问题和一组三结果宫|一条对应资产的方向结论/);
});

test("周问题不能拼接日内方向与三宫，即使整块只有一个问题标签", () => {
  const question = "问题是BTC周走势。";
  const mismatchedDirection = "BTC日内判断未来上涨。";
  const resultGroup = "看涨四宫、看跌五宫、横盘六宫。";
  const source = [chartQuote, assetQuote, mismatchedDirection, windowQuote, stemsQuote, question, resultGroup].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [directionalDraft({
      question: "BTC周走势",
      upPalace: 4,
      downPalace: 5,
      sidewaysPalace: 6,
      evidence: {
        sourceBlockQuote: source,
        chartQuote,
        assetQuote,
        directionQuote: mismatchedDirection,
        windowQuote,
        questionQuote: question,
        upPalaceQuote: "看涨四宫",
        downPalaceQuote: "看跌五宫",
        sidewaysPalaceQuote: "横盘六宫",
      },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /同一观察周期|同一个问题段/);
});

test("同一盘里第二组日期不能把旧盘调度到错误未来窗口", () => {
  const otherWindow = "另风险观察BTC适用时间为2026年9月10日至2026年9月11日。";
  const source = `${transcript}\n${otherWindow}`;
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [directionalDraft({
      applicableFrom: "2026-09-10",
      applicableUntil: "2026-09-11",
      evidence: {
        ...directionalDraft().evidence,
        sourceBlockQuote: source,
        windowQuote: otherWindow,
      },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /多个或未选中的日期窗口/);
});

test("同一盘里两组产品用神和窗口不能跨问题拼主辅用神", () => {
  const secondStems = "再看BTC日内，BTC产品主用神为辛，辅助用神为己。";
  const secondWindow = "BTC适用时间为2026年9月10日至2026年9月11日。";
  const source = `${transcript}\n${secondStems}\n${secondWindow}`;
  const combinedStems = `${stemsQuote}\n${secondStems}`;
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      secondaryStems: ["己"],
      evidence: {
        ...objectDraft().evidence,
        sourceBlockQuote: source,
        stemsQuote: combinedStems,
      },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /多个问题、用神组或适用窗口|多个或未选中的日期窗口/);
});

test("否定的资产方向日期或用神不能靠关键词伪装成肯定读数", () => {
  const cases = [
    objectDraft({ evidence: { ...objectDraft().evidence, assetQuote: "这里不是BTC比特币。", sourceBlockQuote: transcript.replace(assetQuote, "这里不是BTC比特币。") } }),
    objectDraft({ evidence: { ...objectDraft().evidence, directionQuote: "未来不是看涨，尚不明确。", sourceBlockQuote: transcript.replace(directionQuote, "未来不是看涨，尚不明确。") } }),
    objectDraft({ evidence: { ...objectDraft().evidence, windowQuote: "2026年8月30日至2026年9月3日不是适用窗口。", sourceBlockQuote: transcript.replace(windowQuote, "2026年8月30日至2026年9月3日不是适用窗口。") } }),
    objectDraft({ evidence: { ...objectDraft().evidence, stemsQuote: "不能说BTC产品主用神为庚，辅助用神为戊。", sourceBlockQuote: transcript.replace(stemsQuote, "不能说BTC产品主用神为庚，辅助用神为戊。") } }),
  ];
  const joined = cases.map((item) => item.evidence.sourceBlockQuote).join("\n---\n");
  const report = buildQimenLessonExtractionReport({
    transcript: joined,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: cases },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 4);
  assert.match(report.rejected.map((item) => item.reason).join("|"), /否定|不确定/);
});

test("未来不看涨这种最短否定也不能作为UP证据", () => {
  const denied = "未来不看涨，方向仍不明确。";
  const source = transcript.replace(directionQuote, denied);
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: source, directionQuote: denied } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /被否定|否定/);
});

test("拒绝上涨、上涨无望、难以上涨、不宜上涨都不能转成UP", () => {
  const phrases = [
    "BTC拒绝上涨。", "BTC上涨无望。", "BTC难以上涨。", "BTC不宜上涨。",
    "BTC上涨失败。", "BTC看涨逻辑失效。", "BTC多头投降。", "BTC多头被打爆。",
  ];
  const drafts = phrases.map((phrase) => {
    const source = transcript.replace(directionQuote, phrase);
    return objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: source, directionQuote: phrase } });
  });
  const report = buildQimenLessonExtractionReport({
    transcript: drafts.map((draft) => draft.evidence.sourceBlockQuote).join("\n---\n"),
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, phrases.length);
});

test("适用日与起局时间必须是真实公历日期并正确处理闰日", () => {
  const invalidWindow = "BTC适用时间为2026年99月99日至2026年99月99日。";
  const invalidChart = chartQuote.replace("2026年8月30日20时", "2026年99月99日20时");
  const invalidSource = [invalidChart, assetQuote, directionQuote, invalidWindow, stemsQuote].join("\n");
  const invalidFacts = chartFacts.map((fact) => ({
    ...fact,
    value: fact.kind === "CHART_TIME" ? "2026年99月99日20时" : fact.value,
    quote: invalidChart,
  }));
  const invalid = buildQimenLessonExtractionReport({
    transcript: invalidSource,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      applicableFrom: "2026-99-99",
      applicableUntil: "2026-99-99",
      chartFacts: invalidFacts,
      evidence: { sourceBlockQuote: invalidSource, chartQuote: invalidChart, assetQuote, directionQuote, windowQuote: invalidWindow, stemsQuote },
    })] },
  });
  assert.equal(invalid.modelStatus, "INVALID_MODEL_OUTPUT");
  assert.equal(invalid.accepted.length, 0);

  const leapWindow = "BTC适用时间为2028年2月29日至2028年3月1日。";
  const leapChart = chartQuote.replace("2026年8月30日20时", "2028年2月29日20时");
  const leapSource = [leapChart, assetQuote, directionQuote, leapWindow, stemsQuote].join("\n");
  const leapFacts = chartFacts.map((fact) => ({
    ...fact,
    value: fact.kind === "CHART_TIME" ? "2028年2月29日20时" : fact.value,
    quote: leapChart,
  }));
  const leap = buildQimenLessonExtractionReport({
    transcript: leapSource,
    generatedAt: "2028-02-29T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      applicableFrom: "2028-02-29",
      applicableUntil: "2028-03-01",
      chartFacts: leapFacts,
      evidence: { sourceBlockQuote: leapSource, chartQuote: leapChart, assetQuote, directionQuote, windowQuote: leapWindow, stemsQuote },
    })] },
  });
  assert.equal(leap.accepted.length, 1);
});

test("宫位同义词和重复组件不能把三个真实宫位凑成完整九宫盘", () => {
  const fakeLayout = "起局时间2026年8月30日20时，阳遁三局；一宫天盘庚、坎宫天盘庚，二宫天盘戊、坤宫天盘戊，三宫天盘己、震宫天盘己。";
  const source = [fakeLayout, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = [
    { kind: "CHART_TIME" as const, value: "2026年8月30日20时", quote: fakeLayout },
    { kind: "YIN_YANG_BUREAU" as const, value: "阳遁三局", quote: fakeLayout },
    { kind: "PALACE_LAYOUT" as const, value: "一宫天盘庚、坎宫天盘庚，二宫天盘戊、坤宫天盘戊，三宫天盘己、震宫天盘己", quote: fakeLayout },
    { kind: "DUTY_STAR" as const, value: "天盘", quote: fakeLayout },
  ];
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ chartFacts: facts, evidence: { sourceBlockQuote: source, chartQuote: fakeLayout, assetQuote, directionQuote, windowQuote, stemsQuote } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /多宫结构|可验证/);
});

test("九宫各写一个天干仍不是完整盘面结构", () => {
  const thinLayout = "坎宫甲，坤宫乙，震宫丙，巽宫丁，中宫戊，乾宫己，兑宫庚，艮宫辛，离宫壬";
  const fakeChart = `起局时间2026年8月30日20时，阳遁三局；${thinLayout}。`;
  const source = [fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = [
    { kind: "CHART_TIME" as const, value: "2026年8月30日20时", quote: fakeChart },
    { kind: "YIN_YANG_BUREAU" as const, value: "阳遁三局", quote: fakeChart },
    { kind: "PALACE_LAYOUT" as const, value: thinLayout, quote: fakeChart },
    { kind: "DAY_STEM" as const, value: "甲", quote: "日干甲。" },
  ];
  const block = `${source}\n日干甲。`;
  const report = buildQimenLessonExtractionReport({
    transcript: block,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ chartFacts: facts, evidence: { sourceBlockQuote: block, chartQuote: fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /结构化宫位|多宫结构|可验证/);
});

test("九个宫名不能共享末尾同一组盘面字段", () => {
  const sharedFields = "坎宫坤宫震宫巽宫中宫乾宫兑宫艮宫离宫天盘庚地盘戊开门天心九天";
  const fakeChart = `起局时间2026年8月30日20时，阳遁三局；${sharedFields}。`;
  const source = [fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = [
    { kind: "CHART_TIME" as const, value: "2026年8月30日20时", quote: fakeChart },
    { kind: "YIN_YANG_BUREAU" as const, value: "阳遁三局", quote: fakeChart },
    { kind: "PALACE_LAYOUT" as const, value: sharedFields, quote: fakeChart },
    { kind: "DAY_STEM" as const, value: "甲", quote: "日干甲。" },
  ];
  const block = `${source}\n日干甲。`;
  const report = buildQimenLessonExtractionReport({
    transcript: block,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ chartFacts: facts, evidence: { sourceBlockQuote: block, chartQuote: fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /结构化宫位|多宫结构|可验证/);
});

test("并非天盘等否定字段不能靠正则子串伪装完整九宫盘", () => {
  const deniedLayout = palaceLayout.replaceAll("天盘", "并非天盘");
  const fakeChart = `起局时间2026年8月30日20时，阳遁三局，值符天心，值使开门；${deniedLayout}。`;
  const source = [fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = chartFacts.map((fact) => fact.kind === "PALACE_LAYOUT"
    ? { ...fact, value: deniedLayout, quote: fakeChart }
    : { ...fact, quote: fakeChart });
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ chartFacts: facts, evidence: { sourceBlockQuote: source, chartQuote: fakeChart, assetQuote, directionQuote, windowQuote, stemsQuote } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /否定|错误示例|可验证/);
});

test("BTC盘不能混入ETH方向或ETH适用窗口", () => {
  const ethDirection = "综合判断ETH未来上涨，多头走强。";
  const ethWindow = "ETH适用时间为2026年8月30日至2026年9月3日。";
  const source = [chartQuote, assetQuote, ethDirection, ethWindow, stemsQuote].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ evidence: {
      sourceBlockQuote: source,
      chartQuote,
      assetQuote,
      directionQuote: ethDirection,
      windowQuote: ethWindow,
      stemsQuote,
    } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /方向原文|适用窗口原文/);
});

test("同时提到BTC和ETH的相对观点及可能性措辞都不能归成BTC确定方向", () => {
  const ambiguousDirection = "BTC与ETH相比，ETH更看涨。";
  const ambiguousWindow = "BTC和ETH中，2026年8月30日至2026年9月3日只适用于ETH。";
  const source = [chartQuote, assetQuote, ambiguousDirection, ambiguousWindow, stemsQuote].join("\n");
  const uncertainDirection = "BTC未来可能上涨，尚待确认。";
  const uncertainSource = transcript.replace(directionQuote, uncertainDirection);
  const report = buildQimenLessonExtractionReport({
    transcript: `${source}\n---\n${uncertainSource}`,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [
      objectDraft({ evidence: { sourceBlockQuote: source, chartQuote, assetQuote, directionQuote: ambiguousDirection, windowQuote: ambiguousWindow, stemsQuote } }),
      objectDraft({ evidence: { ...objectDraft().evidence, sourceBlockQuote: uncertainSource, directionQuote: uncertainDirection } }),
    ] },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 2);
  assert.match(report.rejected.map((item) => item.reason).join("|"), /歧义|可能性措辞/);
});

test("同一BTC课程里的两张盘不能跨盘拼接方向和窗口", () => {
  const secondLayout = palaceLayout.replaceAll("天盘庚", "天盘甲");
  const secondChart = `起局时间2026年8月31日08时，阴遁二局，值符天任，值使生门；${secondLayout}。`;
  const secondDirection = "综合判断BTC未来上涨，多头走强。";
  const secondWindow = "BTC适用时间为2026年8月31日至2026年9月3日。";
  const source = [chartQuote, secondChart, assetQuote, secondDirection, secondWindow, stemsQuote].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      applicableFrom: "2026-08-31",
      evidence: { sourceBlockQuote: source, chartQuote, assetQuote, directionQuote: secondDirection, windowQuote: secondWindow, stemsQuote },
    })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /多个.*盘签名|跨盘/);
});

test("三结果宫不能只靠宫号把下跌宫冒充上涨宫或把买入宫冒充震荡宫", () => {
  const wrongUp = "下跌宫为三宫。";
  const wrongDown = "上涨宫为六宫。";
  const wrongSideways = "买入宫为九宫。";
  const source = [chartQuote, assetQuote, directionQuote, windowQuote, stemsQuote,
    "问题是BTC周走势。", wrongUp, wrongDown, wrongSideways].join("\n");
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [directionalDraft({ evidence: {
      ...directionalDraft().evidence,
      sourceBlockQuote: source,
      upPalaceQuote: wrongUp,
      downPalaceQuote: wrongDown,
      sidewaysPalaceQuote: wrongSideways,
    } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /上涨标签|下跌标签|震荡标签/);
});

test("门神不能冒充天干用神，辅助用神也必须逐字且不能与主用神重复", () => {
  const invalidKind = "BTC产品主用神为开门，辅助用神为九天。";
  const kindSource = transcript.replace(stemsQuote, invalidKind);
  const missingSecondary = "BTC产品主用神为庚。";
  const missingSource = transcript.replace(stemsQuote, missingSecondary);
  const duplicate = "BTC产品主用神为庚，辅助用神也为庚。";
  const duplicateSource = transcript.replace(stemsQuote, duplicate);
  const report = buildQimenLessonExtractionReport({
    transcript: `${kindSource}\n---\n${missingSource}\n---\n${duplicateSource}`,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [
      objectDraft({ primaryStems: ["开门" as never], secondaryStems: ["九天" as never], evidence: { ...objectDraft().evidence, sourceBlockQuote: kindSource, stemsQuote: invalidKind } }),
      objectDraft({ secondaryStems: ["戊"], evidence: { ...objectDraft().evidence, sourceBlockQuote: missingSource, stemsQuote: missingSecondary } }),
      objectDraft({ primaryStems: ["庚"], secondaryStems: ["庚"], evidence: { ...objectDraft().evidence, sourceBlockQuote: duplicateSource, stemsQuote: duplicate } }),
    ] },
  });
  assert.equal(report.accepted.length, 0);
  assert.ok(report.modelStatus === "INVALID_MODEL_OUTPUT" || report.rejected.length >= 2);
});

test("假设或示例里的方向时间窗用神和问题不能冒充真实前瞻读数", () => {
  const hypotheticalDirection = "假设BTC未来上涨，仅作条件推演。";
  const hypotheticalWindow = "例如BTC适用时间为2026年8月30日至2026年9月3日。";
  const hypotheticalStems = "仅作演示：BTC产品主用神为庚，辅助用神为戊。";
  const objectSource = transcript
    .replace(directionQuote, hypotheticalDirection)
    .replace(windowQuote, hypotheticalWindow)
    .replace(stemsQuote, hypotheticalStems);
  const hypotheticalQuestion = "举例问题是BTC周走势。";
  const directionalSource = transcript.replace("问题是BTC周走势。", hypotheticalQuestion);
  const report = buildQimenLessonExtractionReport({
    transcript: `${objectSource}\n---\n${directionalSource}`,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [
      objectDraft({ evidence: { sourceBlockQuote: objectSource, chartQuote, assetQuote, directionQuote: hypotheticalDirection, windowQuote: hypotheticalWindow, stemsQuote: hypotheticalStems } }),
      directionalDraft({ evidence: { ...directionalDraft().evidence, sourceBlockQuote: directionalSource, questionQuote: hypotheticalQuestion } }),
    ] },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 2);
  assert.ok(report.rejected.every((item) => /假设|示例/.test(item.reason)));
});

test("ASCII资产代码必须有字母数字边界，METHOD不能当ETH且ABSOLUTE不能当SOL", () => {
  const cases = [
    { marketCode: "ETH" as const, fakeAsset: "METHOD" },
    { marketCode: "SOL" as const, fakeAsset: "ABSOLUTE" },
  ];
  const drafts = cases.map(({ marketCode, fakeAsset }) => {
    const fakeAssetQuote = `本次看${fakeAsset}未来走势。`;
    const fakeDirection = `${fakeAsset}未来上涨，多头走强。`;
    const fakeWindow = `${fakeAsset}适用时间为2026年8月30日至2026年9月3日。`;
    const fakeStems = `${fakeAsset}产品主用神为庚，辅助用神为戊。`;
    const source = [chartQuote, fakeAssetQuote, fakeDirection, fakeWindow, fakeStems].join("\n");
    return objectDraft({
      marketCode,
      evidence: { sourceBlockQuote: source, chartQuote, assetQuote: fakeAssetQuote, directionQuote: fakeDirection, windowQuote: fakeWindow, stemsQuote: fakeStems },
    });
  });
  const report = buildQimenLessonExtractionReport({
    transcript: drafts.map((draft) => draft.evidence.sourceBlockQuote).join("\n---\n"),
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts },
  });
  assert.equal(report.accepted.length, 0);
  assert.equal(report.rejected.length, 2);
  assert.ok(report.rejected.every((item) => /资产/.test(item.reason)));
});

test("十一宫到十九宫不能通过子串伪装成一宫到九宫", () => {
  const falsePalaces = Array.from({ length: 9 }, (_, index) => {
    const number = ["十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九"][index];
    return `${number}宫天盘庚地盘戊开门天心九天`;
  }).join("，");
  const falseChart = `起局时间2026年8月30日20时，阳遁三局，值符天心，值使开门；${falsePalaces}。`;
  const source = [falseChart, assetQuote, directionQuote, windowQuote, stemsQuote].join("\n");
  const facts = chartFacts.map((fact) => fact.kind === "PALACE_LAYOUT"
    ? { ...fact, value: falsePalaces, quote: falseChart }
    : { ...fact, quote: falseChart });
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({ chartFacts: facts, evidence: { sourceBlockQuote: source, chartQuote: falseChart, assetQuote, directionQuote, windowQuote, stemsQuote } })] },
  });
  assert.equal(report.accepted.length, 0);
  assert.match(report.rejected[0]?.reason ?? "", /结构化宫位/);
});

test("无模型或非法模型输出绝不启用启发式奇门结论", () => {
  const notApplicable = buildQimenLessonExtractionReport({
    transcript: "这是一节与奇门无关的普通课程原文。",
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "NOT_APPLICABLE",
  });
  assert.equal(notApplicable.modelStatus, "NOT_APPLICABLE");
  assert.deepEqual(notApplicable.accepted, []);
  const unavailable = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "MODEL_UNAVAILABLE",
  });
  assert.deepEqual(unavailable.accepted, []);
  const invalid = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { direction: "UP" },
  });
  assert.equal(invalid.modelStatus, "INVALID_MODEL_OUTPUT");
  assert.deepEqual(invalid.accepted, []);
});

test("存量补抽轮转失败课程且只替换奇门字段，并拒绝另一原文的报告", () => {
  const failed = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T10:00:00.000Z",
    modelStatus: "MODEL_FAILED",
  });
  const replacement = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const rows = [
    { id: "old-a", status: "APPROVED", rawTranscript: transcript, qimenShadowExtraction: failed, updatedAt: "2026-08-30T01:00:00.000Z" },
    { id: "old-b", status: "APPROVED", rawTranscript: transcript, qimenShadowExtraction: failed, updatedAt: "2026-08-30T02:00:00.000Z" },
  ];
  assert.equal(selectQimenOnlyBackfillRows(rows, ["APPROVED"], 1, new Date(0))[0]?.id, "old-a");
  const rotated = rows.map((row) => row.id === "old-a" ? { ...row, updatedAt: "2026-08-30T03:00:00.000Z" } : row);
  assert.equal(selectQimenOnlyBackfillRows(rotated, ["APPROVED"], 1, new Date(0))[0]?.id, "old-b");

  const teacherCurrent = { ...rows[0]!, summary: "原摘要", cleanedTranscript: "原清洗文", version: 7 };
  const teacherNext = applyTeacherQimenOnlyBackfill({
    current: teacherCurrent,
    allowedStatuses: ["APPROVED"],
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: replacement,
    updatedAt: "2026-08-30T03:00:00.000Z",
  });
  assert.equal(teacherNext?.status, teacherCurrent.status);
  assert.equal(teacherNext?.summary, teacherCurrent.summary);
  assert.equal(teacherNext?.cleanedTranscript, teacherCurrent.cleanedTranscript);
  assert.deepEqual(teacherNext?.qimenShadowExtraction, replacement);

  const wrongReport = buildQimenLessonExtractionReport({
    transcript: `${transcript}\n另一课`,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "NOT_APPLICABLE",
  });
  assert.equal(applyTeacherQimenOnlyBackfill({
    current: teacherCurrent,
    allowedStatuses: ["APPROVED"],
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: wrongReport,
    updatedAt: "2026-08-30T03:00:00.000Z",
  }), null);

  const masterCurrent = {
    status: "PUBLISHED",
    lessonOutputJson: { summary: "旧课程结论", qimenShadow: failed },
    updatedAt: "2026-08-30T01:00:00.000Z",
  };
  const masterNext = applyMasterQimenOnlyBackfill({
    current: masterCurrent,
    lessonStatus: "PUBLISHED",
    allowedStatuses: ["REVIEWING", "PUBLISHED"],
    rawTranscript: transcript,
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: replacement,
    updatedAt: "2026-08-30T03:00:00.000Z",
  });
  assert.equal(masterNext?.status, masterCurrent.status);
  assert.equal((masterNext?.lessonOutputJson as { summary?: string }).summary, "旧课程结论");
  assert.deepEqual((masterNext?.lessonOutputJson as { qimenShadow?: unknown }).qimenShadow, replacement);
  const outcomeHistory = (masterNext?.lessonOutputJson as { qimenShadowOutcomeHistory?: Array<{ modelStatus?: string }> }).qimenShadowOutcomeHistory;
  assert.equal(outcomeHistory?.length, 1);
  assert.equal(outcomeHistory?.[0]?.modelStatus, "MODEL_FAILED");
});

test("连续100次相同模型失败不写主报告或扩张历史，成功与失败交错最终只能保留成功", () => {
  const failed = buildQimenLessonExtractionReport({ transcript, generatedAt: "2026-08-30T10:00:00.000Z", modelStatus: "MODEL_FAILED" });
  const success = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const current = { status: "APPROVED", rawTranscript: transcript, qimenShadowExtraction: failed, updatedAt: "2026-08-30T01:00:00.000Z", summary: "保持" };
  for (let index = 0; index < 100; index += 1) {
    assert.equal(applyTeacherQimenOnlyBackfill({
      current,
      allowedStatuses: ["APPROVED"],
      expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
      report: failed,
      updatedAt: new Date(index * 1_000).toISOString(),
    }), null);
  }
  const succeeded = applyTeacherQimenOnlyBackfill({
    current,
    allowedStatuses: ["APPROVED"],
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: success,
    updatedAt: "2026-08-30T12:11:00.000Z",
  });
  assert.deepEqual(succeeded?.qimenShadowExtraction, success);
  assert.equal(applyTeacherQimenOnlyBackfill({
    current: succeeded!,
    allowedStatuses: ["APPROVED"],
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: failed,
    updatedAt: "2026-08-30T12:12:00.000Z",
  }), null);
});

test("NOT_APPLICABLE是同一原文的稳定终态，写入后不再永久补抽且不能降级EXTRACTED", () => {
  const terminal = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "NOT_APPLICABLE",
  });
  const current = { status: "APPROVED", rawTranscript: transcript, qimenShadowExtraction: null, updatedAt: "2026-08-30T01:00:00.000Z" };
  const saved = applyTeacherQimenOnlyBackfill({
    current,
    allowedStatuses: ["APPROVED"],
    expectedTranscriptSha256: qimenLessonTranscriptSha256(transcript),
    report: terminal,
    updatedAt: "2026-08-30T12:11:00.000Z",
  });
  assert.equal(saved?.qimenShadowExtraction, terminal);
  assert.equal(qimenReportNeedsBackfill(terminal, qimenLessonTranscriptSha256(transcript)), false);
  assert.equal(qimenReportNeedsBackfill(terminal, qimenLessonTranscriptSha256(`${transcript}\n新原文`)), true);
});

test("已存在读数不消耗新样本额度，第七课仍可进入本轮", () => {
  const candidates = Array.from({ length: 14 }, (_, index) => ({ signature: `lesson-${Math.floor(index / 2) + 1}|school-${index % 2}`, index }));
  const existing = new Set(candidates.slice(0, 12).map((candidate) => candidate.signature));
  const selected = selectNovelQimenLessonCandidates({ candidates, existingSignatures: existing, limit: 12 });
  assert.deepEqual(selected.map((candidate) => candidate.index), [12, 13]);
});

test("每日同一时刻运行时40个永久失败补抽项能被完整轮转覆盖", () => {
  const failed = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T10:00:00.000Z",
    modelStatus: "MODEL_FAILED",
  });
  const rows = Array.from({ length: 40 }, (_, index) => ({
    id: `failed-${index}`,
    status: "APPROVED",
    rawTranscript: transcript,
    qimenShadowExtraction: failed,
    updatedAt: new Date(index * 1_000).toISOString(),
  }));
  const seen = new Set<string>();
  for (let day = 0; day < 4; day += 1) {
    const serverNow = new Date(new Date("2026-08-30T08:20:00.000Z").getTime() + day * 24 * 60 * 60_000);
    const batch = selectQimenOnlyBackfillRows(rows, ["APPROVED"], 12, serverNow);
    assert.ok(batch.length <= 12);
    batch.forEach((candidate) => seen.add(candidate.id));
  }
  assert.equal(seen.size, 40);
});

test("20个较新的无效报告不能挤掉第21个较旧有效报告", () => {
  const invalid = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:00:00.000Z",
    modelStatus: "MODEL_FAILED",
  });
  const valid = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T11:00:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const rows = [
    ...Array.from({ length: 20 }, (_, index) => ({ id: `invalid-${index}`, report: invalid })),
    { id: "valid-21", report: valid },
  ];
  const selected = selectValidExtractedQimenRows({ rows, reportOf: (row) => row.report, limit: 20 });
  assert.deepEqual(selected.map((row) => row.id), ["valid-21"]);
});

test("100个已过期有效报告不能在分页前挤掉一个新前瞻报告", () => {
  const expired = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-20T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const fresh = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const rows = [
    ...Array.from({ length: 100 }, (_, index) => ({ id: `expired-${index}`, report: expired })),
    { id: "fresh-forward", report: fresh },
  ];
  const selected = selectValidExtractedQimenRows({
    rows,
    reportOf: (row) => row.report,
    limit: 10,
    serverNow: new Date("2026-08-30T12:30:00.000Z"),
  });
  assert.deepEqual(selected.map((row) => row.id), ["fresh-forward"]);
});

test("周日提取的下周材料把决策时间安排到周一窗口起点，仍可形成前瞻读数", () => {
  const nextWeekWindow = "BTC适用时间为2026年8月31日至2026年9月4日。";
  const source = transcript.replace(windowQuote, nextWeekWindow);
  const report = buildQimenLessonExtractionReport({
    transcript: source,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft({
      applicableFrom: "2026-08-31",
      applicableUntil: "2026-09-04",
      evidence: { ...objectDraft().evidence, sourceBlockQuote: source, windowQuote: nextWeekWindow },
    })] },
  });
  assert.equal(report.accepted.length, 1);
  const plan = planQimenLessonReading({
    lessonId: "next-week-lesson",
    ...sourceMeta,
    reportGeneratedAt: report.generatedAt,
    draft: report.accepted[0]!,
    formal: formal({ periodStart: "2026-08-31", periodEnd: "2026-09-04" }),
  });
  assert.equal(plan.reading.decisionAt, "2026-08-30T16:00:00.000Z");
  assert.ok(Date.parse(plan.reading.reading.recordedAt) < Date.parse(plan.reading.decisionAt));
});

test("每来源独立十条公平分页，前20条已处理时第21条第三轮必被扫描", () => {
  const valid = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T11:00:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const masterRows = Array.from({ length: 30 }, (_, index) => ({ id: `master-${index + 1}`, report: valid }));
  const teacherRows = [{ id: "teacher-old", report: valid }];
  const seen = new Set<string>();
  for (let round = 0; round < 3; round += 1) {
    const serverNow = new Date(new Date("2026-08-30T11:05:00.000Z").getTime() + round * 5 * 60_000);
    selectValidExtractedQimenRows({ rows: masterRows, reportOf: (row) => row.report, limit: 10, serverNow })
      .forEach((row) => seen.add(row.id));
    const teacherBatch = selectValidExtractedQimenRows({ rows: teacherRows, reportOf: (row) => row.report, limit: 10, serverNow });
    assert.deepEqual(teacherBatch.map((row) => row.id), ["teacher-old"]);
  }
  assert.ok(seen.has("master-21"));
});

test("旧课程中心以AI实际读取的raw原文计算版本哈希，不能误用clean文本", () => {
  const raw = "原始口语：BTC完整奇门盘。";
  const clean = "BTC完整奇门盘";
  const report = buildQimenLessonExtractionReport({
    transcript: raw,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "NOT_APPLICABLE",
  });
  assert.equal(report.transcriptSha256, qimenLessonTranscriptSha256(raw));
  assert.notEqual(report.transcriptSha256, qimenLessonTranscriptSha256(clean));
});

test("两种课程读数绑定同一锁定正式版本和同一事前窗口，但保留独立来源", () => {
  const report = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft(), directionalDraft()] },
  });
  const left = planQimenLessonReading({ lessonId: "lesson-object", ...sourceMeta, reportGeneratedAt: report.generatedAt, draft: report.accepted[0]!, formal: formal() });
  const right = planQimenLessonReading({ lessonId: "lesson-palace", ...sourceMeta, reportGeneratedAt: report.generatedAt, draft: report.accepted[1]!, formal: formal() });
  assert.equal(left.reading.studyKey, right.reading.studyKey);
  assert.notEqual(left.reading.readingId, right.reading.readingId);
  assert.equal(left.reading.decisionAt, "2026-08-30T13:00:00.000Z");
  assert.equal(left.reading.evaluationDueAt, "2026-08-31T13:00:00.000Z");
  assert.equal(left.reading.reading.sourceId, "lesson:lesson-object");
  assert.equal(right.reading.reading.sourceId, "lesson:lesson-palace");
  assert.equal(left.reading.sourceEvidence?.transcriptSha256, sourceMeta.sourceTranscriptSha256);
  assert.equal(left.reading.sourceEvidence?.reportSha256, sourceMeta.sourceReportSha256);
  assert.ok(left.reading.sourceEvidence?.exactQuotes.includes(chartQuote));
});

test("课程周期、标的、正式层级或观察有效期不一致时不能生成读数", () => {
  const report = buildQimenLessonExtractionReport({
    transcript,
    generatedAt: "2026-08-30T12:10:00.000Z",
    modelStatus: "EXTRACTED",
    modelOutput: { drafts: [objectDraft()] },
  });
  const draft = report.accepted[0]!;
  assert.throws(() => planQimenLessonReading({ lessonId: "l1", ...sourceMeta, reportGeneratedAt: report.generatedAt, draft, formal: formal({ marketCode: "ETH" }) }), /标的/);
  assert.throws(() => planQimenLessonReading({ lessonId: "l1", ...sourceMeta, reportGeneratedAt: report.generatedAt, draft, formal: formal({ kind: "DAILY" }) }), /层级/);
  assert.throws(() => planQimenLessonReading({ lessonId: "l1", ...sourceMeta, reportGeneratedAt: report.generatedAt, draft, formal: formal({ periodEnd: "2026-08-30" }) }), /有效期/);
});
