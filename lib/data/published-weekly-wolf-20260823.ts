import { PUBLISHED_WEEKLY_ANALYSES_20260824 } from "@/lib/data/published-weekly-analysis-20260824";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

const PUBLISHED_AT = "2026-08-23T11:05:00+08:00";

function previous(assetId: "gold" | "silver"): WeeklyAnalysisRecord {
  const record = PUBLISHED_WEEKLY_ANALYSES_20260824.find((item) => item.assetId === assetId);
  if (!record) throw new Error(`Missing locked 2026-08-24 weekly record for ${assetId}`);
  return record;
}

const previousGold = previous("gold");
const previousSilver = previous("silver");

export const WEEKLY_WOLF_REVISION_NOTE_20260824 = {
  zh: "8月23日新增一组事前锁定的贵金属专项周卦。黄金和白银的周内方向由最新完整周卦负责，奇门仅保留为风险与时间辅助；GLD、SLV原文盘中时间均按纽约夏令时保存。ETH材料只有旧案复盘，没有补造新的周方向。旧版预测、分歧和失败样本永久保留。",
  en: "A forward-locked precious-metals weekly Liu Yao source was added on Aug 23. The newest complete weekly readings now own the gold and silver intrawEEK path, while Qimen remains a timing/risk aid. GLD and SLV intraday times are stored in New York daylight time. The ETH material was retrospective only, so no new ETH direction was invented. Prior versions remain immutable.",
} as const;

export const WEEKLY_WOLF_REVISIONS_20260823: WeeklyAnalysisRecord[] = [
  {
    ...previousGold,
    id: "WEEKLY-GOLD-20260824-V3",
    overallDirection: "先跌后涨",
    weeklyPath: "最新贵金属专项周卦以GLD北美交易周为对象：周一至周二先震荡下杀，周二纽约时间约14:22附近观察低点；此后周三至周四进入修复，周四后段至周五转为高位宽幅波动并防回吐。原奇门的小回调判断与新周卦的前段下杀一致，但奇门不再决定整周方向。周六、周日GLD休市，不拆出虚构日卦。",
    headline: "黄金先下杀再修复：周二午后看转折，周四后段起防宽幅回吐。",
    probabilities: { up: 34, flat: 40, down: 26 },
    strongWindow: "周二纽约时间约14:22低点窗口后，价格结构确认止跌至周四中段",
    weakWindow: "周一至周二下杀阶段，以及周四后段至周五的高位回吐风险",
    keyDates: [
      {
        date: "2026-08-25",
        label: "GLD周初低点/止跌观察",
        expectedEffect: "探底回升",
        sources: ["LIUYAO"],
        confidence: 72,
        note: "原文时间为纽约夏令时约14:22；允许半日至一个交易日时间偏差，但方向另行评分。",
      },
      {
        date: "2026-08-27",
        label: "修复转高波动观察",
        expectedEffect: "波动放大",
        sources: ["LIUYAO", "QIMEN"],
        confidence: 68,
        note: "周四后段至周五防获利回吐，不把修复自动定义为稳定主升。",
      },
    ],
    basisWeights: {
      technical: 0,
      liuyao: 70,
      cycle: 0,
      qimen: 20,
      macro: 10,
      bazi: 0,
      note: "方向由8月19日更新的GLD完整周卦负责；原奇门只保留前段回调和风险窗口辅助。技术结构只确认止跌与失效，不生成方向。",
    },
    invalidation: "若周初不下杀而持续突破，前段洗盘路径失效；若周二低点窗口后仍持续创新低，周中修复分支失效。任何失效只记入复盘，不改写本版本。",
    confirmation: "依次确认真实急跌/回踩、4小时或30分钟支撑结构、纽约时间窗口；时间窗口不能脱离价格结构单独触发交易。",
    catalysts: ["周初压力释放后的修复", "周二转折窗口后的空头回补"],
    risks: ["周初震荡下杀", "周四后段起宽幅波动", "半日至一个交易日的转折时间误差"],
    riskLevel: "高",
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: ["T02-GOLD-20260824-0828-V1", ...(previousGold.sourceIds ?? [])],
    version: 3,
    originalLocked: true,
    revisions: [
      ...(previousGold.revisions ?? []),
      {
        version: previousGold.version,
        previousContent: `${previousGold.overallDirection}｜${previousGold.weeklyPath}`,
        changedAt: PUBLISHED_AT,
        reason: "目标周开始前收到更新更晚、对象更专门且卦象完整的GLD周卦；以新版本修订，不覆盖原V2。",
      },
    ],
  },
  {
    ...previousSilver,
    id: "WEEKLY-SILVER-20260824-V2",
    overallDirection: "震荡",
    weeklyPath: "最新SLV专项周卦给出三段纽约时间路径：周一开盘至周二12:00先洗盘下探；周二12:00至周四12:00反弹修复，周三允许较强阳线；周四12:00至周五冲击压力但受约束，随后防回吐。三段并非简单单边，因此正式方向归为震荡，路径顺序单独展示。周六、周日SLV休市，不制造日卦。",
    headline: "白银三段震荡：周初下探、周中修复、周尾冲压后防回吐。",
    probabilities: { up: 32, flat: 43, down: 25 },
    strongWindow: "周二纽约时间12:00至周四12:00的修复窗口",
    weakWindow: "周一开盘至周二中午的洗盘，以及周四中午后的回吐风险",
    keyDates: [
      {
        date: "2026-08-25",
        label: "SLV洗盘转修复观察",
        expectedEffect: "探底回升",
        sources: ["LIUYAO"],
        confidence: 70,
        note: "原文时间为纽约夏令时12:00。",
      },
      {
        date: "2026-08-27",
        label: "SLV修复转回吐观察",
        expectedEffect: "冲高回落",
        sources: ["LIUYAO"],
        confidence: 68,
        note: "原文时间为纽约夏令时12:00；周尾不定义为稳定主升。",
      },
    ],
    basisWeights: {
      technical: 0,
      liuyao: 80,
      cycle: 10,
      qimen: 0,
      macro: 10,
      bazi: 0,
      note: "方向与三段顺序由8月20日更新的SLV完整周卦负责；本期无白银专属奇门，不把黄金奇门复制给白银。技术只验证真实结构。",
    },
    invalidation: "若周初持续突破而没有洗盘，第一阶段失效；若周三后仍持续创新低，修复阶段失效。任何失效只进入复盘，不回写原预测。",
    confirmation: "按纽约时间核对SLV实际K线；方向、时间和波动幅度分开评分，半日至一个交易日容差只影响时间评分。",
    catalysts: ["洗盘后的自发修复", "周三较强修复分支"],
    risks: ["六冲高波动", "白银振幅高于黄金", "周尾获利回吐"],
    riskLevel: "高",
    confidence: 70,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: ["T02-SILVER-20260824-0828-V1", ...(previousSilver.sourceIds ?? [])],
    version: 2,
    originalLocked: true,
    revisions: [
      ...(previousSilver.revisions ?? []),
      {
        version: previousSilver.version,
        previousContent: `${previousSilver.overallDirection}｜${previousSilver.weeklyPath}`,
        changedAt: PUBLISHED_AT,
        reason: "目标周开始前收到更新更晚且时间分段更明确的SLV专项周卦；以新版本修订，不覆盖原V1。",
      },
    ],
  },
];
