import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/**
 * Forward-only teacher records supplied on 2026-08-26.
 *
 * Source boundary:
 * - the supplied transcript/image remains the evidence of record;
 * - trend statements are retained, while conversational price examples are
 *   not promoted to formal targets;
 * - the member-facing label is anonymous;
 * - the records are research evidence only and never create an order.
 */
export const BINGWU_CROSS_ASSET_ROTATION_VERSION = "BINGWU_CROSS_ASSET_ROTATION_20260825_V1" as const;

export const bingwuCrossAssetRotation20260825Records: ResearchRecord[] = [
  {
    id: "LIUYAO-CORE-SOXL-20260825-1025-V1",
    publishedAt: "2026-08-25",
    sourcePublishedAt: "2026-08-25",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-26T06:30:00+08:00",
    verificationEligibility: "formal",
    forecastStart: "2026-08-25",
    forecastEnd: "2026-10-25",
    accessLevel: "member",
    assetId: "semiconductors-storage",
    assetName: lt("三倍半导体 / 半导体板块", "三倍半導體 / 半導體板塊", "Leveraged Semiconductors / Semiconductor Sector"),
    symbol: "SOXL",
    market: "semiconductor",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    internalSourceRef: "C:/Users/13558/Desktop/新建文件夹/丙午8.25-10.25s三倍半导体未来2个月预测 .png",
    publicSourceLabel: lt("核心六爻研究", "核心六爻研究", "Core Liu Yao Research"),
    sourceProfileId: "core-liuyao-cycle",
    direction: "bullish",
    editorialConfidence: 82,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    horizon: lt("2026年8月25日至10月25日", "2026年8月25日至10月25日", "August 25 to October 25, 2026"),
    title: lt("半导体两个月：9月7日后相对转强", "半導體兩個月：9月7日後相對轉強", "Semiconductors: relative strength after September 7"),
    summary: lt(
      "8月25日至9月7日以震荡为主；9月7日至10月7日转入相对强势窗口，9月中下旬至10月初是两个月内的高位候选区；10月7日后振幅显著放大，既可能继续上冲，也要防大幅回落。",
      "8月25日至9月7日以震盪為主；9月7日至10月7日轉入相對強勢窗口，9月中下旬至10月初是兩個月內的高位候選區；10月7日後振幅顯著放大，既可能繼續上衝，也要防大幅回落。",
      "Aug 25-Sep 7 is mainly range-bound. Relative strength is favored from Sep 7-Oct 7, with a two-month high window from mid/late September into early October. Volatility rises sharply after Oct 7, allowing both further upside and a large pullback."
    ),
    rawSource: lt(
      "申金月上下徘徊；酉金月因辰酉合、动爻逢合而走高；戌月辰戌冲、未戌刑，振幅放大。",
      "申金月上下徘徊；酉金月因辰酉合、動爻逢合而走高；戌月辰戌衝、未戌刑，振幅放大。",
      "The source describes Shen month as range-bound, You month as stronger through the Chen-You combination, and Xu month as higher-volatility through Chen-Xu conflict and Wei-Xu punishment."
    ),
    moonxInterpretation: lt(
      "正式方向仅适用于SOXL及半导体相对强弱，不外推为所有AI股票或纳指100必然上涨。趋势判断权重高于视频中的示例价格。",
      "正式方向僅適用於SOXL及半導體相對強弱，不外推為所有AI股票或納指100必然上漲。趨勢判斷權重高於影片中的示例價格。",
      "The formal view applies to SOXL and semiconductor relative strength, not to every AI stock or a guaranteed Nasdaq-100 rally. Trend evidence carries more weight than conversational price examples."
    ),
    thesis: [
      lt("9月7日至10月7日是本条最明确的相对强势窗口。", "9月7日至10月7日是本條最明確的相對強勢窗口。", "Sep 7-Oct 7 is the clearest relative-strength window."),
      lt("9月中下旬至10月初是阶段高位候选，而非精确见顶承诺。", "9月中下旬至10月初是階段高位候選，而非精確見頂承諾。", "Mid/late September into early October is a candidate high window, not an exact top promise."),
      lt("10月7日后先保护利润，避免把高振幅继续上涨误当成低风险主升。", "10月7日後先保護利潤，避免把高振幅繼續上漲誤當成低風險主升。", "After Oct 7, protect gains and do not mistake high-volatility upside for a low-risk primary trend."),
    ],
    turningWindows: [
      { id: "soxl-transition-20260907", date: "2026-09-07", label: lt("相对转强起点", "相對轉強起點", "Relative-strength transition") },
      { id: "soxl-high-window-20260915-1006", start: "2026-09-15", end: "2026-10-06", label: lt("两个月高位候选区", "兩個月高位候選區", "Candidate two-month high window"), note: lt("原文给出9月中下旬至10月初的宽窗口，没有精确日。", "原文給出9月中下旬至10月初的寬窗口，沒有精確日。", "The source gives a broad mid/late-September to early-October window, not an exact date.") },
      { id: "soxl-volatility-20261007", date: "2026-10-07", label: lt("高振幅风险切换", "高振幅風險切換", "High-volatility risk transition") },
    ],
    risks: [
      lt("三倍杠杆产品存在波动损耗；方向判断不能替代仓位与止损。", "三倍槓桿產品存在波動損耗；方向判斷不能替代倉位與止損。", "A 3x leveraged product has volatility decay; a directional view cannot replace position sizing or stops."),
      lt("本条不覆盖纳指100、全部AI个股或半导体内部每一家公司。", "本條不覆蓋納指100、全部AI個股或半導體內部每一家公司。", "This record does not cover Nasdaq 100, every AI stock, or every semiconductor company."),
      lt("研究记录不得直接触发自动交易。", "研究記錄不得直接觸發自動交易。", "This research record cannot directly trigger automated trading."),
    ],
    verificationChecklist: [
      lt("9月7日后SOXL是否相对纳指100、BTC和黄金走强。", "9月7日後SOXL是否相對納指100、BTC和黃金走強。", "Does SOXL outperform Nasdaq 100, BTC and gold after Sep 7?"),
      lt("9月中下旬至10月初是否形成阶段高位。", "9月中下旬至10月初是否形成階段高位。", "Does a local high form from mid/late September into early October?"),
    ],
    status: "active",
    visibility: "internal",
    humanReviewStatus: "approved",
    tags: ["soxl", "semiconductors", "oracle-six-yao", "teacher-priority", "forward-locked", "no-auto-trade"],
  },
  {
    id: "LIUYAO-CORE-GOLD-20260825-1025-V1",
    publishedAt: "2026-08-25",
    sourcePublishedAt: "2026-08-25",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-26T06:30:00+08:00",
    verificationEligibility: "formal",
    forecastStart: "2026-08-25",
    forecastEnd: "2026-10-25",
    accessLevel: "member",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "Gold"),
    symbol: "GOLD",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    internalSourceRef: "C:/Users/13558/Desktop/新建文件夹/丙午-8.25-10.25未来2个月金价预测.png",
    publicSourceLabel: lt("核心六爻研究", "核心六爻研究", "Core Liu Yao Research"),
    sourceProfileId: "core-liuyao-cycle",
    direction: "neutral",
    editorialConfidence: 84,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    horizon: lt("2026年8月25日至10月25日", "2026年8月25日至10月25日", "August 25 to October 25, 2026"),
    title: lt("黄金两个月：9月7日前强，随后温和回调", "黃金兩個月：9月7日前強，隨後溫和回調", "Gold: strength before Sep 7, then a mild pullback"),
    summary: lt(
      "9月7日前仍处高位整理并保留上行空间；9月7日至10月7日慢慢回落，但原结论明确认为跌幅不会很大；10月7日后存在小幅反弹，速度和力度偏慢。",
      "9月7日前仍處高位整理並保留上行空間；9月7日至10月7日慢慢回落，但原結論明確認為跌幅不會很大；10月7日後存在小幅反彈，速度和力度偏慢。",
      "Gold remains elevated with upside room before Sep 7. A gradual pullback is favored from Sep 7-Oct 7, explicitly described as limited in magnitude. A small, slow rebound is possible after Oct 7."
    ),
    rawSource: lt(
      "9月7日前相对高位并有上档空间；9月7日至10月7日慢慢回落且幅度不大；10月7日后小幅上档，伏吟提示节奏偏慢。",
      "9月7日前相對高位並有上檔空間；9月7日至10月7日慢慢回落且幅度不大；10月7日後小幅上檔，伏吟提示節奏偏慢。",
      "The source states elevated/upside conditions before Sep 7, a gradual limited pullback through Oct 7, and a small, slow rebound afterward."
    ),
    moonxInterpretation: lt(
      "这不是9月7日后单边大跌，也不支持在9月7日前抢跑做空。与既有九月偏弱方向相容，但将月内路径修订为前强、后缓慢回调。",
      "這不是9月7日後單邊大跌，也不支持在9月7日前搶跑做空。與既有九月偏弱方向相容，但將月內路徑修訂為前強、後緩慢回調。",
      "This is not a one-way plunge after Sep 7 and does not support pre-emptive shorts before then. It is compatible with the existing softer September bias while revising the path to early strength followed by a gradual pullback."
    ),
    thesis: [
      lt("9月7日前先按高位整理或继续试高处理。", "9月7日前先按高位整理或繼續試高處理。", "Treat the period before Sep 7 as elevated consolidation or another upside probe."),
      lt("9月7日至10月7日偏温和回调，不按崩跌处理。", "9月7日至10月7日偏溫和回調，不按崩跌處理。", "Favor a mild pullback, not a crash, from Sep 7-Oct 7."),
      lt("视频中的价格数字是讲解示例，不作为正式目标。", "影片中的價格數字是講解示例，不作為正式目標。", "Price figures mentioned conversationally are examples, not formal targets."),
    ],
    turningWindows: [
      { id: "gold-transition-20260907", date: "2026-09-07", label: lt("由强转入温和回调", "由強轉入溫和回調", "Strength-to-pullback transition") },
      { id: "gold-rebound-20261007", date: "2026-10-07", label: lt("小幅反弹候选", "小幅反彈候選", "Small-rebound candidate") },
    ],
    risks: [
      lt("半导体走强与黄金回调只是相对强弱轮动，不代表两者每天严格反向。", "半導體走強與黃金回調只是相對強弱輪動，不代表兩者每天嚴格反向。", "Semiconductor strength and a gold pullback describe relative rotation, not strict daily inverse correlation."),
      lt("研究记录不得直接触发自动交易。", "研究記錄不得直接觸發自動交易。", "This research record cannot directly trigger automated trading."),
    ],
    verificationChecklist: [
      lt("9月7日前是否保持高位或继续试高。", "9月7日前是否保持高位或繼續試高。", "Does gold remain elevated or probe higher before Sep 7?"),
      lt("9月7日至10月7日是否出现温和、而非失控的回调。", "9月7日至10月7日是否出現溫和、而非失控的回調。", "Is the Sep 7-Oct 7 pullback mild rather than disorderly?"),
    ],
    status: "active",
    visibility: "internal",
    humanReviewStatus: "approved",
    tags: ["gold", "oracle-six-yao", "teacher-priority", "forward-locked", "no-auto-trade"],
  },
  {
    id: "LIUYAO-CORE-BTC-20260824-0910-V1",
    publishedAt: "2026-08-25",
    sourcePublishedAt: "2026-08-25",
    sourcePublishedAtVerified: true,
    ingestedAt: "2026-08-26T06:30:00+08:00",
    verificationEligibility: "formal",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-09-10",
    accessLevel: "member",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    internalSourceRef: "C:/Users/13558/Desktop/新建文件夹/丙午-比特币9月10号前能否突破8.5万 .png",
    publicSourceLabel: lt("核心六爻研究", "核心六爻研究", "Core Liu Yao Research"),
    sourceProfileId: "core-liuyao-cycle",
    direction: "slightly-bullish",
    editorialConfidence: 86,
    consensusEligible: true,
    layer: "tactical",
    sourceStatus: "raw_source_saved",
    horizon: lt("2026年8月24日至9月10日", "2026年8月24日至9月10日", "August 24 to September 10, 2026"),
    title: lt("比特币9月10日前：趋势仍向上，8.5万上方难度高", "比特幣9月10日前：趨勢仍向上，8.5萬上方難度高", "Bitcoin before Sep 10: upward bias, difficult break above 85k"),
    summary: lt(
      "原结论并不是9月7日后立即下跌，而是9月10日前趋势仍向上，但8万至8.5万一带可能出现解套与兑现卖压。来源给出的定性判断是约八成难以在9月10日前突破8.5万美元；该比例是老师主观判断，不是统计模型概率。",
      "原結論並不是9月7日後立即下跌，而是9月10日前趨勢仍向上，但8萬至8.5萬一帶可能出現解套與兌現賣壓。來源給出的定性判斷是約八成難以在9月10日前突破8.5萬美元；該比例是老師主觀判斷，不是統計模型機率。",
      "The source does not call for an immediate decline after Sep 7. It keeps an upward trend into Sep 10 but expects trapped-supply and profit-taking pressure around USD 80k-85k. The stated roughly 80% difficulty is a discretionary source estimate, not a statistical probability."
    ),
    rawSource: lt(
      "子孙生财说明9月10日前趋势仍往上涨；财爻发动化兄弟申金回头克，8万至8.5万附近解套卖压增强，因此8.5万较难突破。",
      "子孫生財說明9月10日前趨勢仍往上漲；財爻發動化兄弟申金回頭克，8萬至8.5萬附近解套賣壓增強，因此8.5萬較難突破。",
      "The source reads Child producing Wealth as an upward trend into Sep 10, while Wealth changing to Brother Shen with returning restraint represents heavier exit supply near USD 80k-85k."
    ),
    moonxInterpretation: lt(
      "与网站既有的“9月上旬冲高、9月9日至11日进入变盘窗口、中下旬退守”路径同向。新增材料提高上旬上冲受限与高位兑现风险的信心，但不能把9月7日写成确定下跌日。",
      "與網站既有的「9月上旬衝高、9月9日至11日進入變盤窗口、中下旬退守」路徑同向。新增材料提高上旬上衝受限與高位兌現風險的信心，但不能把9月7日寫成確定下跌日。",
      "This aligns with the existing path of an early-September push, a Sep 9-11 turn window and later-month defense. It raises confidence in capped upside and profit-taking risk, but Sep 7 must not be presented as a certain down day."
    ),
    thesis: [
      lt("9月10日前仍允许继续上冲，不提前定义为下跌趋势。", "9月10日前仍允許繼續上衝，不提前定義為下跌趨勢。", "Further upside remains possible before Sep 10; do not pre-label the period as a downtrend."),
      lt("8万至8.5万美元是兑现卖压观察区，突破需要新增承接。", "8萬至8.5萬美元是兌現賣壓觀察區，突破需要新增承接。", "USD 80k-85k is a supply/realization zone where a breakout needs fresh demand."),
      lt("9月9日至11日仍按窗口而非精确日管理。", "9月9日至11日仍按窗口而非精確日管理。", "Sep 9-11 remains a window, not an exact-date promise."),
    ],
    resistances: [80000, 85000],
    turningWindows: [
      { id: "btc-turn-window-20260909-11", start: "2026-09-09", end: "2026-09-11", label: lt("上冲受阻 / 变盘观察窗", "上衝受阻 / 變盤觀察窗", "Upside-cap / turn watch"), note: lt("网站原有窗口与新增目标卦方向相容；不是确定最高点。", "網站原有窗口與新增目標卦方向相容；不是確定最高點。", "The existing website window is compatible with the new target-specific reading; it is not a certain final top.") },
    ],
    invalidation: lt(
      "若9月10日前有效突破并持续站稳8.5万美元，且回踩后仍有承接，则本条“上冲受限”判断失效。",
      "若9月10日前有效突破並持續站穩8.5萬美元，且回踩後仍有承接，則本條「上衝受限」判斷失效。",
      "A sustained break above USD 85k before Sep 10, followed by supported retests, invalidates the capped-upside thesis."
    ),
    risks: [
      lt("半导体走强并不自动等于BTC下跌；必须由BTC自身价格结构确认。", "半導體走強並不自動等於BTC下跌；必須由BTC自身價格結構確認。", "Semiconductor strength does not automatically mean BTC declines; BTC's own price structure must confirm."),
      lt("研究记录不得直接触发自动交易。", "研究記錄不得直接觸發自動交易。", "This research record cannot directly trigger automated trading."),
    ],
    verificationChecklist: [
      lt("9月10日前BTC是否延续上冲但未能站稳8.5万美元。", "9月10日前BTC是否延續上衝但未能站穩8.5萬美元。", "Does BTC continue probing higher without holding above USD 85k before Sep 10?"),
      lt("9月9日至11日附近是否出现换手、冲高受阻或方向切换。", "9月9日至11日附近是否出現換手、衝高受阻或方向切換。", "Does turnover, an upside stall or a directional switch appear near Sep 9-11?"),
    ],
    status: "active",
    visibility: "internal",
    humanReviewStatus: "approved",
    tags: ["bitcoin", "oracle-six-yao", "teacher-priority", "forward-locked", "no-auto-trade"],
  },
];
