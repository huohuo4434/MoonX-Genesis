import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/**
 * Forward-locked, anonymized cycle/GEX research captured by the scheduled
 * Substack monitor on 2026-08-24. Paid-source wording is not reproduced.
 * These records are auxiliary, consensus-ineligible and execution-ineligible.
 */
export const cycleResearchUsIndices20260824Records: ResearchRecord[] = [
  {
    id: "CYCLE-RESEARCH-NDX-20260824",
    publishedAt: "2026-08-24",
    sourcePublishedAt: "2026-08-24T01:06:00+08:00",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-24T01:20:43.670Z",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-08-31",
    expiresAt: "2026-09-01T00:00:00-04:00",
    accessLevel: "member",
    excludeFromHomeViews: true,
    excludeFromLongTermConsensus: true,
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    sourceSymbol: "QQQ",
    market: "index",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "https://agentmat.substack.com/p/qqq-forecast-aug-24-31",
    publicSourceLabel: lt("周期预测师", "週期預測師", "Cycle Forecaster"),
    sourceProfileId: "cycle-forecaster",
    direction: "neutral",
    editorialConfidence: 52,
    consensusEligible: false,
    horizon: lt("2026年8月24日至31日", "2026年8月24日至31日", "August 24-31, 2026"),
    title: lt("纳指月末高低点窗口观察", "納指月末高低點窗口觀察", "Nasdaq Month-End Turning-Window Watch"),
    summary: lt(
      "原图明确标出8月25日阶段上沿、8月27日阶段下沿和8月31日反弹高点；MOOX据此归纳为8月24日至31日的双向波动路径。它与已锁定的“风险释放后修复”中后段方向相容，但额外提示周初仍可能先冲高；只作会员研究提醒，不修改正式周度方向。",
      "原圖明確標出8月25日階段上沿、8月27日階段下沿和8月31日反彈高點；MOOX據此歸納為8月24日至31日的雙向波動路徑。它與已鎖定的「風險釋放後修復」中後段方向相容，但額外提示週初仍可能先衝高；只作會員研究提醒，不修改正式週度方向。",
      "The source chart explicitly marks a local upper window on Aug 25, a local lower window on Aug 27 and a rebound-high window on Aug 31; MOOX summarizes those labels as a two-way Aug 24-31 path. This is compatible with the later portion of the locked risk-release-then-repair path, while adding an early-week upside warning. It does not change the formal weekly direction."
    ),
    thesis: [
      lt("8月25日被原图明确标为上沿窗口。", "8月25日被原圖明確標為上沿窗口。", "Aug 25 is explicitly labeled as a top window in the source chart."),
      lt("8月27日被原图明确标为下沿窗口。", "8月27日被原圖明確標為下沿窗口。", "Aug 27 is explicitly labeled as a bottom window in the source chart."),
      lt("8月31日被原图明确标为反弹高点窗口。", "8月31日被原圖明確標為反彈高點窗口。", "Aug 31 is explicitly labeled as a rebound-high window in the source chart."),
      lt("图中带有价格纵轴，但没有另列文字点位表；网站不得把目测读数冒充原文明确目标。", "圖中帶有價格縱軸，但沒有另列文字點位表；網站不得把目測讀數冒充原文明確目標。", "The chart includes a price axis but no separate written target table; visual estimates must not be presented as explicit source targets."),
    ],
    invalidation: lt(
      "原文未明确独立失效条件；不得补造。若8月25日至27日没有形成先上沿、后下沿的顺序，本条外部路径即应降级复盘。",
      "原文未明確獨立失效條件；不得補造。若8月25日至27日沒有形成先上沿、後下沿的順序，本條外部路徑即應降級復盤。",
      "The source states no standalone invalidation condition; none is invented. If Aug 25-27 does not produce the modeled upper-then-lower sequence, this auxiliary path should be downgraded in review."
    ),
    turningWindows: [
      { id: "ndx-cycle-top-20260825", date: "2026-08-25", label: lt("阶段上沿窗口", "階段上沿窗口", "Local top window"), note: lt("日期为原图明确标注；文字点位未明确。", "日期為原圖明確標註；文字點位未明確。", "Date is explicit in the chart; no written target level is stated.") },
      { id: "ndx-cycle-bottom-20260827", date: "2026-08-27", label: lt("阶段下沿窗口", "階段下沿窗口", "Local bottom window"), note: lt("日期为原图明确标注；文字点位未明确。", "日期為原圖明確標註；文字點位未明確。", "Date is explicit in the chart; no written target level is stated.") },
      { id: "ndx-cycle-rebound-20260831", date: "2026-08-31", label: lt("反弹高点窗口", "反彈高點窗口", "Rebound-high window"), note: lt("日期与性质为原图明确标注。", "日期與性質為原圖明確標註。", "The date and rebound-high label are explicit in the chart.") },
    ],
    risks: [
      lt("外部观点只作研究辅助，不覆盖MOOX已锁定正式方向，不回写历史预测。", "外部觀點只作研究輔助，不覆蓋MOOX已鎖定正式方向，不回寫歷史預測。", "This external view is auxiliary only; it cannot override the locked MOOX direction or rewrite history."),
      lt("该记录不得直接触发Bitget或任何自动交易。", "該記錄不得直接觸發Bitget或任何自動交易。", "This record cannot directly trigger Bitget or any automated trade."),
    ],
    status: "active",
    visibility: "internal",
    tags: ["nasdaq-100", "qqq", "cycle", "public-analyst", "anonymous", "research-only", "no-auto-trade", "forward-locked"],
  },
  {
    id: "CYCLE-RESEARCH-SPX-GEX-20260824",
    publishedAt: "2026-08-24",
    sourcePublishedAt: "2026-08-24T01:20:00+08:00",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-24T01:20:43.670Z",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-08-28",
    expiresAt: "2026-08-29T00:00:00-04:00",
    accessLevel: "member",
    excludeFromHomeViews: true,
    excludeFromLongTermConsensus: true,
    assetId: "sp500",
    assetName: lt("标普500", "標普500", "S&P 500"),
    symbol: "SPX",
    sourceSymbol: "SPY",
    market: "index",
    framework: "market-flow",
    sourceType: "public-analyst",
    internalSourceRef: "https://agentmat.substack.com/p/gex-of-spy-next-week",
    publicSourceLabel: lt("周期预测师", "週期預測師", "Cycle Forecaster"),
    sourceProfileId: "cycle-forecaster",
    direction: "neutral",
    editorialConfidence: 55,
    consensusEligible: false,
    horizon: lt("2026年8月24日至28日（美股交易周）", "2026年8月24日至28日（美股交易週）", "August 24-28, 2026 (U.S. trading week)"),
    title: lt("标普8月26日反弹回吐窗口", "標普8月26日反彈回吐窗口", "S&P Aug 26 Bounce-and-Round-Trip Watch"),
    summary: lt(
      "期权Gamma图把8月26日列为关键节点，研究情景是SPY先反弹、随后回落并回吐涨幅。该路径与MOOX已锁定的标普“高波动分化、冲高后兑现”判断同向，因此提高风险提醒的可信度，但不改变正式震荡方向。",
      "期權Gamma圖把8月26日列為關鍵節點，研究情景是SPY先反彈、隨後回落並回吐漲幅。該路徑與MOOX已鎖定的標普「高波動分化、衝高後兌現」判斷同向，因此提高風險提醒的可信度，但不改變正式震盪方向。",
      "The options-gamma chart flags Aug 26 as a key node, with a scenario of SPY bouncing first and then round-tripping the move. This aligns with MOOX's locked high-volatility, rise-then-fade risk framing, increasing caution without changing the formal neutral weekly direction."
    ),
    thesis: [
      lt("原文明确把8月26日称为关键节点，并明确提出“先反弹、后回落”的情景。", "原文明確把8月26日稱為關鍵節點，並明確提出「先反彈、後回落」的情景。", "The source explicitly identifies Aug 26 as a key node and states a bounce-then-round-trip scenario."),
      lt("配图显示当时SPY约767美元、Gamma Flip约766美元；8月26日765执行价的净GEX约为-8.079亿美元，其中看跌净值约-8.579亿美元、看涨净值约+0.5亿美元。", "配圖顯示當時SPY約767美元、Gamma Flip約766美元；8月26日765執行價的淨GEX約為-8.079億美元，其中看跌淨值約-8.579億美元、看漲淨值約+0.5億美元。", "The source image shows SPY near USD 767 and a gamma flip near USD 766; at the Aug 26 USD 765 strike, net GEX is about -USD 807.9M, with puts near -USD 857.9M and calls near +USD 50M."),
      lt("GEX只作为市场结构共振，不单独决定方向，也不形成可执行点位。", "GEX只作為市場結構共振，不單獨決定方向，也不形成可執行點位。", "GEX is treated as structural confluence only; it does not determine direction or create an executable level by itself."),
    ],
    invalidation: lt(
      "原文未明确独立失效条件；不得补造。若SPY未先反弹或8月26日前后没有出现回吐结构，则该外部情景应降级复盘。",
      "原文未明確獨立失效條件；不得補造。若SPY未先反彈或8月26日前後沒有出現回吐結構，則該外部情景應降級復盤。",
      "The source states no standalone invalidation condition; none is invented. If SPY does not bounce first or no round-trip structure appears around Aug 26, this auxiliary scenario should be downgraded in review."
    ),
    turningWindows: [
      { id: "spx-gex-node-20260826", date: "2026-08-26", label: lt("反弹回吐关键节点", "反彈回吐關鍵節點", "Bounce-and-round-trip key node"), note: lt("日期和路径为原图明确，按美股交易日展示；原文未明确时区，不是自动交易信号。", "日期和路徑為原圖明確，按美股交易日展示；原文未明確時區，不是自動交易訊號。", "The date and path are explicit in the source image and shown by U.S. trading date; the source does not state a timezone. This is not an automated-trading signal.") },
    ],
    risks: [
      lt("与MOOX正式标普震荡方向相容，只提高冲高回吐风险提醒，不提高方向权重。", "與MOOX正式標普震盪方向相容，只提高衝高回吐風險提醒，不提高方向權重。", "This is compatible with MOOX's formal neutral SPX direction; it raises the fade-risk warning, not the direction weight."),
      lt("该记录不得直接触发Bitget或任何自动交易。", "該記錄不得直接觸發Bitget或任何自動交易。", "This record cannot directly trigger Bitget or any automated trade."),
    ],
    status: "active",
    visibility: "internal",
    tags: ["sp500", "spy", "gex", "market-flow", "public-analyst", "anonymous", "research-only", "no-auto-trade", "forward-locked"],
  },
];
