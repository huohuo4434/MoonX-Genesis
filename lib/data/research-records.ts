/**
 * The complete curated MoonX research record set: Oracle Six Yao records,
 * the Qimen China Equity Long-Range collection, anonymized public analyst
 * views, and MoonX's independent internal technical record.
 *
 * This is the source of truth consumed by the Research Library
 * (`/research/library`), the Consensus Engine (`lib/research/consensus-engine.ts`),
 * and the Strategic Watchlist / Timeline pages.
 *
 * "Database-ready" pattern: data lives in a plain array here; access is
 * only ever through the async functions below so a future swap to a real
 * database requires no call-site changes.
 *
 * IMPORTANT: `internalSourceRef` must never be rendered on a public page.
 * Always display `publicSourceLabel` instead.
 */
import { lt } from "@/lib/i18n/config";
import {
  annualRiskEquityCollections,
  annualRiskEquityRecords,
} from "@/lib/data/annual-risk-equity-2026";
import { chinaEquityOracle0727Records } from "@/lib/data/china-equity-oracle-0727";
import { curatedImportRecords } from "@/lib/data/curated-import-records";
import { externalObservations } from "@/lib/data/external-observations";
import { externalViewpoints20260801 } from "@/lib/data/external-viewpoints-20260801";
import { coreMarketLiuyao20260801Records } from "@/lib/data/core-market-liuyao-20260801";
import { usIndexLiuyao20260809Records } from "@/lib/data/us-index-liuyao-20260809";
import { externalWolfUsIndices20260809 } from "@/lib/data/external-wolf-us-indices-20260809";
import { teacherResearch20260815 } from "@/lib/data/teacher-research-20260815";
import { remainingCoreMarketLiuyao20260801Records } from "@/lib/data/core-market-liuyao-remaining-20260801";
import { externalViewpointsFollowup20260801 } from "@/lib/data/external-viewpoints-followup-20260801";
import { teacher02Liuyao20260802Records } from "@/lib/data/teacher02-liuyao-20260802";
import { teacher02Liuyao20260823Records } from "@/lib/data/teacher02-liuyao-20260823";
import { btcLiuyao20260727Records } from "@/lib/data/btc-liuyao-20260727";
import { btcMarketBazi20260820Records } from "@/lib/data/btc-market-bazi-20260820";
import { cycleResearchFcx20260822Records } from "@/lib/data/cycle-research-fcx-20260822";
import { cycleResearchBtcGold20260823Records } from "@/lib/data/cycle-research-btc-gold-20260823";
import { researchPack20260823 } from "@/lib/data/research-pack-20260823";
import { qimenRotationPostRecords20260823 } from "@/lib/data/qimen-rotation-post-20260823";
import { externalIndicatorResearchRecords20260823 } from "@/lib/data/external-indicators-20260823";
import { cycleResearchUsIndices20260824Records } from "@/lib/data/cycle-research-us-indices-20260824";
import { oilSseLiuyao2026Records } from "@/lib/data/oil-sse-liuyao-2026";
import { wtiPathExt20260807Records } from "@/lib/data/wti-path-ext-20260807";
import {
  preciousMetalsCryptoCollections,
  preciousMetalsCryptoOracleRecords,
} from "@/lib/data/precious-metals-crypto-oracle-0727";
import type { ResearchCollection, ResearchRecord } from "@/types/research";

export const researchCollections: ResearchCollection[] = [
  {
    id: "qimen-china-equity-h2-2026",
    title: lt(
      "2026年下半年中国权益市场长期情景",
      "2026年下半年中國權益市場長期情境",
      "China Equity Long-Range Scenario — H2 2026"
    ),
    description: lt(
      "私人导师研究，基于奇门遁甲与宏观周期框架，覆盖上证指数、恒生科技指数、美股科技与中国科技的下半年情景。",
      "私人導師研究，基於奇門遁甲與宏觀週期框架，涵蓋上證指數、恆生科技指數、美股科技與中國科技的下半年情境。",
      "Private teacher research using Qimen and macro-cycle frameworks, covering Shanghai Composite, Hang Seng TECH Index, US tech, and China tech scenarios for H2 2026."
    ),
    frameworks: ["qimen", "macro"],
    sourceType: "private-teacher",
    publishedAt: "2026-07-26",
    forecastStart: "2026-08-01",
    forecastEnd: "2027-02-04",
  },
  ...preciousMetalsCryptoCollections,
  ...annualRiskEquityCollections,
];

const researchRecords: ResearchRecord[] = [
  // ================================================================
  // ORACLE / SIX YAO RECORDS
  // ================================================================
  {
    id: "ORACLE-0001",
    aliases: ["oracle-ndx-2026-07-21-2026-08-21"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-08-21",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    market: "index",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "slightly-bearish",
    editorialConfidence: 72,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("2026-07-21 至 2026-08-21", "2026-07-21 至 2026-08-21", "2026-07-21 to 2026-08-21"),
    title: lt("纳斯达克缓慢回落情景", "納斯達克緩慢回落情境", "Nasdaq Gradual Decline Scenario"),
    rawSource: lt(
      "整体属于缓慢下行，不属于快速崩盘。下跌过程中存在阶段反弹和逐步布局机会。",
      "整體屬於緩慢下行，不屬於快速崩盤。下跌過程中存在階段反彈和逐步佈局機會。",
      "Overall gradual decline, not a crash. Stage rebounds and staged accumulation opportunities may appear."
    ),
    summary: lt(
      "大方向偏缓慢调整，期间可能反复反弹。重点不是追逐单日涨跌，而是观察7月底至8月初的转折窗口。中文方向：缓慢偏空。",
      "大方向偏緩慢調整，期間可能反覆反彈。重點不是追逐單日漲跌，而是觀察7月底至8月初的轉折窗口。中文方向：緩慢偏空。",
      "Higher-horizon bias is gradual digestion with intermittent rebounds. Focus on late-July to early-August turn windows rather than single-day moves. Display direction: gradually bearish."
    ),
    moonxInterpretation: lt(
      "缓慢偏空。关键窗口：2026-07-27至07-28；2026-07-31至08-07。",
      "緩慢偏空。關鍵窗口：2026-07-27至07-28；2026-07-31至08-07。",
      "Gradually bearish. Key windows: 2026-07-27–07-28; 2026-07-31–08-07."
    ),
    thesis: [
      lt(
        "缓慢回落情景优先于快速崩盘情景。",
        "緩慢回落情境優先於快速崩盤情境。",
        "A gradual-decline scenario is favored over a sharp-crash scenario."
      ),
      lt(
        "回落过程可能逐渐形成分批观察和布局机会。",
        "回落過程可能逐漸形成分批觀察和布局機會。",
        "The decline may gradually create staged observation and accumulation opportunities."
      ),
    ],
    turningWindows: [
      { id: "ndx-jul27-28", start: "2026-07-27", end: "2026-07-28", label: lt("短暂反弹窗口", "短暫反彈窗口", "Brief rebound window") },
      { id: "ndx-jul31-aug7", start: "2026-07-31", end: "2026-08-07", label: lt("重要转折 / 可能低点", "重要轉折 / 可能低點", "Important turn / possible low") },
    ],
    supports: [7315, 7212],
    resistances: [7420, 7450],
    status: "active",
    tags: ["nasdaq", "oracle-six-yao", "gradual-decline", "strategic"],
  },
  {
    id: "ORACLE-0002",
    aliases: ["oracle-ndx-one-year-2026-2027"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2027-07-31",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    market: "index",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "neutral",
    editorialConfidence: 65,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("未来一年", "未來一年", "One-year outlook"),
    title: lt("纳斯达克年度低点窗口研究", "納斯達克年度低點窗口研究", "Nasdaq Annual Low-Window Study"),
    summary: lt(
      "一年周期内可能经历两次重要低点，随后于2027年第二季度至第三季度逐渐修复。方向：mixed。",
      "一年週期內可能經歷兩次重要低點，隨後於2027年第二季度至第三季度逐漸修復。方向：mixed。",
      "The one-year path may include two important lows, then gradual repair through 2027 Q2–Q3. Direction: mixed."
    ),
    thesis: [
      lt(
        "2026年11月至12月：可能存在重要低点窗口。",
        "2026年11月至12月：可能存在重要低點窗口。",
        "November–December 2026: a possible important low window."
      ),
      lt(
        "2027年2月至3月：另一个可能的低点窗口。",
        "2027年2月至3月：另一個可能的低點窗口。",
        "February–March 2027: another possible low window."
      ),
      lt(
        "2027年4月至7月：偏向修复窗口。",
        "2027年4月至7月：偏向修復窗口。",
        "April–July 2027: a recovery-leaning window."
      ),
    ],
    turningWindows: [
      {
        id: "oracle-0002-nov-dec-2026",
        start: "2026-11-01",
        end: "2026-12-31",
        label: lt("可能重要低点窗口", "可能重要低點窗口", "Possible important low window"),
      },
      {
        id: "oracle-0002-feb-mar-2027",
        start: "2027-02-01",
        end: "2027-03-31",
        label: lt("第二个可能低点窗口", "第二個可能低點窗口", "Second possible low window"),
      },
      {
        id: "oracle-0002-apr-jul-2027",
        start: "2027-04-01",
        end: "2027-07-31",
        label: lt("修复窗口", "修復窗口", "Recovery window"),
      },
    ],
    status: "active",
    tags: ["nasdaq", "oracle-six-yao", "long-range", "strategic"],
  },
  {
    id: "ORACLE-0003",
    aliases: ["oracle-semiconductor-2026-08-07"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-09-30",
    assetId: "semiconductors-storage",
    assetName: lt("半导体与存储", "半導體與儲存", "Semiconductors & Storage"),
    symbol: "SOX",
    market: "semiconductor",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "neutral",
    editorialConfidence: 73,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("半导体8月转折情景", "半導體8月轉折情境", "Semiconductor August Turning Scenario"),
    summary: lt(
      "短期偏弱，中期等待8月上旬后的修复，9月至10月关注更大级别低点。方向：mixed。",
      "短期偏弱，中期等待8月上旬後的修復，9月至10月關注更大級別低點。方向：mixed。",
      "Near-term soft, then repair after early August; September–October watches a larger low. Direction: mixed."
    ),
    thesis: [
      lt(
        "8月7日之前维持偏弱情景。",
        "8月7日之前維持偏弱情境。",
        "Weakness scenario persists into August 7."
      ),
      lt(
        "8月7日之后可能逐步修复。",
        "8月7日之後可能逐步修復。",
        "A gradual recovery is possible after August 7."
      ),
      lt(
        "9月至10月仍需要观察二次调整或更大底部窗口。",
        "9月至10月仍需要觀察二次調整或更大底部窗口。",
        "September–October still watches a secondary digestion or larger trough window."
      ),
    ],
    turningWindows: [
      {
        id: "oracle-0003-aug7",
        date: "2026-08-07",
        label: lt("可能修复转折点", "可能修復轉折點", "Possible recovery turning point"),
      },
      {
        id: "oracle-0003-sep-oct",
        start: "2026-09-01",
        end: "2026-10-31",
        label: lt("二次调整 / 更大底部观察", "二次調整 / 更大底部觀察", "Secondary digestion / larger trough watch"),
      },
    ],
    status: "active",
    tags: ["semiconductor", "oracle-six-yao", "strategic"],
  },
  {
    id: "ORACLE-0004",
    aliases: ["oracle-sandisk-2026-h2"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-10-31",
    assetId: "semiconductors-storage",
    assetName: lt("闪迪", "閃迪", "Sandisk"),
    symbol: "SNDK",
    market: "semiconductor",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "bullish",
    editorialConfidence: 70,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("中期", "中期", "Medium term"),
    title: lt("闪迪周期：先弱后强", "閃迪週期：先弱後強", "Sandisk Cycle: Weak Then Strong"),
    summary: lt(
      "8月7日前偏弱；之后缓慢回升；9月7日后上涨力量可能增强。显示方向：先弱后强。",
      "8月7日前偏弱；之後緩慢回升；9月7日後上漲力量可能增強。顯示方向：先弱後強。",
      "Weak into August 7; slow recovery afterward; upside may strengthen after September 7. Display: weak then strong."
    ),
    thesis: [
      lt(
        "8月7日前偏弱。",
        "8月7日前偏弱。",
        "Weak into August 7."
      ),
      lt(
        "此后可能缓慢回升。",
        "此後可能緩慢回升。",
        "A slow recovery is possible afterward."
      ),
      lt(
        "9月7日后上涨动能可能增强。",
        "9月7日後上漲動能可能增強。",
        "Upside momentum may strengthen after September 7."
      ),
    ],
    turningWindows: [
      {
        id: "oracle-0004-aug7",
        date: "2026-08-07",
        label: lt("疲软转修复窗口", "疲軟轉修復窗口", "Weakness-to-recovery window"),
      },
      {
        id: "oracle-0004-sep7",
        date: "2026-09-07",
        label: lt("可能加速窗口", "可能加速窗口", "Possible acceleration window"),
      },
    ],
    status: "active",
    tags: ["storage", "sandisk", "oracle-six-yao", "strategic"],
  },
  {
    id: "ORACLE-0005",
    publishedAt: "2026-07-21",
    forecastStart: "2028-09-01",
    forecastEnd: "2035-12-31",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克 / 全球风险资产", "納斯達克 / 全球風險資產", "Nasdaq / Global Risk Assets"),
    symbol: "NDX",
    market: "index",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "neutral",
    editorialConfidence: 55,
    consensusEligible: false,
    isLongRange: true,
    horizon: lt("长期推测情景（2028–2035）", "長期推測情境（2028–2035）", "Long-range speculative scenario (2028–2035)"),
    title: lt("全球风险资产长期周期研究", "全球風險資產長期週期研究", "Global Risk Assets Long-Range Cycle Study"),
    summary: lt(
      "长期研究情景认为，2028年秋季开始需重点关注系统性风险。2028年至2029年可能出现全球金融风险窗口；2030年偏向修复，2031年至2032年改善，2034年至2035年进入较强阶段。",
      "長期研究情境認為，2028年秋季開始需重點關注系統性風險。2028年至2029年可能出現全球金融風險窗口；2030年偏向修復，2031年至2032年改善，2034年至2035年進入較強階段。",
      "This long-range scenario suggests systemic risk deserves close attention starting autumn 2028. A possible global financial stress window may appear in 2028–2029; 2030 leans toward recovery, 2031–2032 improves, and 2034–2035 enters a stronger phase."
    ),
    thesis: [
      lt("2028年秋季：风险开始上升。", "2028年秋季：風險開始上升。", "Autumn 2028: risk begins to increase."),
      lt("2028年至2029年：可能出现全球金融风险窗口。", "2028年至2029年：可能出現全球金融風險窗口。", "2028–2029: a possible global financial stress window."),
      lt("2030年：修复阶段。", "2030年：修復階段。", "2030: recovery."),
      lt("2031年至2032年：周期改善。", "2031年至2032年：週期改善。", "2031–2032: improving cycle."),
      lt("2034年至2035年：较强阶段。", "2034年至2035年：較強階段。", "2034–2035: stronger cycle."),
    ],
    turningWindows: [
      { id: "oracle-0005-autumn-2028", start: "2028-09-01", end: "2028-11-30", label: lt("风险开始上升", "風險開始上升", "Risk begins to increase") },
      { id: "oracle-0005-2028-2029", start: "2028-09-01", end: "2029-12-31", label: lt("全球金融风险窗口", "全球金融風險窗口", "Possible global financial stress window") },
      { id: "oracle-0005-2030", start: "2030-01-01", end: "2030-12-31", label: lt("修复", "修復", "Recovery") },
      { id: "oracle-0005-2031-2032", start: "2031-01-01", end: "2032-12-31", label: lt("改善周期", "改善週期", "Improving cycle") },
      { id: "oracle-0005-2034-2035", start: "2034-01-01", end: "2035-12-31", label: lt("较强阶段", "較強階段", "Stronger cycle") },
    ],
    status: "pending",
    tags: ["nasdaq", "global-risk-assets", "oracle-six-yao", "long-range-speculative"],
  },
  {
    id: "ORACLE-0006",
    aliases: ["oracle-btc-2026-07-21-2026-08-15"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-08-15",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "bullish",
    editorialConfidence: 76,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("2026-07-21 至 2026-08-15", "2026-07-21 至 2026-08-15", "2026-07-21 to 2026-08-15"),
    title: lt("比特币中期六爻：70000挑战情景", "比特幣中期六爻：70000挑戰情境", "Bitcoin Medium-Term Six Yao: 70,000 Challenge"),
    rawSource: lt(
      "8月15日前，比特币突破或触及70000美元的可能性较高。",
      "8月15日前，比特幣突破或觸及70000美元的可能性較高。",
      "Before August 15, Bitcoin has a relatively high probability of breaking or reaching $70,000."
    ),
    summary: lt(
      "中期总体偏多，短期允许出现回调和震荡。大周期方向偏向向上测试70000附近，但必须结合关键支撑、突破确认和失效条件观察。不代表价格会直线上涨，也不代表每日都收涨。",
      "中期總體偏多，短期允許出現回調與震盪。大週期方向偏向上測試70000附近，但必須結合關鍵支撐、突破確認和失效條件觀察。不代表價格會直線上漲，也不代表每日都收漲。",
      "Medium-term bias is bullish with room for near-term pullbacks. Higher-horizon path leans toward testing ~70,000, subject to support, breakout confirmation, and invalidation. Not a straight-line or every-day-up call."
    ),
    moonxInterpretation: lt(
      "战略预测 · bullish。关键目标 70000。验证中。",
      "戰略預測 · bullish。關鍵目標 70000。驗證中。",
      "Strategic · bullish. Key target 70000. Active verification."
    ),
    thesis: [
      lt(
        "8月15日前存在挑战或突破70,000美元的较高可能性。",
        "8月15日前存在挑戰或突破70,000美元的較高可能性。",
        "A relatively high probability of challenging or breaking $70,000 before August 15."
      ),
      lt(
        "这是中期趋势预测，不代表价格会直线上涨，也不代表每日都收涨。",
        "這是中期趨勢預測，不代表價格會直線上漲，也不代表每日都收漲。",
        "This is a medium-term trend forecast — not a straight-line advance or every-day-up path."
      ),
    ],
    targets: [70000],
    resistances: [70000],
    supports: [64650, 63412],
    risks: [
      lt(
        "若关键支撑持续失守，该情景需要重新评估。",
        "若關鍵支撐持續失守，該情境需要重新評估。",
        "If key support levels continue to fail, this scenario would need to be reassessed."
      ),
    ],
    status: "active",
    tags: ["bitcoin", "oracle-six-yao", "70000-target", "strategic"],
  },
  {
    id: "ORACLE-0007",
    aliases: ["oracle-gold-before-2026-08-07"],
    publishedAt: "2026-07-21",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-08-07",
    assetId: "gold",
    assetName: lt("国际黄金", "國際黃金", "International Gold"),
    symbol: "XAU",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "neutral",
    editorialConfidence: 68,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("截至2026-08-07", "截至2026-08-07", "Through 2026-08-07"),
    title: lt("黄金4200压力情景", "黃金4200壓力情境", "Gold 4,200 Resistance Scenario"),
    summary: lt(
      "8月7日前突破4200的难度较大，整体偏中性或略偏空。震荡观察区 4060–4200。点位属于研究情景快照，不是实时行情。",
      "8月7日前突破4200的難度較大，整體偏中性或略偏空。震盪觀察區 4060–4200。點位屬於研究情景快照，不是即時行情。",
      "Breaking 4200 before August 7 is difficult; bias is neutral to slightly soft. Range watch 4060–4200. Levels are research snapshots, not live prices."
    ),
    thesis: [
      lt(
        "8月7日前突破4,200的难度较大。",
        "8月7日前突破4,200的難度較大。",
        "Breaking above 4,200 before August 7 faces meaningful difficulty."
      ),
      lt("支撑位：4060、3942。", "支撐位：4060、3942。", "Supports: 4060, 3942."),
      lt("压力位：4200、4303至4333。", "壓力位：4200、4303至4333。", "Resistance: 4200, 4303–4333."),
    ],
    supports: [4060, 3942],
    resistances: [4200, 4303, 4333],
    status: "active",
    tags: ["gold", "oracle-six-yao", "strategic"],
  },
  {
    id: "ORACLE-0008",
    publishedAt: "2026-07-01",
    forecastStart: "2026-07-01",
    forecastEnd: "2026-12-31",
    assetId: "general-market",
    assetName: lt("美联储 / 宏观政策", "美聯儲 / 宏觀政策", "Federal Reserve / Macro Policy"),
    market: "index",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "slightly-bearish",
    editorialConfidence: 62,
    consensusEligible: true,
    horizon: lt("2026年下半年", "2026年下半年", "2026 H2"),
    title: lt(
      "美联储2026年下半年加息风险",
      "美聯儲2026年下半年加息風險",
      "Federal Reserve H2 2026 Rate-Hike Risk"
    ),
    summary: lt(
      "鹰派表态可能在2026年8月7日后增强；若年底前实际加息，主要风险窗口在10–11月。实际紧缩并非基准情景，市场恐惧可能强于最终政策行动。",
      "鷹派表態可能在2026年8月7日後增強；若年底前實際加息，主要風險窗口在10–11月。實際緊縮並非基準情境，市場恐懼可能強於最終政策行動。",
      "Hawkish policy rhetoric may strengthen after approximately 2026-08-07. If an actual rate increase occurs before year-end, the main risk window is October to November 2026. Actual tightening is not the base case; market fear may be stronger than the final policy action."
    ),
    thesis: [
      lt(
        "鹰派表态可能在2026年8月7日后增强。",
        "鷹派表態可能在2026年8月7日後增強。",
        "Hawkish policy rhetoric may strengthen after approximately 2026-08-07."
      ),
      lt(
        "若年底前实际加息，主要风险窗口在2026年10–11月。",
        "若年底前實際加息，主要風險窗口在2026年10–11月。",
        "If an actual rate increase occurs before year-end, the main risk window is October to November 2026."
      ),
      lt(
        "原六冲结构暗示政策反复与不确定性。",
        "原六沖結構暗示政策反覆與不確定性。",
        "The original six-conflict structure suggests repeated changes and policy uncertainty."
      ),
      lt(
        "市场恐惧可能强于最终政策行动。",
        "市場恐懼可能強於最終政策行動。",
        "Market fear may be stronger than the final policy action."
      ),
      lt(
        "实际紧缩并非基准情景。",
        "實際緊縮並非基準情境。",
        "Actual tightening is not the base case."
      ),
      lt(
        "经济偏弱将使实际加息更困难。",
        "經濟偏弱將使實際加息更困難。",
        "Weak economic conditions would make an actual rate increase more difficult."
      ),
      lt(
        "即使出现紧缩，负面市场影响可能剧烈但短暂。",
        "即使出現緊縮，負面市場影響可能劇烈但短暫。",
        "Even if tightening occurs, the negative market impact may be sharp but temporary."
      ),
    ],
    turningWindows: [
      {
        id: "oracle-0008-aug7",
        date: "2026-08-07",
        label: lt("鹰派意图观察窗口", "鷹派意圖觀察窗口", "Hawkish-intention observation window"),
      },
      {
        id: "oracle-0008-oct-nov",
        start: "2026-10-01",
        end: "2026-11-30",
        label: lt("紧缩风险窗口", "緊縮風險窗口", "Tightening-risk window"),
      },
    ],
    verificationChecklist: [
      lt("8月7日后美联储表态是否转鹰？", "8月7日後美聯儲表態是否轉鷹？", "Did Fed statements become more hawkish after August 7?"),
      lt("通胀是否加速？", "通脹是否加速？", "Did inflation accelerate?"),
      lt("美债收益率是否上升？", "美債收益率是否上升？", "Did Treasury yields rise?"),
      lt("是否讨论实际加息？", "是否討論實際加息？", "Was an actual rate increase discussed?"),
      lt("是否实施实际加息？", "是否實施實際加息？", "Was an actual rate increase implemented?"),
      lt("市场反应是短暂还是持续？", "市場反應是短暫還是持續？", "Was the market reaction temporary or persistent?"),
    ],
    status: "pending",
    tags: ["fed", "macro", "oracle-six-yao", "rate-hike", "oracle-0008"],
  },
  {
    id: "ORACLE-0009",
    aliases: ["BTC-2026-ANNUAL-ORACLE-001", "MX-BTC-2026-ANNUAL-001"],
    publishedAt: "2026-07-01",
    forecastStart: "2026-07-01",
    forecastEnd: "2026-12-31",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: {
      overall: lt("中高", "中高", "Medium-high"),
      strengths: [
        lt("年度大方向", "年度大方向", "Annual big-picture direction"),
        lt("高点月份", "高點月份", "High months"),
        lt("上涨目标判断", "上漲目標判斷", "Upside target judgment"),
        lt("重大转折窗口", "重大轉折窗口", "Major turning windows"),
      ],
      weaknesses: [
        lt("精确低点月份", "精確低點月份", "Exact low months"),
        lt("下跌目标价格判断", "下跌目標價格判斷", "Downside target-price judgment"),
        lt("极短线逐日点位", "極短線逐日點位", "Ultra-short daily price points"),
      ],
      note: lt(
        "用户复核其2024年至2026年历史研究后形成的定性评价。高点月份、年度结构及风险事件性质相对较强，低点和下跌目标准确性较弱；尚未完成正式样本统计，不得显示为百分比历史准确率。",
        "用戶複核其2024年至2026年歷史研究後形成的定性評價。高點月份、年度結構及風險事件性質相對較強，低點和下跌目標準確性較弱；尚未完成正式樣本統計，不得顯示為百分比歷史準確率。",
        "Qualitative evaluation after reviewing 2024–2026 history. Stronger on high months, annual structure, and risk-event character; weaker on lows and downside targets. Formal sample stats incomplete — do not show as a percentage hit rate."
      ),
    },
    direction: "neutral",
    editorialConfidence: 74,
    researchScore: 74,
    consensusEligible: true,
    layer: "strategic",
    isLongRange: true,
    sourceStatus: "summary_only",
    collectionId: "crypto-long-range-research-2026",
    ratingDisplay: lt("中性", "中性", "Neutral"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    horizon: lt(
      "至2026年9月及年底目标验证（延伸至2027年1月）",
      "至2026年9月及年底目標驗證（延伸至2027年1月）",
      "Through September 2026 and year-end verification (extends to Jan 2027)"
    ),
    title: lt(
      "比特币2026年偏弱格局中的7月至9月阶段性反弹",
      "比特幣2026年偏弱格局中的7月至9月階段性反彈",
      "Bitcoin 2026: staged Jul–Sep rebound inside a softer year"
    ),
    summary: lt(
      "研究认为BTC在2026年整体强度弱于2025年，不太像持续爆发的大牛市；3月及5月至6月属于潜在低点窗口，7月至8月偏向缓慢反弹，9月可能形成下半年主要高点或转折，2027年1月可能出现次级高点或反弹。",
      "研究認為BTC在2026年整體強度弱於2025年，不太像持續爆發的大牛市；3月及5月至6月屬於潛在低點窗口，7月至8月偏向緩慢反彈，9月可能形成下半年主要高點或轉折，2027年1月可能出現次級高點或反彈。",
      "Research sees BTC’s 2026 strength weaker than 2025 — less like a sustained explosive bull. March and May–June are potential low windows; July–August lean slow rebound; September may form the H2 main high or turn; January 2027 may bring a secondary high or rebound."
    ),
    moonxInterpretation: lt(
      "保留既有价格目标证据：85,000可达、90,000可能、95,000概率较低。低点窗口仅为辅助观察，编辑置信度不超过50%，不得宣传为已经完全命中。",
      "保留既有價格目標證據：85,000可達、90,000可能、95,000機率較低。低點窗口僅為輔助觀察，編輯置信度不超過50%，不得宣傳為已經完全命中。",
      "Keep existing target evidence: 85k achievable, 90k possible, 95k less likely. Low windows are auxiliary only (≤50% editorial weight) and must not be promoted as fully hit."
    ),
    thesis: [
      lt("兄弟巳火持世，限制2026年上涨效率", "兄弟巳火持世，限制2026年上漲效率", "Sibling Si-Fire holds self — limits 2026 upside efficiency"),
      lt("子孙辰土临应，长期外部环境和未来潜力仍然存在", "子孫辰土臨應，長期外部環境和未來潛力仍然存在", "Child Chen-Earth on response — longer-term environment and future potential remain"),
      lt("世爻生应爻，标的能量更多流向未来环境，而非当年价格立即兑现", "世爻生應爻，標的能量更多流向未來環境，而非當年價格立即兌現", "Self generates response — energy flows more to future environment than same-year immediate price release"),
      lt("妻财酉金伏于子孙未土之下", "妻財酉金伏於子孫未土之下", "Wealth You-Metal hides under child Wei-Earth"),
      lt("起卦时申酉空，财爻既伏藏又旬空", "起卦時申酉空，財爻既伏藏又旬空", "At cast time Shen–You are empty — wealth is both hidden and decade-empty"),
      lt("未月子孙生财，申月帮财，酉月财爻临值，形成7月至9月逐步走强路径", "未月子孫生財，申月幫財，酉月財爻臨值，形成7月至9月逐步走強路徑", "Wei month: child generates wealth; Shen helps wealth; You month wealth is on value — Jul–Sep gradual strengthening path"),
      lt("【历史待复盘 · 低权重≤50%】3月及5月至6月潜在低点窗口，不作确定命中宣传。", "【歷史待復盤 · 低權重≤50%】3月及5月至6月潛在低點窗口，不作確定命中宣傳。", "Historical pending review · low weight ≤50%: Mar and May–Jun potential low windows — do not promote as confirmed hits."),
      lt("原老师价格目标证据保留：85,000可达；90,000可能；95,000相对不太可能。", "原老師價格目標證據保留：85,000可達；90,000可能；95,000相對不太可能。", "Retain teacher price targets: 85k achievable; 90k possible; 95k relatively unlikely."),
    ],
    monthlyActivation: [
      {
        period: "2026年3月附近",
        earthlyBranch: "卯月",
        mechanism: "父母卯木临值并生旺兄弟巳火、午火，兄弟增强后不利妻财酉金。",
        expectedEffect: "低点或弱势窗口候选。",
        signalDirectness: "间接",
        reliability: "中低",
      },
      {
        period: "2026年5月至6月",
        earthlyBranch: "巳月、午月",
        mechanism: "兄弟巳火持世并在巳月临值，兄弟午火在午月临值，兄弟旺而耗财、制约财酉金。",
        expectedEffect: "全年主要弱势或低位窗口候选。",
        signalDirectness: "间接",
        reliability: "中",
      },
      {
        period: "2026年7月",
        earthlyBranch: "未月",
        mechanism: "子孙未土临值，直接生扶伏藏的妻财酉金。",
        expectedEffect: "价格开始缓慢修复上涨。",
        signalDirectness: "半直接",
        reliability: "中高",
      },
      {
        period: "2026年8月",
        earthlyBranch: "申月",
        mechanism: "申金与财酉金同类相助，同时申酉空逐渐得到填实。",
        expectedEffect: "反弹延续，但受兄弟持世限制，涨势仍可能偏疲软。",
        signalDirectness: "半直接",
        reliability: "中高",
      },
      {
        period: "2026年9月",
        earthlyBranch: "酉月",
        mechanism: "伏藏的妻财酉金临值、填实并获得最直接月令。",
        expectedEffect: "2026年下半年主要高点或重要转折窗口。",
        signalDirectness: "直接",
        reliability: "高",
      },
      {
        period: "2027年1月",
        earthlyBranch: "丑月",
        mechanism: "丑土生财酉金，并可能与世爻巳火、财爻酉金形成巳酉丑三合金局。",
        expectedEffect: "次级高点或较强反弹窗口。",
        signalDirectness: "半直接",
        reliability: "中高",
      },
    ],
    scenarios: [
      {
        name: lt("7月至8月缓慢反弹", "7月至8月緩慢反彈", "Jul–Aug slow rebound"),
        probability: 65,
        start: "2026-07-01",
        end: "2026-08-31",
      },
      {
        name: lt("9月主要高点或转折风险窗口", "9月主要高點或轉折風險窗口", "September main high / turn risk"),
        probability: 78,
        start: "2026-09-01",
        end: "2026-09-30",
      },
      {
        name: lt("2027年1月次级高点或反弹窗口", "2027年1月次級高點或反彈窗口", "Jan 2027 secondary high / rebound"),
        probability: 60,
        start: "2027-01-01",
        end: "2027-01-31",
      },
    ],
    targets: [70000, 85000, 90000, 95000],
    turningWindows: [
      {
        id: "oracle-0009-mar-low",
        start: "2026-03-01",
        end: "2026-03-31",
        label: lt("潜在低点窗口（低权重·待复盘）", "潛在低點窗口（低權重·待復盤）", "Potential low window (low weight · pending review)"),
      },
      {
        id: "oracle-0009-may-jun-low",
        start: "2026-05-01",
        end: "2026-06-30",
        label: lt("潜在低点窗口（低权重·待复盘）", "潛在低點窗口（低權重·待復盤）", "Potential low window (low weight · pending review)"),
      },
      {
        id: "oracle-0009-jul-aug-rebound",
        start: "2026-07-01",
        end: "2026-08-31",
        label: lt("7月至8月缓慢反弹", "7月至8月緩慢反彈", "Jul–Aug slow rebound"),
      },
      {
        id: "oracle-0009-sep-high",
        start: "2026-09-01",
        end: "2026-09-30",
        label: lt("9月主要高点或转折风险窗口", "9月主要高點或轉折風險窗口", "September main high / turn risk"),
      },
      {
        id: "oracle-0009-jan-2027",
        start: "2027-01-01",
        end: "2027-01-31",
        label: lt("2027年1月次级高点或反弹窗口", "2027年1月次級高點或反彈窗口", "Jan 2027 secondary high / rebound"),
      },
    ],
    verificationChecklist: [
      lt("比特币是否突破70,000？", "比特幣是否突破70,000？", "Did Bitcoin break 70,000?"),
      lt("比特币是否达到85,000？", "比特幣是否達到85,000？", "Did Bitcoin reach 85,000?"),
      lt("比特币是否达到90,000？", "比特幣是否達到90,000？", "Did Bitcoin reach 90,000?"),
      lt("比特币是否达到95,000？", "比特幣是否達到95,000？", "Did Bitcoin reach 95,000?"),
      lt("下半年主要高点是否出现在9月？", "下半年主要高點是否出現在9月？", "Did the main second-half high occur in September?"),
      lt("最高价格是多少？", "最高價格是多少？", "What was the maximum price?"),
      lt("反弹前最大回撤是多少？", "反彈前最大回撤是多少？", "What was the maximum drawdown before the rebound?"),
    ],
    status: "pending",
    tags: ["bitcoin", "oracle-six-yao", "85000-target", "oracle-0009", "annual", "private-mentor-01"],
    disclaimer: lt(
      "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
      "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
      "Traditional symbolic research is a non-scientific verification framework and does not constitute investment advice."
    ),
  },

  // ================================================================
  // QIMEN LONG-RANGE RESEARCH — China Equity Long-Range Scenario H2 2026
  // ================================================================
  {
    id: "QIMEN-A-SHARES-2026-H2",
    aliases: ["research-a-share-2026-h2"],
    publishedAt: "2026-07-26",
    forecastStart: "2026-07-27",
    forecastEnd: "2027-01-31",
    assetId: "shanghai-composite",
    assetName: lt("上证指数", "上證指數", "Shanghai Composite"),
    symbol: "SSE",
    market: "china-equity",
    framework: "qimen",
    sourceType: "private-teacher",
    publicSourceLabel: lt("奇门研究", "奇門研究", "Qimen Research"),
    direction: "strong-bullish",
    editorialConfidence: 80,
    consensusEligible: true,
    collectionId: "qimen-china-equity-h2-2026",
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("2026年7月底至2027年1月", "2026年7月底至2027年1月", "Late July 2026 to January 2027"),
    title: lt(
      "A股左侧布局与年底行情长期情景",
      "A股左側佈局與年底行情長期情境",
      "A-Shares Left-Side Positioning & Year-End Rally Scenario"
    ),
    summary: lt(
      "中长期偏多。7–8月震荡与左侧布局；8月22日前后重要上涨观察；9月趋势强化；10月高波动并存在向4500附近运行的情景；11月至次年1月年底行情，长期情景观察5000。4500与5000为老师情景目标，非MoonX保证目标。",
      "中長期偏多。7–8月震盪與左側佈局；8月22日前後重要上漲觀察；9月趨勢強化；10月高波動並存在向4500附近運行的情景；11月至次年1月年底行情，長期情景觀察5000。4500與5000為老師情景目標，非MoonX保證目標。",
      "Medium-to-long-term bullish. Jul–Aug digestion and left-side positioning; Aug 22 advance watch; September trend strength; October volatility with a 4500 scenario; Nov–Jan year-end path with 5000 long-range scenario. 4500/5000 are teacher scenario targets, not MoonX guarantees."
    ),
    thesis: [
      lt(
        "科技产业浪潮可能成为资本市场长期叙事。",
        "科技產業浪潮可能成為資本市場長期敘事。",
        "The technology-industry wave may become the market's long-range narrative."
      ),
      lt(
        "地方产业资本和股权财政可能提高权益市场的重要性。",
        "地方產業資本和股權財政可能提高權益市場的重要性。",
        "Local industrial capital and equity-based fiscal financing may raise the importance of the equity market."
      ),
      lt(
        "A股可能改变过去长期偏弱的定价结构。",
        "A股可能改變過去長期偏弱的定價結構。",
        "A-shares may shift away from the long-standing weak pricing structure."
      ),
      lt(
        "政策及国家产业战略可能为市场提供额外支持。",
        "政策及國家產業戰略可能為市場提供額外支持。",
        "Policy and national industrial strategy may provide additional market support."
      ),
      lt(
        "下半年指数机会可能伴随明显行业轮动。",
        "下半年指數機會可能伴隨明顯行業輪動。",
        "H2 index opportunities may be accompanied by pronounced sector rotation."
      ),
    ],
    risks: [
      lt("10月进入高波动阶段。", "10月進入高波動階段。", "October enters a high-volatility phase."),
      lt(
        "科技股与美股科技板块存在联动风险。",
        "科技股與美股科技板塊存在聯動風險。",
        "Tech stocks carry linkage risk with the US technology sector."
      ),
      lt(
        "指数上涨不代表所有个股同步上涨。",
        "指數上漲不代表所有個股同步上漲。",
        "An index advance does not mean every stock rises in tandem."
      ),
      lt(
        "5000点高度依赖政策、流动性和全球市场配合。",
        "5000點高度依賴政策、流動性和全球市場配合。",
        "The 5,000 level is highly dependent on policy, liquidity, and global-market cooperation."
      ),
    ],
    targets: [4500, 5000],
    turningWindows: [
      { id: "qimen-ashares-left-side", start: "2026-07-27", end: "2026-08-07", label: lt("左侧观察和逐步建仓窗口", "左側觀察和逐步建倉窗口", "Left-side observation and staged accumulation window") },
      { id: "qimen-ashares-aug22", date: "2026-08-22", label: lt("第一轮重要上涨窗口", "第一輪重要上漲窗口", "First important advance window") },
      { id: "qimen-ashares-sep", start: "2026-09-01", end: "2026-09-30", label: lt("趋势可能进一步强化", "趨勢可能進一步強化", "The trend may further strengthen") },
      { id: "qimen-ashares-oct", start: "2026-10-01", end: "2026-10-31", label: lt("冲击4500情景目标，波动增加", "衝擊4500情境目標，波動增加", "4,500 scenario target attempt, volatility increases") },
      { id: "qimen-ashares-nov-jan", start: "2026-11-01", end: "2027-01-31", label: lt("年底及春节前上涨窗口，长期观察5000点", "年底及春節前上漲窗口，長期觀察5000點", "Year-end / pre-Spring-Festival advance window; 5,000 long-range watch") },
    ],
    status: "active",
    tags: ["a-shares", "qimen", "china-equity", "star-50", "csi-a500", "strategic"],
  },
  {
    id: "QIMEN-HONG-KONG-2026-H2",
    aliases: ["research-hong-kong-2026-h2"],
    publishedAt: "2026-07-26",
    forecastStart: "2026-07-01",
    forecastEnd: "2026-12-31",
    assetId: "hang-seng",
    assetName: lt("恒生科技指数", "恆生科技指數", "Hang Seng TECH Index"),
    symbol: "HSTECH",
    market: "hong-kong-equity",
    framework: "qimen",
    sourceType: "private-teacher",
    publicSourceLabel: lt("奇门研究", "奇門研究", "Qimen Research"),
    direction: "bullish",
    editorialConfidence: 78,
    consensusEligible: true,
    collectionId: "qimen-china-equity-h2-2026",
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("2026年第三季度至第四季度", "2026年第三季度至第四季度", "Q3–Q4 2026"),
    title: lt(
      "恒生科技指数修复与政策支持情景",
      "恆生科技指數修復與政策支持情境",
      "Hang Seng TECH Index Recovery & Policy-Support Scenario"
    ),
    summary: lt(
      "恒生科技指数此前调整可能已较充分；第三季度较好修复；第四季度仍可能获政策支持。互联网平台为重点跟踪；阿里、腾讯属重点观察。若上证指数四季度走强，恒生科技指数或同步受益。主要风险：美股科技年底调整及A股—美股科技联动。",
      "恆生科技指數此前調整可能已較充分；第三季度較好修復；第四季度仍可能獲政策支持。互聯網平台為重點跟蹤；阿里、騰訊屬重點觀察。若上證指數四季度走強，恆生科技指數或同步受益。主要風險：美股科技年底調整及A股—美股科技聯動。",
      "Prior Hang Seng TECH digestion may be adequate; Q3 repair favored; Q4 may still see policy support. Internet platforms are focus names (Alibaba, Tencent as focus tracking). If the Shanghai Composite strengthens in Q4, HSTECH may co-move. Main risk: year-end US tech digestion and A-share/US-tech linkage."
    ),
    thesis: [
      lt(
        "恒生科技指数估值和调整幅度提供修复空间。",
        "恆生科技指數估值和調整幅度提供修復空間。",
        "Hang Seng TECH valuations and the extent of the prior correction provide room to recover."
      ),
      lt(
        "恒生科技指数可能受益于中国科技叙事。",
        "恆生科技指數可能受益於中國科技敘事。",
        "Hang Seng TECH Index may benefit from the China technology narrative."
      ),
      lt(
        "中国科技资产风险偏好改善可能推动资金回流。",
        "中國科技資產風險偏好改善可能推動資金回流。",
        "Improving risk appetite for China tech assets may drive capital inflows."
      ),
      lt(
        "阿里巴巴等大型互联网资产属于重点观察对象。",
        "阿里巴巴等大型互聯網資產屬於重點觀察對象。",
        "Large internet names such as Alibaba are key names to watch."
      ),
    ],
    risks: [
      lt("全球流动性环境。", "全球流動性環境。", "Global liquidity conditions."),
      lt("美股科技回调风险。", "美股科技回調風險。", "US technology correction risk."),
      lt("中美市场联动风险。", "中美市場聯動風險。", "China-US market linkage risk."),
      lt("政策落地的不确定性。", "政策落地的不確定性。", "Policy implementation uncertainty."),
    ],
    turningWindows: [
      { id: "qimen-hstech-q3", start: "2026-07-01", end: "2026-09-30", label: lt("修复及走强窗口", "修復及走強窗口", "Recovery and strengthening window") },
      { id: "qimen-hstech-q4", start: "2026-10-01", end: "2026-12-31", label: lt("可能持续获得政策支持", "可能持續獲得政策支持", "Possible continued policy support") },
    ],
    status: "active",
    tags: ["hang-seng-tech", "hstech", "qimen", "alibaba", "tencent", "strategic"],
  },
  {
    id: "QIMEN-US-TECH-2026-H2",
    publishedAt: "2026-07-26",
    forecastStart: "2026-08-01",
    forecastEnd: "2027-02-04",
    assetId: "nasdaq-100",
    assetName: lt("美股科技 / 纳斯达克", "美股科技 / 納斯達克", "US Technology / Nasdaq"),
    symbol: "NDX",
    market: "us-equity",
    framework: "qimen",
    sourceType: "private-teacher",
    publicSourceLabel: lt("奇门研究", "奇門研究", "Qimen Research"),
    direction: "neutral",
    editorialConfidence: 62,
    consensusEligible: true,
    collectionId: "qimen-china-equity-h2-2026",
    horizon: lt("2026年下半年", "2026年下半年", "H2 2026"),
    title: lt("美股科技震荡修复情景", "美股科技震盪修復情境", "US Tech Oscillating Recovery Scenario"),
    summary: lt(
      "研究观点认为美股科技在7月至8月可能经历震荡修复，但年底前后仍可能出现一次调整。A股科技板块与美股科技存在较高联动性。",
      "研究觀點認為美股科技在7月至8月可能經歷震盪修復，但年底前後仍可能出現一次調整。A股科技板塊與美股科技存在較高聯動性。",
      "The research view sees US technology undergoing an oscillating recovery in July–August, though a correction remains possible around year-end. China tech shows meaningful linkage with US tech."
    ),
    thesis: [
      lt("7月至8月可能经历震荡修复。", "7月至8月可能經歷震盪修復。", "July–August may see an oscillating recovery."),
      lt("年底前后仍可能出现一次调整。", "年底前後仍可能出現一次調整。", "A correction remains possible around year-end."),
    ],
    turningWindows: [
      { id: "qimen-ustech-jul-aug", start: "2026-07-01", end: "2026-08-31", label: lt("震荡修复", "震盪修復", "Volatility and recovery") },
      { id: "qimen-ustech-late-2026", start: "2026-11-01", end: "2026-12-31", label: lt("可能的科技板块调整", "可能的科技板塊調整", "Possible technology-sector correction") },
    ],
    status: "pending",
    tags: ["nasdaq", "us-tech", "qimen"],
  },
  {
    id: "QIMEN-CHINA-TECH-2026-H2",
    publishedAt: "2026-07-26",
    forecastStart: "2026-08-01",
    forecastEnd: "2027-02-04",
    assetId: "china-technology",
    assetName: lt("中国科技", "中國科技", "China Technology"),
    symbol: "STAR50",
    market: "china-equity",
    framework: "qimen",
    sourceType: "private-teacher",
    publicSourceLabel: lt("奇门研究", "奇門研究", "Qimen Research"),
    direction: "bullish",
    editorialConfidence: 76,
    consensusEligible: true,
    collectionId: "qimen-china-equity-h2-2026",
    horizon: lt("2026年下半年", "2026年下半年", "H2 2026"),
    title: lt("中国科技行业轮动情景", "中國科技行業輪動情境", "China Technology Sector-Rotation Scenario"),
    summary: lt(
      "科技仍可能是2026年下半年的重要方向，但资金不会只集中在单一AI主题，半导体、国产替代、算力、高端制造和其他产业方向可能出现明显轮动。",
      "科技仍可能是2026年下半年的重要方向，但資金不會只集中在單一AI主題，半導體、國產替代、算力、高端製造和其他產業方向可能出現明顯輪動。",
      "Technology likely remains a key theme for H2 2026, but capital is unlikely to concentrate on a single AI theme — semiconductors, domestic substitution, compute, advanced manufacturing, and other directions may see pronounced rotation."
    ),
    thesis: [
      lt("科技仍可能是下半年的重要方向。", "科技仍可能是下半年的重要方向。", "Technology likely remains a key H2 theme."),
      lt("资金不会只集中在单一AI主题。", "資金不會只集中在單一AI主題。", "Capital is unlikely to concentrate on a single AI theme."),
      lt("半导体、国产替代、算力、高端制造可能出现明显轮动。", "半導體、國產替代、算力、高端製造可能出現明顯輪動。", "Semiconductors, domestic substitution, compute, and advanced manufacturing may rotate noticeably."),
    ],
    status: "pending",
    tags: ["china-technology", "qimen", "star-50", "csi-a500", "semiconductors", "ai-infrastructure"],
  },

  // ================================================================
  // PUBLIC ANALYST RECORDS (anonymized — internalSourceRef never shown publicly)
  // ================================================================
  {
    id: "PUBLIC-ANALYST-01",
    publishedAt: "2026-07-24",
    assetId: "nasdaq-100",
    assetName: lt("美股指数", "美股指數", "US Indices"),
    symbol: "NDX",
    market: "us-equity",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@mat78704",
    publicSourceLabel: lt("公开分析师01", "公開分析師01", "Public Analyst 01"),
    direction: "slightly-bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("7月疲软后中期持有窗口", "7月疲軟後中期持有窗口", "Late-July Weakness, Medium-Term Holding Window"),
    summary: lt(
      "7月下旬的疲软后可能出现反弹。中期持有窗口可能延伸至9月3日至9月10日。",
      "7月下旬的疲軟後可能出現反彈。中期持有窗口可能延伸至9月3日至9月10日。",
      "Late July weakness may be followed by a rebound. The medium-term holding window may extend toward September 3 to September 10."
    ),
    thesis: [
      lt("7月下旬的疲软后可能出现反弹。", "7月下旬的疲軟後可能出現反彈。", "Late July weakness may be followed by a rebound."),
      lt("中期持有窗口可能延伸至9月3日至9月10日。", "中期持有窗口可能延伸至9月3日至9月10日。", "The medium-term holding window may extend to September 3–10."),
    ],
    turningWindows: [
      { id: "pa01-sep3-10", start: "2026-09-03", end: "2026-09-10", label: lt("中期持有窗口", "中期持有窗口", "Medium-term holding window") },
    ],
    status: "pending",
    tags: ["nasdaq", "cycle", "timing"],
  },
  {
    id: "PUBLIC-ANALYST-02-BTC",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@cfsq143",
    publicSourceLabel: lt("公开分析师02", "公開分析師02", "Public Analyst 02"),
    direction: "bullish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("比特币波浪结构情景", "比特幣波浪結構情境", "Bitcoin Wave-Structure Scenario"),
    summary: lt(
      "比特币可能正在完成第二浪回调，随后进入第三浪上涨。",
      "比特幣可能正在完成第二浪回調，隨後進入第三浪上漲。",
      "Bitcoin may be completing a wave-two pullback before entering a wave-three advance."
    ),
    thesis: [
      lt("比特币可能正在完成第二浪回调。", "比特幣可能正在完成第二浪回調。", "Bitcoin may be completing a wave-two pullback."),
      lt("随后进入第三浪上涨。", "隨後進入第三浪上漲。", "It may then enter a wave-three advance."),
    ],
    status: "pending",
    tags: ["bitcoin", "cycle", "elliott-wave"],
  },
  {
    id: "PUBLIC-ANALYST-02-OIL",
    publishedAt: "2026-07-24",
    assetId: "crude-oil",
    assetName: lt("原油", "原油", "Crude Oil"),
    symbol: "WTI",
    market: "commodity",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@cfsq143",
    publicSourceLabel: lt("公开分析师02", "公開分析師02", "Public Analyst 02"),
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期", "短期", "Short term"),
    title: lt("原油短期下跌情景", "原油短期下跌情境", "Crude Oil Near-Term Decline Scenario"),
    summary: lt(
      "原油短期内可能下跌。",
      "原油短期內可能下跌。",
      "Crude oil may decline in the near term."
    ),
    thesis: [lt("原油短期内可能下跌。", "原油短期內可能下跌。", "Crude oil may decline in the near term.")],
    status: "pending",
    tags: ["crude-oil", "cycle"],
  },
  {
    id: "PUBLIC-ANALYST-03-BTC",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "market-flow",
    sourceType: "public-analyst",
    internalSourceRef: "@hibtc37",
    publicSourceLabel: lt("公开分析师03", "公開分析師03", "Public Analyst 03"),
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期", "短期", "Short term"),
    title: lt("ETF资金流出风险情景", "ETF資金流出風險情境", "ETF Outflow Risk Scenario"),
    summary: lt(
      "ETF资金流出增加比特币短期风险。",
      "ETF資金流出增加比特幣短期風險。",
      "ETF outflows increase short-term Bitcoin risk."
    ),
    thesis: [lt("ETF资金流出增加比特币短期风险。", "ETF資金流出增加比特幣短期風險。", "ETF outflows increase short-term Bitcoin risk.")],
    status: "pending",
    tags: ["bitcoin", "market-flow", "etf-flows"],
  },
  {
    id: "PUBLIC-ANALYST-03-STORAGE",
    publishedAt: "2026-07-24",
    assetId: "semiconductors-storage",
    assetName: lt("存储板块", "儲存板塊", "Storage Equities"),
    symbol: "SOX",
    market: "semiconductor",
    framework: "market-flow",
    sourceType: "public-analyst",
    internalSourceRef: "@hibtc37",
    publicSourceLabel: lt("公开分析师03", "公開分析師03", "Public Analyst 03"),
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("存储板块叙事走弱情景", "儲存板塊敘事走弱情境", "Storage-Narrative Weakening Scenario"),
    summary: lt(
      "存储板块叙事可能正在边际走弱。",
      "儲存板塊敘事可能正在邊際走弱。",
      "The storage-sector narrative may be weakening at the margin."
    ),
    thesis: [lt("存储板块叙事可能正在边际走弱。", "儲存板塊敘事可能正在邊際走弱。", "The storage-sector narrative may be weakening at the margin.")],
    status: "pending",
    tags: ["storage", "market-flow"],
  },
  {
    id: "PUBLIC-ANALYST-04-US",
    publishedAt: "2026-07-24",
    assetId: "nasdaq-100",
    assetName: lt("美股", "美股", "US Equities"),
    symbol: "NDX",
    market: "us-equity",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@formnoshape",
    publicSourceLabel: lt("公开分析师04", "公開分析師04", "Public Analyst 04"),
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期", "短期", "Short term"),
    title: lt("美股短期脆弱情景", "美股短期脆弱情境", "US Equities Near-Term Vulnerability Scenario"),
    summary: lt(
      "美股短期内仍然脆弱。",
      "美股短期內仍然脆弱。",
      "US equities remain vulnerable in the near term."
    ),
    thesis: [lt("美股短期内仍然脆弱。", "美股短期內仍然脆弱。", "US equities remain vulnerable in the near term.")],
    status: "pending",
    tags: ["us-equity", "cycle"],
  },
  {
    id: "PUBLIC-ANALYST-04-BTC",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@formnoshape",
    publicSourceLabel: lt("公开分析师04", "公開分析師04", "Public Analyst 04"),
    direction: "neutral",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("比特币周期高点与市场底部情景", "比特幣週期高點與市場底部情境", "Bitcoin Cycle-High & Market-Bottom Scenario"),
    summary: lt(
      "比特币可能在8月初接近周期高点，而更大的市场底部可能出现在8月或9月。",
      "比特幣可能在8月初接近週期高點，而更大的市場底部可能出現在8月或9月。",
      "Bitcoin may approach a cycle high in early August, while larger market bottoms may emerge in August or September."
    ),
    thesis: [
      lt("比特币可能在8月初接近周期高点。", "比特幣可能在8月初接近週期高點。", "Bitcoin may approach a cycle high in early August."),
      lt("更大的市场底部可能出现在8月或9月。", "更大的市場底部可能出現在8月或9月。", "Larger market bottoms may emerge in August or September."),
    ],
    status: "pending",
    tags: ["bitcoin", "cycle"],
  },
  {
    id: "PUBLIC-ANALYST-05",
    publishedAt: "2026-07-24",
    assetId: "general-market",
    assetName: lt("大盘 / 综合市场", "大盤 / 綜合市場", "General / Broad Market"),
    market: "index",
    framework: "qimen",
    sourceType: "public-analyst",
    internalSourceRef: "@Lvzhishi",
    publicSourceLabel: lt("公开分析师05", "公開分析師05", "Public Analyst 05"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("不适用", "不適用", "Not applicable"),
    title: lt("暂无明确结论", "暫無明確結論", "No Current Usable Conclusion"),
    summary: lt(
      "目前没有足够清晰的结论。",
      "目前沒有足夠清晰的結論。",
      "No sufficiently clear current conclusion is available."
    ),
    thesis: [lt("目前没有足够清晰的结论。", "目前沒有足夠清晰的結論。", "No sufficiently clear current conclusion is available.")],
    status: "pending",
    tags: ["qimen", "chan", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-06",
    publishedAt: "2026-07-24",
    assetId: "semiconductors-storage",
    assetName: lt("半导体 / AI资本支出", "半導體 / AI資本支出", "Semiconductors / AI Capex"),
    symbol: "SOX",
    market: "semiconductor",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@Cycle_King1913",
    publicSourceLabel: lt("公开分析师06", "公開分析師06", "Public Analyst 06"),
    direction: "bearish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期至中期", "短期至中期", "Short to medium term"),
    title: lt("AI资本支出担忧压制半导体情绪", "AI資本支出疑慮壓制半導體情緒", "AI Capex Concerns Pressure Semiconductor Sentiment"),
    summary: lt(
      "AI资本支出担忧可能对半导体情绪构成压力。该来源还提供每日择时日历。",
      "AI資本支出疑慮可能對半導體情緒構成壓力。該來源還提供每日擇時日曆。",
      "AI capital-expenditure concerns may pressure semiconductor sentiment. The source also provides a daily timing calendar."
    ),
    thesis: [lt("AI资本支出担忧可能对半导体情绪构成压力。", "AI資本支出疑慮可能對半導體情緒構成壓力。", "AI capital-expenditure concerns may pressure semiconductor sentiment.")],
    status: "pending",
    tags: ["semiconductor", "ai-capex", "us-equity", "cycle", "astrology"],
  },
  {
    id: "PUBLIC-ANALYST-07",
    publishedAt: "2026-07-24",
    assetId: "altcoins",
    assetName: lt("山寨币", "山寨幣", "Altcoins"),
    market: "crypto",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@BTCKiK",
    publicSourceLabel: lt("公开分析师07", "公開分析師07", "Public Analyst 07"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("不适用", "不適用", "Not applicable"),
    title: lt("暂无明确结论", "暫無明確結論", "No Current Usable Conclusion"),
    summary: lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion."),
    thesis: [lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion.")],
    status: "pending",
    tags: ["altcoins", "metaphysical-altcoin-research", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-08",
    publishedAt: "2026-07-24",
    assetId: "general-market",
    assetName: lt("大盘 / 综合市场", "大盤 / 綜合市場", "General / Broad Market"),
    market: "index",
    framework: "technical",
    sourceType: "public-analyst",
    internalSourceRef: "@Hoyooyoo",
    publicSourceLabel: lt("公开分析师08", "公開分析師08", "Public Analyst 08"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("不适用", "不適用", "Not applicable"),
    title: lt("暂无明确结论", "暫無明確結論", "No Current Usable Conclusion"),
    summary: lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion."),
    thesis: [lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion.")],
    status: "pending",
    tags: ["mixed-research", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-09",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "qimen",
    sourceType: "public-analyst",
    internalSourceRef: "@btcpiggy",
    publicSourceLabel: lt("公开分析师09", "公開分析師09", "Public Analyst 09"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("不适用", "不適用", "Not applicable"),
    title: lt("暂无明确结论", "暫無明確結論", "No Current Usable Conclusion"),
    summary: lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion."),
    thesis: [lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion.")],
    status: "pending",
    tags: ["bitcoin", "qimen", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-10",
    publishedAt: "2026-07-24",
    assetId: "general-market",
    assetName: lt("大盘 / 综合市场", "大盤 / 綜合市場", "General / Broad Market"),
    market: "index",
    framework: "technical",
    sourceType: "public-analyst",
    internalSourceRef: "@horatio_don",
    publicSourceLabel: lt("公开分析师10", "公開分析師10", "Public Analyst 10"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("短线", "短線", "Short-term"),
    title: lt("短线交易评论", "短線交易評論", "Short-Term Trading Commentary"),
    summary: lt(
      "主要提供短线交易评论，缺乏稳定的中期预测。",
      "主要提供短線交易評論，缺乏穩定的中期預測。",
      "Primarily short-term trading commentary without a stable medium-term forecast."
    ),
    thesis: [lt("缺乏稳定的中期预测。", "缺乏穩定的中期預測。", "Lacks a stable medium-term forecast.")],
    status: "pending",
    tags: ["short-term-trading", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-11",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "gann",
    sourceType: "public-analyst",
    internalSourceRef: "@BTCTW0",
    publicSourceLabel: lt("公开分析师11", "公開分析師11", "Public Analyst 11"),
    direction: "bullish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("中期", "中期", "Medium term"),
    title: lt("比特币结构性看涨情景", "比特幣結構性看漲情境", "Bitcoin Structural Bullish Scenario"),
    summary: lt(
      "只要关键支撑位维持，比特币在结构上仍然看涨。",
      "只要關鍵支撐位維持，比特幣在結構上仍然看漲。",
      "Bitcoin remains structurally bullish while key support levels hold."
    ),
    thesis: [lt("关键支撑位维持则结构性看涨。", "關鍵支撐位維持則結構性看漲。", "Structurally bullish while key support levels hold.")],
    status: "pending",
    tags: ["bitcoin", "gann"],
  },
  {
    id: "PUBLIC-ANALYST-12",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "harmonic",
    sourceType: "public-analyst",
    internalSourceRef: "@laban_li",
    publicSourceLabel: lt("公开分析师12", "公開分析師12", "Public Analyst 12"),
    direction: "bullish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("中期", "中期", "Medium term"),
    title: lt("比特币机构增持支撑情景", "比特幣機構增持支撐情境", "Bitcoin Institutional Accumulation Scenario"),
    summary: lt(
      "在机构和ETF持续增持的支持下，比特币结构上保持韧性。",
      "在機構和ETF持續增持的支持下，比特幣結構上保持韌性。",
      "Bitcoin remains structurally resilient, supported by continued institutional and ETF accumulation."
    ),
    thesis: [lt("机构和ETF持续增持支撑结构韧性。", "機構和ETF持續增持支撐結構韌性。", "Continued institutional and ETF accumulation supports structural resilience.")],
    status: "pending",
    tags: ["bitcoin", "harmonic", "etf-flows"],
  },
  {
    id: "PUBLIC-ANALYST-13",
    publishedAt: "2026-07-24",
    assetId: "general-market",
    assetName: lt("大盘 / 综合市场", "大盤 / 綜合市場", "General / Broad Market"),
    market: "index",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@elywang1986",
    publicSourceLabel: lt("公开分析师13", "公開分析師13", "Public Analyst 13"),
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    consensusEligible: false,
    horizon: lt("不适用", "不適用", "Not applicable"),
    title: lt("暂无明确结论", "暫無明確結論", "No Current Usable Conclusion"),
    summary: lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion."),
    thesis: [lt("目前没有可用的结论。", "目前沒有可用的結論。", "No current usable conclusion.")],
    status: "pending",
    tags: ["bazi-research", "insufficient-evidence"],
  },
  {
    id: "PUBLIC-ANALYST-14",
    publishedAt: "2026-07-24",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "cycle",
    sourceType: "public-analyst",
    internalSourceRef: "@ximihoo1",
    publicSourceLabel: lt("公开分析师14", "公開分析師14", "Public Analyst 14"),
    direction: "bullish",
    editorialConfidence: 60,
    consensusEligible: true,
    horizon: lt("短期", "短期", "Short term"),
    title: lt("比特币短暂回调情景", "比特幣短暫回調情境", "Bitcoin Short Pullback Scenario"),
    summary: lt(
      "比特币可能出现短暂回调，但更大的反弹结构保持完好。",
      "比特幣可能出現短暫回調，但更大的反彈結構保持完好。",
      "Bitcoin may experience a short pullback while the larger rebound structure remains intact."
    ),
    thesis: [lt("短暂回调不改更大的反弹结构。", "短暫回調不改更大的反彈結構。", "A short pullback does not change the larger rebound structure.")],
    status: "pending",
    tags: ["bitcoin", "cycle", "macd-cycle"],
  },

  // ================================================================
  // INTERNAL MOONX TECHNICAL RECORD
  // ================================================================
  {
    id: "MOONX-INTERNAL-BTC-001",
    publishedAt: "2026-07-25",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "internal",
    sourceType: "internal-research",
    publicSourceLabel: lt("MoonX内部技术研究", "MoonX內部技術研究", "MoonX Internal Technical Research"),
    direction: "bullish",
    editorialConfidence: 70,
    consensusEligible: true,
    horizon: lt("中期", "中期", "Medium term"),
    title: lt("比特币第三浪结构研究", "比特幣第三浪結構研究", "Bitcoin Wave-Three Structure Study"),
    summary: lt(
      "内部工作结构假设比特币已完成初始推动浪，目前处于第二浪回撤阶段，随后可能进入第三浪上涨。",
      "內部工作結構假設比特幣已完成初始推動浪，目前處於第二浪回撤階段，隨後可能進入第三浪上漲。",
      "The working structure assumes Bitcoin has completed an initial impulse and is undergoing a wave-two retracement before a possible wave-three advance."
    ),
    thesis: [
      lt("64715.3：第一道防线。", "64715.3：第一道防線。", "64,715.3: first line of defense."),
      lt("63612.2：第二道防线。", "63612.2：第二道防線。", "63,612.2: second line of defense."),
      lt("62000：极端结构验证水平。", "62000：極端結構驗證水平。", "62,000: extreme structural validation level."),
    ],
    supports: [64715.3, 63612.2, 62000],
    targets: [74874.4, 79705.7, 84121.3],
    risks: [
      lt(
        "若决定性跌破极端验证区域，需要重新评估初始推动浪结构是否已经失败。",
        "若決定性跌破極端驗證區域，需要重新評估初始推動浪結構是否已經失敗。",
        "A decisive breakdown below the extreme validation area requires reassessing whether the initial impulse structure failed."
      ),
    ],
    status: "active",
    tags: ["bitcoin", "internal-technical", "wave-structure"],
  },
];

export async function listResearchRecords(): Promise<ResearchRecord[]> {
  const byId = new Map<string, ResearchRecord>();
  for (const record of [
    ...researchRecords,
    ...externalObservations,
    ...externalViewpoints20260801,
    ...externalViewpointsFollowup20260801,
    ...teacher02Liuyao20260802Records,
    ...teacher02Liuyao20260823Records,
    ...coreMarketLiuyao20260801Records,
    ...usIndexLiuyao20260809Records,
    ...externalWolfUsIndices20260809,
    ...teacherResearch20260815,
    ...remainingCoreMarketLiuyao20260801Records,
    ...curatedImportRecords,
    ...chinaEquityOracle0727Records,
    ...preciousMetalsCryptoOracleRecords,
    ...annualRiskEquityRecords,
    ...oilSseLiuyao2026Records,
    ...wtiPathExt20260807Records,
    ...btcLiuyao20260727Records,
    ...btcMarketBazi20260820Records,
    ...cycleResearchFcx20260822Records,
    ...cycleResearchBtcGold20260823Records,
    ...researchPack20260823,
    ...qimenRotationPostRecords20260823,
    ...externalIndicatorResearchRecords20260823,
    ...cycleResearchUsIndices20260824Records,
  ]) {
    // Later packs win on same id; aliases resolve at lookup.
    byId.set(record.id, record);
  }
  return [...byId.values()];
}

export async function getResearchRecord(id: string): Promise<ResearchRecord | undefined> {
  const records = await listResearchRecords();
  return records.find((record) => record.id === id || record.aliases?.includes(id));
}

export async function countResearchRecords(): Promise<number> {
  return (await listResearchRecords()).length;
}

export async function listResearchCollections(): Promise<ResearchCollection[]> {
  return researchCollections;
}

export async function getResearchCollection(id: string): Promise<ResearchCollection | undefined> {
  return researchCollections.find((collection) => collection.id === id);
}
