import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

export const QIMEN_ROTATION_POST_SOURCE_ID_20260823 = "QIMEN-ROTATION-POST-20260823";

const INGESTED_AT = "2026-08-23T18:00:00+08:00";
const INTERNAL_SOURCE_REF =
  "C:/Users/13558/Desktop/网站相关/02_奇门遁甲老师/0823关于BTC的帖子.png";
const PUBLIC_SOURCE_LABEL = lt(
  "奇门宏观观察",
  "奇門宏觀觀察",
  "Qimen Macro Observer"
);

/**
 * The supplied post contains a macro/rotation thesis, not a new Qimen chart.
 * These rows are therefore research-only, share one source, and are excluded
 * from the consensus engine. No price level or exact turning date was supplied.
 */
export const qimenRotationPostRecords20260823: ResearchRecord[] = [
  {
    id: `${QIMEN_ROTATION_POST_SOURCE_ID_20260823}-BTC`,
    publishedAt: "2026-08-23",
    sourcePublishedAt: null,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    forecastStart: "2026-08-23",
    forecastEnd: "2026-09-30",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "macro",
    sourceType: "private-teacher",
    internalSourceRef: INTERNAL_SOURCE_REF,
    publicSourceLabel: PUBLIC_SOURCE_LABEL,
    direction: "neutral",
    editorialConfidence: 58,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "tactical",
    horizon: lt("当前反弹至2026年9月", "當前反彈至2026年9月", "Current rebound through September 2026"),
    title: lt(
      "BTC反弹按板块轮动观察，反转仍未确认",
      "BTC反彈按板塊輪動觀察，反轉仍未確認",
      "Treat the BTC rebound as rotation; reversal remains unconfirmed"
    ),
    summary: lt(
      "来源把本轮BTC上涨解释为AI科技注意力见顶后的板块轮动，并明确认为BTC反转目前尚不能确立。该判断与网站下周“先探底、后修复但不定义为连续主升”的正式路径一致，可用于提醒反弹后的兑现风险；它不是新奇门盘，也没有提供可验证的精确价格或日期。",
      "來源把本輪BTC上漲解釋為AI科技注意力見頂後的板塊輪動，並明確認為BTC反轉目前尚不能確立。該判斷與網站下週「先探底、後修復但不定義為連續主升」的正式路徑一致，可用於提醒反彈後的兌現風險；它不是新奇門盤，也沒有提供可驗證的精確價格或日期。",
      "The source frames the BTC rebound as rotation after AI-tech attention peaked and says a BTC reversal is not yet established. This aligns with MOOX's official weekly path of a dip followed by repair without a continuous primary advance. It is not a new Qimen chart and supplies no verifiable exact price or date."
    ),
    thesis: [
      lt("反弹可以存在，但不能直接等同于趋势反转。", "反彈可以存在，但不能直接等同於趨勢反轉。", "A rebound can occur without confirming a trend reversal."),
      lt("板块轮动只是来源提出的解释框架，后续仍需价格结构验证。", "板塊輪動只是來源提出的解釋框架，後續仍需價格結構驗證。", "Rotation is the source's explanatory thesis and still requires price-structure confirmation."),
    ],
    catalysts: [
      lt("资金注意力由AI科技暂时转向BTC", "資金注意力由AI科技暫時轉向BTC", "A temporary attention shift from AI tech toward BTC"),
      lt("美国政策托底预期，仅作条件分支", "美國政策托底預期，僅作條件分支", "Possible U.S. policy support, treated only as a conditional branch"),
    ],
    risks: [
      lt("反转尚未确认，反弹高位需防兑现。", "反轉尚未確認，反彈高位需防兌現。", "The reversal is unconfirmed, so profit-taking risk rises into rebound highs."),
      lt("AI与BTC的反向轮动关系并非稳定规律。", "AI與BTC的反向輪動關係並非穩定規律。", "The inverse rotation between AI and BTC is not a stable rule."),
    ],
    invalidation: lt(
      "若BTC在日线主结构上完成有效突破、回踩确认并持续放量，则“仅为轮动反弹、反转未确认”的谨慎判断需重新评估。",
      "若BTC在日線主結構上完成有效突破、回踩確認並持續放量，則「僅為輪動反彈、反轉未確認」的謹慎判斷需重新評估。",
      "Reassess the cautious rotation-only view if BTC breaks the primary daily structure, confirms it on a retest, and sustains volume."
    ),
    status: "active",
    visibility: "internal",
    tags: ["bitcoin", "asset-rotation", "macro", "unconfirmed-reversal", "anonymous-source", "research-only"],
  },
  {
    id: `${QIMEN_ROTATION_POST_SOURCE_ID_20260823}-NDX`,
    publishedAt: "2026-08-23",
    sourcePublishedAt: null,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    forecastStart: "2026-08-23",
    forecastEnd: "2026-09-30",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    market: "index",
    framework: "macro",
    sourceType: "private-teacher",
    internalSourceRef: INTERNAL_SOURCE_REF,
    publicSourceLabel: PUBLIC_SOURCE_LABEL,
    direction: "slightly-bearish",
    editorialConfidence: 54,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "tactical",
    horizon: lt("当前至2026年9月", "當前至2026年9月", "Now through September 2026"),
    title: lt("AI科技高热度后的持续性风险", "AI科技高熱度後的持續性風險", "Durability risk after peak AI-tech attention"),
    summary: lt(
      "来源认为AI科技注意力已处高位、近期股市持续性仍弱，并把潜在政策托底视为条件分支。该观点与网站九月纳指“上旬可修复、随后高位转弱”的风险方向相容，但不能单独覆盖纳指六爻月卦。",
      "來源認為AI科技注意力已處高位、近期股市持續性仍弱，並把潛在政策托底視為條件分支。該觀點與網站九月納指「上旬可修復、隨後高位轉弱」的風險方向相容，但不能單獨覆蓋納指六爻月卦。",
      "The source sees AI-tech attention as elevated and equity durability as weak, with policy support only a conditional branch. This is compatible with MOOX's September NDX risk path but cannot override the NDX monthly Liu-Yao record."
    ),
    thesis: [lt("科技股可以受政策托底出现修复，但持续性仍需验证。", "科技股可以受政策托底出現修復，但持續性仍需驗證。", "Policy support may enable a tech repair, but durability still requires confirmation.")],
    risks: [lt("政策托底是概率判断，不能作为已发生事实。", "政策托底是概率判斷，不能作為已發生事實。", "Policy support is probabilistic and must not be presented as an established event.")],
    status: "active",
    visibility: "internal",
    tags: ["nasdaq-100", "ai-tech", "macro", "asset-rotation", "anonymous-source", "research-only"],
  },
  {
    id: `${QIMEN_ROTATION_POST_SOURCE_ID_20260823}-GOLD`,
    publishedAt: "2026-08-23",
    sourcePublishedAt: null,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    forecastStart: "2026-08-23",
    forecastEnd: "2026-09-30",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "Gold"),
    symbol: "GOLD",
    market: "commodity",
    framework: "macro",
    sourceType: "private-teacher",
    internalSourceRef: INTERNAL_SOURCE_REF,
    publicSourceLabel: PUBLIC_SOURCE_LABEL,
    direction: "slightly-bullish",
    editorialConfidence: 52,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "tactical",
    horizon: lt("当前至2026年9月", "當前至2026年9月", "Now through September 2026"),
    title: lt("黄金震荡中偏强至九月：保留为分歧观点", "黃金震盪中偏強至九月：保留為分歧觀點", "Gold firmer into September: retained as a disagreement view"),
    summary: lt(
      "来源明确给出黄金在震荡中走高至九月的方向，但没有价格、精确日期或失效位。网站九月黄金正式六爻方向仍为先压后修复，因此本条只进入分歧观察，不覆盖正式月卦。",
      "來源明確給出黃金在震盪中走高至九月的方向，但沒有價格、精確日期或失效位。網站九月黃金正式六爻方向仍為先壓後修復，因此本條只進入分歧觀察，不覆蓋正式月卦。",
      "The source explicitly expects gold to rise choppily into September but gives no price, exact date, or invalidation level. MOOX's formal September gold Liu-Yao path remains pressure then repair, so this stays as disagreement evidence only."
    ),
    thesis: [lt("震荡偏强是来源观点，不外推为九月单边上涨。", "震盪偏強是來源觀點，不外推為九月單邊上漲。", "Choppy strength is the source view and is not extrapolated into a one-way September rise.")],
    risks: [lt("与九月正式六爻方向存在阶段分歧，等待新周卦验证。", "與九月正式六爻方向存在階段分歧，等待新週卦驗證。", "This partly conflicts with the formal September Liu-Yao path and awaits new weekly verification.")],
    status: "active",
    visibility: "internal",
    tags: ["gold", "september-2026", "macro", "disagreement", "anonymous-source", "research-only"],
  },
  {
    id: `${QIMEN_ROTATION_POST_SOURCE_ID_20260823}-SILVER`,
    publishedAt: "2026-08-23",
    sourcePublishedAt: null,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    forecastStart: "2026-08-23",
    forecastEnd: "2026-09-30",
    assetId: "silver",
    assetName: lt("国际银价", "國際銀價", "Silver"),
    symbol: "SILVER",
    market: "commodity",
    framework: "macro",
    sourceType: "private-teacher",
    internalSourceRef: INTERNAL_SOURCE_REF,
    publicSourceLabel: PUBLIC_SOURCE_LABEL,
    direction: "slightly-bullish",
    editorialConfidence: 50,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "tactical",
    horizon: lt("当前至2026年9月", "當前至2026年9月", "Now through September 2026"),
    title: lt("白银震荡中偏强至九月：无精确点位", "白銀震盪中偏強至九月：無精確點位", "Silver firmer into September, with no exact levels"),
    summary: lt(
      "来源把白银与黄金并列为震荡中走高至九月，但没有提供独立白银逻辑、价格或日期。因此只保留低权重研究记录，等待白银专项卦或价格结构确认。",
      "來源把白銀與黃金並列為震盪中走高至九月，但沒有提供獨立白銀邏輯、價格或日期。因此只保留低權重研究記錄，等待白銀專項卦或價格結構確認。",
      "The source groups silver with gold in a choppy rise into September but supplies no silver-specific rationale, price, or date. This remains a low-weight research row pending a dedicated chart or price-structure confirmation."
    ),
    thesis: [lt("白银观点明确但证据颗粒度较低。", "白銀觀點明確但證據顆粒度較低。", "The silver direction is explicit but the evidence is coarse.")],
    risks: [lt("没有独立白银盘与失效条件，不进入正式方向。", "沒有獨立白銀盤與失效條件，不進入正式方向。", "Without a dedicated silver chart or invalidation, this cannot set the formal direction.")],
    status: "active",
    visibility: "internal",
    tags: ["silver", "september-2026", "macro", "coarse-evidence", "anonymous-source", "research-only"],
  },
];
