/**
 * Next-week research published on Saturday 2026-08-01.
 * Only BTC has a completed, source-backed weekly study.
 * Other core markets remain explicitly unpublished; no previous-week copying.
 */
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

export const PUBLISHED_WEEKLY_ANALYSES_20260803: WeeklyAnalysisRecord[] = [
  {
    id: "WEEKLY-BTC-20260803-V1",
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    displaySymbol: "BTC",
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    overallDirection: "震荡",
    weeklyPath:
      "周初以震荡整理为主，期间可能出现修复反弹；但妻财伏藏受兄弟压制，连续大涨的基础不足。8月7日前后进入波动放大和方向重新选择窗口。",
    headline:
      "下周BTC更接近震荡与弱修复，不支持直接定义为连续主升；反弹后仍需观察承接。",
    probabilities: { up: 30, flat: 45, down: 25 },
    strongWindow: "周中至8月7日前后的修复窗口",
    weakWindow: "反弹后的承接不足阶段",
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若下周形成持续放量突破并连续站稳新平台，则“震荡与弱修复”判断失效，需生成新版本。",
    catalysts: ["子孙酉金持世带来的修复力量", "申月临近后金气增强"],
    risks: ["妻财子水伏于兄弟未土之下", "父母巳火发动化官鬼寅木", "反弹持续性不足"],
    riskLevel: "高",
    confidence: 60,
    publishedAt: "2026-08-01T11:05:00+08:00",
    updatedAt: "2026-08-01T11:05:00+08:00",
    status: "published",
    visibility: "member",
    sourceIds: ["BTC-W1-20260801-V2", "六爻：火泽睽→火水未济"],
    version: 1,
    originalLocked: true,
  },
];
