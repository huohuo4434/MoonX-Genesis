import { WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823 } from "@/lib/data/published-weekly-crypto-teacher-20260823";
import { QIMEN_ROTATION_POST_SOURCE_ID_20260823 } from "@/lib/data/qimen-rotation-post-20260823";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

const UPDATED_AT = "2026-08-23T18:00:00+08:00";
const previousBtc = WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823.find(
  (item) => item.assetId === "bitcoin"
);

if (!previousBtc) {
  throw new Error("Missing BTC weekly teacher revision for 2026-08-24");
}

export const WEEKLY_QIMEN_POST_REVISION_NOTE_20260824 = {
  zh: "BTC、ETH继续以完整老师周卦为正式方向。新增资产轮动观察只补充BTC反弹逻辑与“反转未确认”提醒：不计作新奇门盘、不增加方向票、不编造点位；黄金、白银观点作为分歧研究等待专项卦验证。",
  en: "BTC and ETH remain governed by the complete teacher weekly reading. A new rotation observation only adds context for the BTC rebound and an unconfirmed-reversal warning: it is not counted as a new Qimen chart, adds no direction vote, and invents no levels. Gold and silver remain disagreement research pending dedicated charts.",
} as const;

export const WEEKLY_QIMEN_POST_REVISIONS_20260823: WeeklyAnalysisRecord[] = [
  {
    ...previousBtc,
    id: "WEEKLY-BTC-20260824-V6",
    weeklyPath:
      "完整老师周卦的正式顺序不变：8月24日至25日先下探并寻找低点；26日02:24 UTC后修复，但不定义为连续主升；27日至28日宽幅换手；29日至30日偏震荡回升。新增资产轮动观察把BTC反弹解释为AI科技高热度后的资金切换，同时明确反转尚未确认；该帖子不是新奇门盘，只补充高位兑现风险。",
    headline: "BTC仍先探底后修复：反弹可看作轮动，趋势反转暂未确认。",
    basisWeights: {
      technical: 0,
      liuyao: 90,
      cycle: 0,
      qimen: 10,
      macro: 0,
      bazi: 0,
      note: "完整老师六爻周卦继续负责方向与逐日顺序；奇门只保留风险日，资产轮动帖子只作解释与风险提醒，不参与方向投票。",
    },
    invalidation:
      "若25日后仍持续破低且无法收回30分钟主结构，周内修复分支失效；若BTC有效突破日线主结构、回踩确认并持续放量，则“仅为轮动反弹、反转未确认”的谨慎判断需重新评估。任何结果都不回写本版本。",
    confirmation:
      "先按完整六爻周路径执行观察，再用4小时环境、30分钟主结构和5分钟右侧信号确认；板块轮动与政策托底均为条件研究，不直接触发实盘。",
    catalysts: [
      ...(previousBtc.catalysts ?? []),
      "资金注意力由AI科技暂时转向BTC（来源判断）",
      "美国政策托底预期（条件分支）",
    ],
    risks: [
      ...(previousBtc.risks ?? []),
      "反转尚未确认",
      "轮动反弹高位兑现",
      "AI与BTC的反向关系并非稳定规律",
    ],
    updatedAt: UPDATED_AT,
    sourceIds: [
      ...(previousBtc.sourceIds ?? []),
      `${QIMEN_ROTATION_POST_SOURCE_ID_20260823}-BTC`,
    ],
    version: 6,
    originalLocked: true,
    memberRevisionNotice: {
      changedAt: UPDATED_AT,
      previousLabelZh: "8月21日公开初步判断",
      previousLabelEn: "Public preliminary view on Aug 21",
      previousSummaryZh: "24日前后观察短期高点。",
      previousSummaryEn: "Watch for a short-term high around Aug 24.",
      currentSummaryZh: "8月24日至25日先下探寻找低点，26日后修复；27日至28日宽幅换手，29日至30日偏震荡回升。",
      currentSummaryEn: "Seek a low on Aug 24-25, repair after Aug 26, churn on Aug 27-28, then favor a choppy recovery on Aug 29-30.",
      reasonZh: "目标周开始前补入高优先级完整周度记录，按既定来源顺序发布新版本；旧观点保留，不删除、不回写。",
      reasonEn: "A higher-priority complete weekly record arrived before the target week. A new version was published under the existing source hierarchy; the earlier view remains preserved.",
    },
    revisions: [
      ...(previousBtc.revisions ?? []),
      {
        version: previousBtc.version,
        previousContent: `${previousBtc.overallDirection}｜${previousBtc.weeklyPath}`,
        changedAt: UPDATED_AT,
        reason:
          "目标周开始前收到新的资产轮动帖子；它与先探底后修复、反转未确认的路径相容，因此保留V5并发布V6，只补充解释与风险，不改正式方向。",
      },
    ],
  },
];
