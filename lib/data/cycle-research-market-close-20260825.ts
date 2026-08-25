import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/**
 * Forward-locked, anonymized U.S.-market observations captured by the
 * scheduled Substack monitor on 2026-08-25. Sources are retained internally;
 * member-facing wording is a concise paraphrase. These records are auxiliary,
 * consensus-ineligible and execution-ineligible.
 */
export const cycleResearchMarketClose20260825Records: ResearchRecord[] = [
  {
    id: "CYCLE-RESEARCH-US-MARKET-CLOSE-20260825",
    publishedAt: "2026-08-25",
    sourcePublishedAt: "2026-08-25T04:21:00+08:00",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-25T03:23:14.825Z",
    forecastStart: "2026-08-25",
    accessLevel: "member",
    excludeFromHomeViews: true,
    excludeFromLongTermConsensus: true,
    assetId: "us-equity-market",
    assetName: lt("美股市场", "美股市場", "U.S. Equity Market"),
    market: "index",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "https://agentmat.substack.com/p/closing-update-aug-24-2026",
    publicSourceLabel: lt("周期预测师", "週期預測師", "Cycle Forecaster"),
    sourceProfileId: "cycle-forecaster",
    direction: "bearish",
    editorialConfidence: 45,
    consensusEligible: false,
    horizon: lt(
      "当前下跌阶段；结束时间未明确",
      "當前下跌階段；結束時間未明確",
      "Current down-market phase; no end date stated"
    ),
    title: lt(
      "美股下跌阶段反弹不追",
      "美股下跌階段反彈不追",
      "Do Not Chase Corrective Bounces in the Current U.S. Down Phase"
    ),
    summary: lt(
      "结合这是一则美股收盘更新的页面语境，MOOX将其归入美股整体风险观察。周期预测师把当前环境明确描述为下跌市场，选择不参与艾略特浪式的修正反弹，继续保持耐心并等待更低的配置机会。正文没有明确具体指数、结束日期、价格点位或失效条件，因此这里只记录风险姿态，不修改标普或纳指已经锁定的正式周度方向。",
      "結合這是一則美股收盤更新的頁面語境，MOOX將其歸入美股整體風險觀察。週期預測師把當前環境明確描述為下跌市場，選擇不參與艾略特浪式的修正反彈，繼續保持耐心並等待更低的配置機會。正文沒有明確具體指數、結束日期、價格點位或失效條件，因此這裡只記錄風險姿態，不修改標普或納指已經鎖定的正式週度方向。",
      "Because this appears in the context of a U.S. closing update, MOOX classifies it as a broad U.S.-equity risk observation. The Cycle Forecaster explicitly describes the current environment as a down market, avoids trading Elliott-style corrective bounces, and waits patiently for cheaper entries. The body states no specific index, end date, price level or invalidation condition, so this record captures risk posture only and does not alter the locked S&P 500 or Nasdaq weekly direction."
    ),
    thesis: [
      lt(
        "原文明确把当前环境称为下跌市场。",
        "原文明確把當前環境稱為下跌市場。",
        "The source explicitly characterizes the current environment as a down market."
      ),
      lt(
        "归入美股整体风险是依据收盘更新的页面语境；正文没有明确具体指数。",
        "歸入美股整體風險是依據收盤更新的頁面語境；正文沒有明確具體指數。",
        "The broad U.S.-equity mapping comes from the closing-update context; the body names no specific index."
      ),
      lt(
        "策略是回避修正反弹交易，主要保持观望，仅有少量分批动作，并等待更便宜的机会。",
        "策略是迴避修正反彈交易，主要保持觀望，僅有少量分批動作，並等待更便宜的機會。",
        "The stated posture is to avoid corrective-bounce trades, stay mostly flat, make only small occasional adds, and wait for cheaper opportunities."
      ),
      lt(
        "原文没有明确具体资产、价格点位、结束日期或独立失效条件；网站不得补造。",
        "原文沒有明確具體資產、價格點位、結束日期或獨立失效條件；網站不得補造。",
        "The source states no specific asset, price level, end date or standalone invalidation condition; none may be invented."
      ),
    ],
    invalidation: lt(
      "原文未明确失效条件；不得补造。若来源以后发布明确的反转更新，应新增前向记录并保留本条历史，而不是回写本条。",
      "原文未明確失效條件；不得補造。若來源以後發布明確的反轉更新，應新增前向記錄並保留本條歷史，而不是回寫本條。",
      "The source gives no invalidation condition; none is invented. A later explicit reversal should create a new forward record while preserving this history, not rewrite this entry."
    ),
    risks: [
      lt(
        "这是外部周期风险姿态，只作辅助提醒；不能覆盖MOOX已锁定正式方向，也不参与正式共识计票。",
        "這是外部週期風險姿態，只作輔助提醒；不能覆蓋MOOX已鎖定正式方向，也不參與正式共識計票。",
        "This external cycle-risk posture is auxiliary only; it cannot override MOOX's locked direction or enter formal consensus voting."
      ),
      lt(
        "该记录不得直接触发Bitget或任何自动交易。",
        "該記錄不得直接觸發Bitget或任何自動交易。",
        "This record cannot directly trigger Bitget or any automated trade."
      ),
    ],
    status: "active",
    visibility: "internal",
    tags: [
      "us-equity",
      "cycle",
      "public-analyst",
      "anonymous",
      "research-only",
      "risk-posture",
      "no-explicit-levels",
      "no-explicit-end-date",
      "no-auto-trade",
      "forward-locked",
    ],
  },
  {
    id: "CYCLE-RESEARCH-SPY-DOWNSIDE-20260825",
    publishedAt: "2026-08-25",
    sourcePublishedAt: "2026-08-25T13:57:00+08:00",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-25T09:23:28.399Z",
    forecastStart: "2026-08-26",
    forecastEnd: "2026-08-27",
    expiresAt: "2026-08-28T00:00:00-04:00",
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
    internalSourceRef: "https://agentmat.substack.com/p/spx-forecast-after-aug-24-close",
    publicSourceLabel: lt("周期预测师", "週期預測師", "Cycle Forecaster"),
    sourceProfileId: "cycle-forecaster",
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: false,
    horizon: lt(
      "2026年8月26日至27日（美股交易日）",
      "2026年8月26日至27日（美股交易日）",
      "August 26-27, 2026 (U.S. trading dates)"
    ),
    title: lt(
      "标普ETF下方Gamma目标区观察",
      "標普ETF下方Gamma目標區觀察",
      "S&P ETF Downside Gamma-Level Watch"
    ),
    summary: lt(
      "周期预测师在8月24日收盘后的更新中指出，SPY下方仓位主要集中在760、755和750，并判断8月26日至27日至少可能触及其中两个位置。这里记录的是SPY ETF点位，不是SPX指数点位；该外部市场结构观点与MOOX已锁定的标普冲高回落风险提醒同向，只提高短期防守提醒，不修改正式周度方向。",
      "週期預測師在8月24日收盤後的更新中指出，SPY下方倉位主要集中在760、755和750，並判斷8月26日至27日至少可能觸及其中兩個位置。這裡記錄的是SPY ETF點位，不是SPX指數點位；該外部市場結構觀點與MOOX已鎖定的標普沖高回落風險提醒同向，只提高短期防守提醒，不修改正式週度方向。",
      "In an update after the Aug 24 close, the Cycle Forecaster identifies SPY downside positioning near 760, 755 and 750 and expects at least two of those levels may be reached on Aug 26-27. These are SPY ETF levels, not SPX index levels. The external market-structure view aligns with MOOX's locked rise-then-fade risk warning, increasing short-term caution without changing the formal weekly direction."
    ),
    thesis: [
      lt(
        "原文明确列出SPY下方仓位集中在760、755和750。",
        "原文明確列出SPY下方倉位集中在760、755和750。",
        "The source explicitly lists SPY downside positioning at 760, 755 and 750."
      ),
      lt(
        "原文判断三个位置中至少两个可能到达，并把时间集中在8月26日至27日。",
        "原文判斷三個位置中至少兩個可能到達，並把時間集中在8月26日至27日。",
        "The source expects at least two of the three levels may be reached on Aug 26-27."
      ),
      lt(
        "来源把这些位置归因于SPY的Gamma与仓位结构；网站不得把它们标成SPX指数目标。",
        "來源把這些位置歸因於SPY的Gamma與倉位結構；網站不得把它們標成SPX指數目標。",
        "The source attributes the levels to SPY gamma and positioning structure; the site must not label them as SPX index targets."
      ),
      lt(
        "原文没有给出独立失效条件，也没有把该观点授权为自动交易信号。",
        "原文沒有給出獨立失效條件，也沒有把該觀點授權為自動交易訊號。",
        "The source gives no standalone invalidation condition and does not authorize this view as an automated-trading signal."
      ),
    ],
    invalidation: lt(
      "原文未明确失效条件；不得补造。若截至8月27日美股收盘仍未触及上述三个SPY位置中的至少两个，应在复盘中把该外部路径降级，而不是回写本条记录。",
      "原文未明確失效條件；不得補造。若截至8月27日美股收盤仍未觸及上述三個SPY位置中的至少兩個，應在復盤中把該外部路徑降級，而不是回寫本條記錄。",
      "The source states no invalidation condition; none is invented. If fewer than two of the three SPY levels have been reached by the Aug 27 U.S. close, this auxiliary path should be downgraded in review rather than rewriting this record."
    ),
    turningWindows: [
      {
        id: "spy-downside-window-20260826-27",
        start: "2026-08-26",
        end: "2026-08-27",
        label: lt("下方Gamma位置触达窗口", "下方Gamma位置觸達窗口", "Downside gamma-level window"),
        note: lt(
          "按美股交易日展示；原文未明确时区。760、755、750均为SPY ETF位置。",
          "按美股交易日展示；原文未明確時區。760、755、750均為SPY ETF位置。",
          "Shown by U.S. trading date; the source states no timezone. The 760, 755 and 750 levels all refer to the SPY ETF."
        ),
      },
    ],
    risks: [
      lt(
        "该观点是市场结构辅助，只提高标普短期冲高回落风险提醒；不能覆盖或反转MOOX已锁定正式方向。",
        "該觀點是市場結構輔助，只提高標普短期沖高回落風險提醒；不能覆蓋或反轉MOOX已鎖定正式方向。",
        "This is an auxiliary market-structure view that only strengthens the short-term S&P fade-risk warning; it cannot override or reverse MOOX's locked direction."
      ),
      lt(
        "该记录不进入正式共识计票，也不得直接触发Bitget或任何自动交易。",
        "該記錄不進入正式共識計票，也不得直接觸發Bitget或任何自動交易。",
        "This record is excluded from formal consensus voting and cannot directly trigger Bitget or any automated trade."
      ),
    ],
    status: "active",
    visibility: "internal",
    tags: [
      "sp500",
      "spy",
      "gex",
      "market-flow",
      "public-analyst",
      "anonymous",
      "research-only",
      "levels-are-spy-not-spx",
      "no-auto-trade",
      "forward-locked",
    ],
  },
];
