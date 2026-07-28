/**
 * Cross-horizon cycle alignment — editorial consistency score, not probability.
 */
import { lt } from "@/lib/i18n/config";
import type { CycleAlignment } from "@/types/research";

export const cycleAlignments: CycleAlignment[] = [
  {
    id: "ALIGN-BTC-20260727",
    assetId: "bitcoin",
    records: [
      {
        recordId: "ORACLE-0009",
        period: lt("年度", "年度", "Annual"),
        direction: lt("7至8月缓慢反弹，9月高点观察", "7至8月緩慢反彈，9月高點觀察", "Jul–Aug slow rebound; Sep high watch"),
        confidence: 74,
      },
      {
        recordId: "MX-BTC-20260727-0907-LIUYAO-001",
        period: lt("中周期", "中周期", "Mid cycle"),
        direction: lt("高波动震荡上涨", "高波動震盪上漲", "High-volatility oscillating advance"),
        confidence: 64,
      },
      {
        recordId: "MX-BTC-20260727-0806-LIUYAO-001",
        period: lt("短周期", "短周期", "Short cycle"),
        direction: lt("先弹后跌再修复", "先彈後跌再修復", "Bounce, dip, then repair"),
        confidence: 60,
      },
    ],
    alignmentScore: 78,
    conclusion: lt(
      "三个周期总体一致，均支持7月至8月在高波动中逐步修复，但不支持无阻力主升。9月附近既是潜在高点窗口，也是反弹动力可能衰减的风险窗口。",
      "三個周期總體一致，均支持7月至8月在高波動中逐步修復，但不支持無阻力主升。9月附近既是潛在高點窗口，也是反彈動力可能衰減的風險窗口。",
      "All three horizons align: Jul–Aug repair amid volatility is supported, but not a frictionless rally. Early September is both a potential high window and a momentum-fade risk zone."
    ),
    conflictNotes: [
      lt("中周期六冲结构强调路径反复，与年度“缓慢反弹”在节奏上存在差异。", "中周期六沖結構強調路徑反覆，與年度「緩慢反彈」在節奏上存在差異。", "Mid-cycle six-clash emphasizes whipsaws vs annual “slow rebound” pacing."),
      lt("短周期与用户自测来源，不得与私人导师01合并统计准确率。", "短周期與用戶自測來源，不得與私人導師01合併統計準確率。", "Short cycle is user self-test — do not merge accuracy stats with Mentor 01."),
    ],
    scoreDisclaimer: lt(
      "一致性评分不是上涨概率，也不是历史准确率；为编辑层面对多周期方向的定性比较，不构成投资建议。",
      "一致性評分不是上漲概率，也不是歷史準確率；為編輯層面對多周期方向的定性比較，不構成投資建議。",
      "Alignment score is not upside probability or historical accuracy — it is a qualitative editorial comparison across horizons. Not investment advice."
    ),
  },
];

export function getCycleAlignmentForAsset(assetId: string): CycleAlignment | undefined {
  return cycleAlignments.find((item) => item.assetId === assetId);
}

export function getCycleAlignmentForRecord(recordId: string): CycleAlignment | undefined {
  return cycleAlignments.find((item) => item.records.some((r) => r.recordId === recordId));
}
