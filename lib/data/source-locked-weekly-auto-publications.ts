import { BTC_AUXILIARY_WEEKLY_LIUYAO_20260820 } from "@/lib/data/crypto-liuyao-supplement-20260820";
import { VERIFIED_CYCLE_EVIDENCE } from "@/lib/data/cycle-evidence-coverage";
import { ETH_SEPTEMBER_WEEKLY_REVISIONS_20260823 } from "@/lib/data/conviction/crypto-september-revisions-20260823";
import { US_INDEX_WEEKLY_REVISIONS_20260825 } from "@/lib/data/conviction/focus-weekly-revisions-20260825";
import { findTeacherPriorityLiuyaoSource } from "@/lib/data/teacher-priority-liuyao-20260821";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { WeeklyAnalysisRecord, WeeklyOverallDirection } from "@/types/weekly-analysis";

const CORE_META = {
  bitcoin: { assetName: "比特币", symbol: "BTC", displaySymbol: "BTC" },
  eth: { assetName: "以太坊", symbol: "ETH", displaySymbol: "ETH" },
  sp500: { assetName: "标普500", symbol: "SPX", displaySymbol: "SPX" },
  "nasdaq-100": { assetName: "纳斯达克100", symbol: "NDX", displaySymbol: "NDX" },
  "shanghai-composite": { assetName: "上证指数", symbol: "000001.SS", displaySymbol: "SHCOMP" },
  "hang-seng": { assetName: "恒生科技", symbol: "HSTECH", displaySymbol: "HSTECH" },
} as const;

function probabilities(direction: WeeklyOverallDirection) {
  if (direction === "上涨") return { up: 55, flat: 28, down: 17 };
  if (direction === "震荡上涨") return { up: 46, flat: 36, down: 18 };
  if (direction === "先跌后涨" || direction === "探底回升") return { up: 41, flat: 34, down: 25 };
  if (direction === "先涨后跌" || direction === "冲高回落") return { up: 30, flat: 34, down: 36 };
  if (direction === "震荡下跌") return { up: 20, flat: 39, down: 41 };
  if (direction === "下跌") return { up: 16, flat: 29, down: 55 };
  return { up: 27, flat: 48, down: 25 };
}

function normalizeRiskLevel(riskLevel: string): WeeklyAnalysisRecord["riskLevel"] {
  if (riskLevel === "低") return "低";
  if (riskLevel === "中等") return "中等";
  if (riskLevel === "中高") return "中高";
  return "高";
}

function fromConviction(forecast: ConvictionPeriodForecast): WeeklyAnalysisRecord | null {
  const meta = CORE_META[forecast.assetId as keyof typeof CORE_META];
  if (!meta || forecast.status !== "published" || !forecast.publishedAt || !forecast.lockedAt) return null;
  if (forecast.publishedAt >= `${forecast.periodStart}T00:00:00+08:00` || forecast.lockedAt >= `${forecast.periodStart}T00:00:00+08:00`) return null;
  const direction = forecast.direction as WeeklyOverallDirection;
  return {
    id: `AUTO-WEEKLY-${forecast.id}`,
    assetId: forecast.assetId,
    ...meta,
    weekStart: forecast.periodStart,
    weekEnd: forecast.periodEnd,
    overallDirection: direction,
    weeklyPath: forecast.expectedPath,
    headline: forecast.summary,
    probabilities: probabilities(direction),
    strongWindow: direction === "先跌后涨" ? "中后段止跌与修复确认窗口" : "顺正式周方向运行、且收盘结构确认的阶段",
    weakWindow: direction === "先跌后涨" ? "周初阻滞与下探阶段" : "方向与收盘结构不一致时",
    basisWeights: {
      technical: 10, liuyao: 80, cycle: 10, qimen: 0, macro: 0, bazi: 0,
      note: "完整独立周卦负责正式方向；技术仅复核位置与兑现程度，奇门缺失时不补造。",
    },
    invalidation: forecast.invalidationLevel ?? "若本周主要运行顺序与正式周卦连续背离，停止新增方向敞口并进入周复盘；不回写本版本。",
    confirmation: forecast.confirmationLevel ?? "以实际收盘K线确认周内顺序与转折，不用盘中单根波动改写正式方向。",
    catalysts: forecast.catalysts,
    risks: forecast.risks,
    riskLevel: normalizeRiskLevel(forecast.riskLevel),
    confidence: Math.max(50, Math.min(82, 48 + (forecast.consensusStars ?? 2) * 6)),
    publishedAt: forecast.publishedAt,
    updatedAt: forecast.lockedAt,
    status: "published",
    visibility: "member",
    sourceIds: [forecast.id],
    sourceOpinions: [{
      sourceKey: "USER_LIUYAO",
      sourceRecordId: forecast.id,
      role: "DIRECTION",
      direction,
      path: forecast.expectedPath,
      lockedAt: forecast.lockedAt,
    }],
    version: forecast.version,
    originalLocked: true,
  };
}

function bitcoinPublication(): WeeklyAnalysisRecord | null {
  const week = BTC_AUXILIARY_WEEKLY_LIUYAO_20260820.find((item) =>
    item.periodStart === "2026-08-31" && item.periodEnd === "2026-09-06"
  );
  const teacher = findTeacherPriorityLiuyaoSource("BTC", "2026-09-01");
  if (!week || !teacher?.lockedAt || !teacher.publishedAt) return null;
  const direction: WeeklyOverallDirection = "震荡上涨";
  return {
    id: "AUTO-WEEKLY-BTC-20260831-V1",
    assetId: "bitcoin", ...CORE_META.bitcoin,
    weekStart: week.periodStart, weekEnd: week.periodEnd,
    overallDirection: direction,
    weeklyPath: "周初先消化8月末高位压力并允许回踩；若承接没有继续恶化，中后段按老师申月主方向恢复震荡上行。接近8万至8.5万美元只看作高压区，不追高。",
    headline: "BTC周初先验压力与申月偏多阶段冲突：先防回踩，再看能否恢复震荡上行。",
    probabilities: { up: 41, flat: 39, down: 20 },
    strongWindow: "回踩后重新收回周内结构、且成交承接恢复的阶段",
    weakWindow: "周初及接近8万至8.5万美元的兑现压力区",
    basisWeights: {
      technical: 10, liuyao: 80, cycle: 10, qimen: 0, macro: 0, bazi: 0,
      note: "老师申月原始阶段卦优先；用户完整周卦的偏弱证据作为周初路径和风险约束，分歧不隐藏。",
    },
    keyDates: [{ date: "2026-09-06", label: "申月尾部与周末复盘窗口", expectedEffect: "波动放大", sources: ["LIUYAO"], confidence: 55, note: "只作阶段交接观察，不写成确定反转日。" }],
    invalidation: "若周初跌破并连续无法收回关键结构，申月震荡上行在本周的执行权限暂停，转入复盘；若有效站稳8.5万美元并回踩承接，则上方受限判断失效。",
    confirmation: "以已收盘4H/日线检查‘该涨是否上涨’；未兑现时停止新增多仓，不自动反手。",
    catalysts: ["老师申月子孙生财的恢复背景"],
    risks: [week.riskNote, teacher.riskSummary],
    riskLevel: "高", confidence: 58,
    publishedAt: teacher.publishedAt, updatedAt: teacher.lockedAt,
    status: "published", visibility: "member",
    sourceIds: [teacher.id, week.id],
    sourceOpinions: [
      { sourceKey: "BINGWU_LIUYAO", sourceRecordId: teacher.id, role: "DIRECTION", direction: teacher.weeklyDirection as WeeklyOverallDirection, path: teacher.weeklyPath, lockedAt: teacher.lockedAt },
      { sourceKey: "USER_LIUYAO", sourceRecordId: week.id, role: "DIRECTION", direction: week.direction, path: week.expectedPath, lockedAt: week.lockedAt },
    ],
    version: 1, originalLocked: true,
  };
}

function bitcoinSeptemberSecondWeekPublication(): WeeklyAnalysisRecord | null {
  const week = BTC_AUXILIARY_WEEKLY_LIUYAO_20260820.find((item) =>
    item.periodStart === "2026-09-07" && item.periodEnd === "2026-09-14"
  );
  const teacher = findTeacherPriorityLiuyaoSource("BTC", "2026-09-07");
  if (!week || !teacher?.lockedAt || !teacher.publishedAt) return null;
  const direction: WeeklyOverallDirection = "震荡上涨";
  return {
    id: "AUTO-WEEKLY-BTC-20260907-V1",
    assetId: "bitcoin", ...CORE_META.bitcoin,
    weekStart: "2026-09-07", weekEnd: "2026-09-13",
    overallDirection: direction,
    weeklyPath: "前段仍会反复，随后更容易修复抬升；9月9日至11日进入变盘与高压观察窗，冲高后防回吐，不按强趋势周处理。",
    headline: "BTC 9月第二周偏弱修复上涨：方向偏多，但9月9日至11日重点防高位兑现。",
    probabilities: { up: 43, flat: 39, down: 18 },
    strongWindow: "前段回踩不再破低、随后收回周内结构的修复阶段",
    weakWindow: "9月9日至11日变盘窗及接近8万至8.5万美元的兑现压力区",
    basisWeights: {
      technical: 10, liuyao: 80, cycle: 10, qimen: 0, macro: 0, bazi: 0,
      note: "老师专项阶段卦覆盖至9月10日，用户完整周卦覆盖9月7日至14日；正式周报告只截取两者共同支持且完全被周卦覆盖的9月7日至13日，不补造日卦。",
    },
    keyDates: [{
      date: "2026-09-10",
      label: "9月9日至11日高压/变盘观察窗",
      expectedEffect: "冲高回落",
      sources: ["LIUYAO"],
      confidence: 58,
      note: "9月10日是窗口中心，不是保证形成最终高点的精确日。",
    }],
    invalidation: "若周初持续破低且无法收回关键结构，震荡上涨的执行权限暂停；若有效站稳8.5万美元并回踩有承接，高压受限判断失效。",
    confirmation: "以已收盘4H和日线确认修复路径；该涨不涨时停止新增多仓并复盘，不自动反手。",
    catalysts: ["兄弟化财的弱修复结构", "老师专项阶段卦仍保留9月10日前上行背景"],
    risks: [week.riskNote, teacher.riskSummary, "周卦原始覆盖至9月14日；本报告按标准自然周只展示至9月13日，未改写原始记录。"],
    riskLevel: "高", confidence: 60,
    publishedAt: teacher.publishedAt, updatedAt: teacher.lockedAt,
    status: "published", visibility: "member",
    sourceIds: [teacher.id, week.id],
    sourceOpinions: [
      { sourceKey: "BINGWU_LIUYAO", sourceRecordId: teacher.id, role: "DIRECTION", direction: teacher.weeklyDirection as WeeklyOverallDirection, path: teacher.weeklyPath, lockedAt: teacher.lockedAt },
      { sourceKey: "USER_LIUYAO", sourceRecordId: week.id, role: "DIRECTION", direction: week.direction, path: week.expectedPath, lockedAt: week.lockedAt },
    ],
    version: 1, originalLocked: true,
  };
}

type EvidenceInterpretation = {
  evidenceId: string;
  direction: WeeklyOverallDirection;
  headline: string;
  path: string;
  risk: string;
};

const EVIDENCE_INTERPRETATIONS: readonly EvidenceInterpretation[] = [
  {
    evidenceId: "USER-SHCOMP-20260831-0906-LIUYAO", direction: "震荡",
    headline: "上证困六合静卦：方向不宜激进，先按区间消化与承接确认处理。",
    path: "周初延续困局与反复换手 → 中段观察承接能否稳定 → 周后段仍以区间震荡为主；没有动爻，不补造单边突破。",
    risk: "老师阶段背景仍偏上，但本周静卦缺少主动推进动爻；不把阶段看涨直接复制成单边周涨。",
  },
  {
    evidenceId: "USER-HSTECH-20260831-0906-LIUYAO", direction: "震荡下跌",
    headline: "恒生科技遁化恒：先退守、后反复稳定，周内重心暂偏弱。",
    path: "前段先回撤或退守 → 中段弱反弹与换手 → 后段观察能否稳定；恒卦只表示状态延续，不直接等于上涨。",
    risk: "原始六爻明细尚未结构化到逐爻字段，方向置信度降低；技术层只能阻断或确认，不能自行翻多。",
  },
] as const;

function fromVerifiedEvidence(input: EvidenceInterpretation): WeeklyAnalysisRecord | null {
  const evidence = VERIFIED_CYCLE_EVIDENCE.find((item) => item.id === input.evidenceId && item.horizon === "WEEK");
  if (!evidence || evidence.verifiedAt >= `${evidence.periodStart}T00:00:00+08:00`) return null;
  const meta = CORE_META[evidence.assetId as keyof typeof CORE_META];
  if (!meta) return null;
  return {
    id: `AUTO-WEEKLY-${evidence.id}`,
    assetId: evidence.assetId, ...meta,
    weekStart: evidence.periodStart, weekEnd: evidence.periodEnd,
    overallDirection: input.direction, weeklyPath: input.path, headline: input.headline,
    probabilities: probabilities(input.direction),
    strongWindow: "真实收盘结构与周卦路径一致后",
    weakWindow: "周初与方向尚未确认阶段",
    basisWeights: { technical: 10, liuyao: 80, cycle: 10, qimen: 0, macro: 0, bazi: 0, note: "已核验周卦负责方向；缺失逐爻结构时降低置信，不补造动爻。" },
    invalidation: "若实际收盘路径连续否定本周判断，停止新增敞口并生成新版复盘提案；旧版本保持不变。",
    confirmation: "每日收盘复盘路径，周末按完整周走势验证。",
    risks: [input.risk], riskLevel: "高", confidence: 52,
    publishedAt: evidence.verifiedAt, updatedAt: evidence.verifiedAt,
    status: "published", visibility: "member", sourceIds: [evidence.id],
    sourceOpinions: [{ sourceKey: "USER_LIUYAO", sourceRecordId: evidence.id, role: "DIRECTION", direction: input.direction, path: input.path, lockedAt: evidence.verifiedAt }],
    version: 1, originalLocked: true,
  };
}

export function buildSourceLockedAutoWeeklyPublications(): WeeklyAnalysisRecord[] {
  const direct = [...ETH_SEPTEMBER_WEEKLY_REVISIONS_20260823, ...US_INDEX_WEEKLY_REVISIONS_20260825]
    .map(fromConviction)
    .filter((item): item is WeeklyAnalysisRecord => Boolean(item));
  const sourceBound = EVIDENCE_INTERPRETATIONS
    .map(fromVerifiedEvidence)
    .filter((item): item is WeeklyAnalysisRecord => Boolean(item));
  return [bitcoinPublication(), bitcoinSeptemberSecondWeekPublication(), ...direct, ...sourceBound]
    .filter((item): item is WeeklyAnalysisRecord => Boolean(item));
}

export const SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS = buildSourceLockedAutoWeeklyPublications();
