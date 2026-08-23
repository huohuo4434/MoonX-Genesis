import { PUBLISHED_WEEKLY_ANALYSES_20260824 } from "@/lib/data/published-weekly-analysis-20260824";
import { WEEKLY_RESEARCH_REVISIONS_20260823 } from "@/lib/data/published-weekly-research-20260823";
import { TEACHER02_CRYPTO_SOURCE_20260821 } from "@/lib/data/teacher02-crypto-20260821";
import type { WeeklyAnalysisRecord, WeeklyKeyDate } from "@/types/weekly-analysis";

const PUBLISHED_AT = TEACHER02_CRYPTO_SOURCE_20260821.ingestedAt;

function previous(assetId: "bitcoin" | "eth"): WeeklyAnalysisRecord {
  const record = [
    ...PUBLISHED_WEEKLY_ANALYSES_20260824,
    ...WEEKLY_RESEARCH_REVISIONS_20260823,
  ].filter((item) => item.assetId === assetId).sort((a, b) => b.version - a.version)[0];
  if (!record) throw new Error(`Missing locked 2026-08-24 weekly record for ${assetId}`);
  return record;
}

const previousBtc = previous("bitcoin");
const previousEth = previous("eth");

const SHARED_KEY_DATES: WeeklyKeyDate[] = [
  {
    date: "2026-08-24",
    label: "周初下探启动",
    expectedEffect: "下跌",
    sources: ["LIUYAO"],
    confidence: 76,
    note: "老师原文统一采用UTC：开局冲高受阻后快速下探，低点候选延伸至25日。",
  },
  {
    date: "2026-08-25",
    label: "低点与止跌回收候选",
    expectedEffect: "探底回升",
    sources: ["LIUYAO"],
    confidence: 80,
    note: "低点是候选窗口，不是无条件买点。",
  },
  {
    date: "2026-08-26",
    label: "02:24 UTC后进入修复段",
    expectedEffect: "探底回升",
    sources: ["LIUYAO"],
    confidence: 80,
    note: "允许震荡反弹，但老师明确不定义为连续主升。",
  },
  {
    date: "2026-08-27",
    label: "宽幅拉锯与上下插针",
    expectedEffect: "波动放大",
    sources: ["LIUYAO", "QIMEN"],
    confidence: 74,
    note: "周卦宽幅换手与奇门风险日重合，只提高波动警戒。",
  },
  {
    date: "2026-08-29",
    label: "06:00 UTC后进入蓄势回补段",
    expectedEffect: "企稳",
    sources: ["LIUYAO"],
    confidence: 74,
    note: "7×24市场周末低流动性可能放大插针。",
  },
];
export const WEEKLY_CRYPTO_TEACHER_REVISION_NOTE_20260824 = {
  zh: "BTC、ETH已加入最新完整老师周卦：24—25日先找低点，26日后修复，27—28日宽幅换手，29—30日偏震荡回升。老师卦为主，网站自起卦只作同向复核；时间按UTC保存。",
  en: "BTC and ETH now use the latest complete teacher weekly reading: seek a low on Aug 24-25, repair after Aug 26, churn on Aug 27-28, and favor a choppy recovery on Aug 29-30. The teacher chart is primary; MOOX charts are secondary confirmation. Source times remain in UTC.",
} as const;

export const WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823: WeeklyAnalysisRecord[] = [
  {
    ...previousBtc,
    id: "WEEKLY-BTC-20260824-V5",
    overallDirection: "探底回升",
    weeklyPath: "最新完整老师周卦把周内顺序明确为：8月24日至25日先下探并寻找低点；26日02:24 UTC后修复，但不定义为连续主升；27日至28日宽幅换手；29日至30日进入水天需蓄势回补、偏震荡回升。BTC自起周卦仍为同向旁证，老师周卦优先。",
    headline: "BTC下周先找低点再修复：周中反弹伴随插针，周末偏蓄势回升。",
    probabilities: { up: 39, flat: 37, down: 24 },
    strongWindow: "8月25日止跌回收候选至26日02:24 UTC后的修复段，以及29日06:00 UTC后的蓄势回补段",
    weakWindow: "8月24日至25日周初快速下探，以及27日至28日宽幅换手阶段",
    keyDates: SHARED_KEY_DATES,
    basisWeights: {
      technical: 0,
      liuyao: 90,
      cycle: 0,
      qimen: 10,
      macro: 0,
      bazi: 0,
      note: "最新完整老师周卦负责方向与逐日顺序；BTC自起周卦只作同向复核，奇门只保留27日风险提醒。",
    },
    invalidation: "若25日后仍持续破低且无法收回30分钟主结构，修复分支失效；若周初没有下探而直接上冲，只记录第一段未兑现，不回写本版本。",
    confirmation: "时间窗口必须与4小时环境、30分钟主结构和5分钟右侧确认同时使用；研究不会直接触发实盘。",
    catalysts: ["老师周卦先失后得", "周中修复", "周末水天需资金回补"],
    risks: ["周初快速下探", "周中上下插针", "周末低流动性"],
    riskLevel: "高",
    confidence: 78,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: [TEACHER02_CRYPTO_SOURCE_20260821.id, ...(previousBtc.sourceIds ?? [])],
    version: 5,
    originalLocked: true,
    revisions: [
      ...(previousBtc.revisions ?? []),
      {
        version: previousBtc.version,
        previousContent: `${previousBtc.overallDirection}｜${previousBtc.weeklyPath}`,
        changedAt: PUBLISHED_AT,
        reason: "目标周开始前收到BTC/ETH完整老师周卦；总体方向同向但逐日顺序更明确，因此保留旧版并发布V5。",
      },
    ],
  },
  {
    ...previousEth,
    id: "WEEKLY-ETH-20260824-V3",
    overallDirection: "探底回升",
    weeklyPath: "最新完整老师周卦把周内顺序明确为：8月24日至25日先下探并寻找低点；26日02:24 UTC后修复，但不定义为连续主升；27日至28日宽幅换手；29日至30日偏震荡回升。ETH申月月卦又确认26日后修复增强，但30日06:00 UTC后雷水解结束、山地剥接掌，随后重新防承压。",
    headline: "ETH下周先探底再修复：周末可回升，但30日后重新防承压。",
    probabilities: { up: 42, flat: 36, down: 22 },
    strongWindow: "8月25日止跌回收候选至26日02:24 UTC后的修复段，以及29日06:00 UTC后的蓄势回补段",
    weakWindow: "8月24日至25日周初快速下探、27日至28日宽幅换手，以及30日06:00 UTC后的月卦承压切换",
    keyDates: [
      ...SHARED_KEY_DATES,
      {
        date: "2026-08-30",
        label: "06:00 UTC后月卦重新承压",
        expectedEffect: "转折",
        sources: ["LIUYAO"],
        confidence: 78,
        note: "只限制后续延续性，不倒推取消周末修复。",
      },
    ],
    basisWeights: {
      technical: 0,
      liuyao: 95,
      cycle: 0,
      qimen: 5,
      macro: 0,
      bazi: 0,
      note: "老师完整周卦负责方向与逐日顺序，ETH申月月卦负责30日后的高周期约束；网站自起周卦只作同向复核。",
    },
    invalidation: "若25日后仍持续破低且无法收回30分钟主结构，修复分支失效；若30日后仍持续放量上行，月卦重新承压只记为延后，不事后改写。",
    confirmation: "按UTC核对原始窗口，并等待4小时环境、30分钟主结构与5分钟右侧确认；研究不会直接触发实盘。",
    catalysts: ["老师周卦先失后得", "ETH月卦支持周中修复", "周末水天需资金回补"],
    risks: ["周初快速下探", "周中上下插针", "30日后重新承压"],
    riskLevel: "高",
    confidence: 82,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    sourceIds: [TEACHER02_CRYPTO_SOURCE_20260821.id, ...(previousEth.sourceIds ?? [])],
    version: 3,
    originalLocked: true,
    revisions: [
      ...(previousEth.revisions ?? []),
      {
        version: previousEth.version,
        previousContent: `${previousEth.overallDirection}｜${previousEth.weeklyPath}`,
        changedAt: PUBLISHED_AT,
        reason: "目标周开始前收到BTC/ETH完整老师周卦及ETH申月交叉校准；总体方向同向但时间路径更明确，因此保留旧版并发布V3。",
      },
    ],
  },
];
