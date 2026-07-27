import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

export const externalObservations: ResearchRecord[] = [{
  id: "EXTERNAL-OIL-RHYTHM-2026-07-27",
  publishedAt: "2026-07-27",
  forecastStart: "2026-07-27",
  forecastEnd: "2026-07-31",
  assetId: "crude-oil",
  assetName: lt("原油", "原油", "Crude Oil"),
  symbol: "WTI",
  market: "commodity",
  framework: "cycle",
  sourceType: "external-symbolic-analysis",
  publicSourceLabel: lt("外部象数分析", "外部象數分析", "External Symbolic Analysis"),
  direction: "neutral",
  editorialConfidence: 20,
  consensusEligible: false,
  excludeFromLongTermConsensus: true,
  horizon: lt("2026年7月27日至31日", "2026年7月27日至31日", "July 27–31, 2026"),
  title: lt("原油短期节奏观察：先探底反弹，后高位震荡", "原油短期節奏觀察：先探底反彈，後高位震盪", "Crude Oil Near-Term Rhythm Watch: Dip, Rebound, Then Consolidation"),
  summary: lt("该来源倾向于认为本周原油呈现先下探、再反弹、随后震荡并尝试突破的节奏。由于缺少具体价格条件且历史样本不足，MoonX仅将其作为低权重时间路径观察，不作为独立交易依据。", "該來源傾向於認為本週原油呈現先下探、再反彈、隨後震盪並嘗試突破的節奏。由於缺少具體價格條件且歷史樣本不足，MoonX僅將其作為低權重時間路徑觀察，不作為獨立交易依據。", "The source sees a weekly rhythm of an initial dip, rebound, consolidation, and a possible breakout attempt. With no price conditions and insufficient history, MoonX treats this only as a low-weight timing observation."),
  thesis: [
    lt("阶段一：7月27日至28日中午，可能先受阻下探，再于7月28日前后尝试V形反弹。", "階段一：7月27日至28日中午，可能先受阻下探，再於7月28日前後嘗試V形反彈。", "Stage one: an early dip may precede a V-shaped rebound attempt around July 28."),
    lt("阶段二：7月28日下午至30日，反弹后可能进入高位震荡、换手和筹码消化。", "階段二：7月28日下午至30日，反彈後可能進入高位震盪、換手和籌碼消化。", "Stage two: post-rebound consolidation and position turnover may follow through July 30."),
    lt("阶段三：7月31日，可能尝试突破，但需观察动能减弱、资金流出或冲高回落。", "階段三：7月31日，可能嘗試突破，但需觀察動能減弱、資金流出或衝高回落。", "Stage three: a breakout attempt is possible on July 31, subject to momentum and reversal risk."),
  ],
  risks: [lt("本记录来自外部象数分析，历史验证样本不足，仅作为时间路径观察。历史样本仅2次，暂不适合据此判断稳定可靠性。", "本記錄來自外部象數分析，歷史驗證樣本不足，僅作為時間路徑觀察。歷史樣本僅2次，暫不適合據此判斷穩定可靠性。", "This record comes from external symbolic analysis with insufficient verification history and is only a timing-path observation. With only two historical samples, stable reliability cannot be assessed.")],
  verificationChecklist: [
    lt("周一至周二是否先出现下探。", "週一至週二是否先出現下探。", "Did an initial dip occur Monday to Tuesday?"),
    lt("7月28日前后是否出现明显反弹。", "7月28日前後是否出現明顯反彈。", "Did a clear rebound appear around July 28?"),
    lt("周三至周四是否进入高位震荡。", "週三至週四是否進入高位震盪。", "Did Wednesday to Thursday enter consolidation?"),
    lt("周五是否出现突破尝试以及冲高回落风险。", "週五是否出現突破嘗試以及衝高回落風險。", "Did Friday produce a breakout attempt and reversal risk?"),
  ],
  status: "pending",
  tags: ["crude-oil", "external-symbolic-analysis", "low-weight", "verification-2026-08-01"],
}];
