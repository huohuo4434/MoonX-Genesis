/**
 * Cross-framework research conflicts — preserves opposing views without averaging.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchConflict } from "@/types/research";

export const researchConflicts: ResearchConflict[] = [
  {
    id: "CONFLICT-SSE-2026-H2-001",
    assetId: "shanghai-composite",
    title: lt("A股2026年下半年方向分歧", "A股2026年下半年方向分歧", "A-Share H2 2026 Direction Divergence"),
    status: "观察中",
    records: [
      {
        recordId: "MX-SSE-2026-ANNUAL-LIUYAO-001",
        framework: lt("年度六爻", "年度六爻", "Annual six-yao"),
        direction: lt("下半年偏弱", "下半年偏弱", "H2 soft bias"),
        summary: lt(
          "春季尤其3月较强，财爻旺而入墓，政策和规则压制下半年表现。",
          "春季尤其3月較強，財爻旺而入墓，政策和規則壓制下半年表現。",
          "Spring (esp. March) stronger; wealth tombed — policy/rules constrain H2."
        ),
      },
      {
        recordId: "QIMEN-A-SHARES-2026-H2",
        framework: lt("奇门遁甲", "奇門遁甲", "Qimen"),
        direction: lt("下半年看涨", "下半年看漲", "H2 bullish"),
        summary: lt(
          "7至8月震荡布局，8月22日前后上涨观察，9月至10月趋势强化。",
          "7至8月震盪佈局，8月22日前後上漲觀察，9月至10月趨勢強化。",
          "Jul–Aug digestion; Aug 22 advance watch; Sep–Oct trend strengthening."
        ),
      },
      {
        recordId: "A-SH-2026-0727-ORACLE-001",
        framework: lt("中期六爻", "中期六爻", "Mid-term six-yao"),
        direction: lt("震荡偏多", "震盪偏多", "Oscillating bullish"),
        summary: lt(
          "短期蓄势，中期震荡上行，8月中下旬为重要验证窗口。",
          "短期蓄勢，中期震盪上行，8月中下旬為重要驗證窗口。",
          "Near-term digestion; mid-term oscillating advance; mid-late Aug key window."
        ),
      },
    ],
    resolutionWindow: { start: "2026-08-12", end: "2026-09-10" },
    bullishConfirmation: [
      lt("上证指数放量突破阶段或年度高点", "上證指數放量突破階段或年度高點", "SSE breaks stage or annual highs on volume"),
      lt("上涨家数和市场宽度持续改善", "上漲家數和市場寬度持續改善", "Advancers and market breadth improve"),
      lt("成交量连续放大", "成交量連續放大", "Volume expands persistently"),
      lt("科技、金融、消费和周期板块形成扩散", "科技、金融、消費和週期板塊形成擴散", "Tech, finance, consumer, cyclicals broaden"),
      lt("突破后回踩不破", "突破後回踩不破", "Breakout holds on retest"),
    ],
    bearishConfirmation: [
      lt("8月下旬反弹失败", "8月下旬反彈失敗", "Late-Aug rebound fails"),
      lt("成交量继续萎缩", "成交量繼續萎縮", "Volume keeps shrinking"),
      lt("上涨集中于少数权重股", "上漲集中於少數權重股", "Gains concentrated in few leaders"),
      lt("政策预期无法转化为新增资金", "政策預期無法轉化為新增資金", "Policy hopes fail to bring new flows"),
      lt("跌破中期趋势关键支撑", "跌破中期趨勢關鍵支撐", "Break of mid-term trend support"),
    ],
    currentMoonXView: lt(
      "方向存在重大分歧，8月中下旬至9月初为核心裁决窗口。当前不提前判定任一单一框架完全正确。",
      "方向存在重大分歧，8月中下旬至9月初為核心裁決窗口。當前不提前判定任一單一框架完全正確。",
      "Material direction divergence — core resolution window mid-Aug through early Sep. MoonX does not declare any single framework correct yet."
    ),
  },
];

export function listResearchConflicts(): ResearchConflict[] {
  return researchConflicts;
}

export function getResearchConflict(id: string): ResearchConflict | undefined {
  return researchConflicts.find((c) => c.id === id);
}

export function getResearchConflictForAsset(assetId: string): ResearchConflict | undefined {
  return researchConflicts.find((c) => c.assetId === assetId);
}

export function getResearchConflictForRecord(recordId: string): ResearchConflict | undefined {
  return researchConflicts.find((c) => c.records.some((r) => r.recordId === recordId));
}
