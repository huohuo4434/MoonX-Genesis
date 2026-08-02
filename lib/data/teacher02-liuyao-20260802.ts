import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const PUBLISHED_AT = "2026-08-02";
const INGESTED_AT = "2026-08-02T20:58:00+08:00";
const EXPIRES_AT = "2026-08-10T23:59:59+08:00";

function common(input: Omit<ResearchRecord, "publishedAt" | "sourcePublishedAt" | "sourcePublishedAtVerified" | "ingestedAt" | "expiresAt" | "sourceType" | "framework" | "publicSourceLabel" | "consensusEligible" | "visibility" | "verificationEligibility" | "sourceStatus" | "publishGate" | "humanReviewStatus">): ResearchRecord {
  return {
    ...input,
    publishedAt: PUBLISHED_AT,
    sourcePublishedAt: PUBLISHED_AT,
    sourcePublishedAtVerified: true,
    ingestedAt: INGESTED_AT,
    expiresAt: EXPIRES_AT,
    sourceType: "external-symbolic-analysis",
    framework: "oracle-six-yao",
    publicSourceLabel: lt("外部六爻来源02", "外部六爻來源02", "External Liu Yao Source 02"),
    consensusEligible: false,
    visibility: "internal",
    verificationEligibility: "formal",
    sourceStatus: "raw_source_saved",
    publishGate: "approved",
    humanReviewStatus: "approved",
  };
}

/**
 * Auxiliary teacher 02 forward research supplied by the user on 2026-08-02.
 * These records are deliberately NOT global-consensus eligible and can never
 * trigger trading alone. They are blended only inside the Liu-Yao module using
 * the asset-specific weights in teacher-source-weights.ts.
 */
export const teacher02Liuyao20260802Records: ResearchRecord[] = [
  common({
    id: "T02-ETH-20260803-0810",
    forecastStart: "2026-08-03",
    forecastEnd: "2026-08-10",
    assetId: "ethereum",
    assetName: lt("以太坊", "以太坊", "Ethereum"),
    symbol: "ETH",
    market: "crypto",
    internalSourceRef: "用户上传：辅助导师02（狼叔）2026-08-02视频截图；ETH周度路径",
    direction: "slightly-bullish",
    editorialConfidence: 66,
    layer: "tactical",
    horizon: lt("2026年8月3日至8月10日", "2026年8月3日至8月10日", "Aug 3–10, 2026"),
    title: lt("ETH先强、急跌、再V形修复的高波动路径", "ETH先強、急跌、再V形修復的高波動路徑", "ETH early strength, sharp drop, then V-shaped repair"),
    summary: lt(
      "辅助导师02认为ETH在8月3日至5日更容易先走强，8月6日至7日存在急跌与深幅回踩风险，8月8日至10日再进入强波动V形修复；8月9日附近可能冲高，8月10日再观察变盘。",
      "輔助導師02認為ETH在8月3日至5日更容易先走強，8月6日至7日存在急跌與深幅回踩風險，8月8日至10日再進入強波動V形修復；8月9日附近可能衝高，8月10日再觀察變盤。",
      "Teacher 02 expects early strength on Aug 3–5, sharp pullback risk on Aug 6–7, then a volatile V-shaped repair on Aug 8–10, with a possible high near Aug 9 and another turn watch on Aug 10."
    ),
    thesis: [
      lt("周内不是单边行情；先涨、再急跌、再修复的路径权重更高。", "週內不是單邊行情；先漲、再急跌、再修復的路徑權重更高。", "The week is not expected to be one-way; rise, sharp drop, then repair is the preferred path."),
      lt("8月6日至7日是风险窗口，8月9日至10日是第二次高波动窗口。", "8月6日至7日是風險窗口，8月9日至10日是第二次高波動窗口。", "Aug 6–7 is the main risk window; Aug 9–10 is a second volatility window."),
    ],
    risks: [lt("路径波动大，任何单日上涨都不能直接定义为主升。", "路徑波動大，任何單日上漲都不能直接定義為主升。", "High path volatility means a single up day cannot confirm a primary uptrend.")],
    turningWindows: [
      { id: "eth-t02-high-0805", date: "2026-08-05", label: lt("前段强势或阶段高点窗口", "前段強勢或階段高點窗口", "Early strength / local high window") },
      { id: "eth-t02-low-0807", date: "2026-08-07", label: lt("急跌与低点反转观察", "急跌與低點反轉觀察", "Sharp-drop and low-turn watch") },
      { id: "eth-t02-high-0809", date: "2026-08-09", label: lt("V形修复高点观察", "V形修復高點觀察", "V-repair high watch") },
      { id: "eth-t02-turn-0810", date: "2026-08-10", label: lt("再变盘观察", "再變盤觀察", "Second turn watch") },
    ],
    verificationChecklist: [
      lt("8月3日至5日是否先强于8月6日至7日。", "8月3日至5日是否先強於8月6日至7日。", "Was Aug 3–5 stronger than Aug 6–7?"),
      lt("8月6日至7日是否出现明显回踩或急跌。", "8月6日至7日是否出現明顯回踩或急跌。", "Did a meaningful pullback occur on Aug 6–7?"),
      lt("8月8日至10日是否出现V形修复与二次变盘。", "8月8日至10日是否出現V形修復與二次變盤。", "Did Aug 8–10 show V-shaped repair and another turn?"),
    ],
    status: "active",
    tags: ["ethereum", "eth", "source:teacher02", "policy:teacher02-liuyao", "forward-sample", "source-locked", "no-retroactive-edit", "no-auto-trade"],
  }),
  common({
    id: "T02-NDX-20260803-0810",
    forecastStart: "2026-08-03",
    forecastEnd: "2026-08-10",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    sourceSymbol: "QQQ",
    market: "index",
    internalSourceRef: "用户上传：辅助导师02（狼叔）2026-08-02视频截图；QQQ周度路径",
    direction: "slightly-bullish",
    editorialConfidence: 70,
    layer: "tactical",
    horizon: lt("2026年8月3日至8月10日", "2026年8月3日至8月10日", "Aug 3–10, 2026"),
    title: lt("QQQ周初下探、周中修复、随后防回吐", "QQQ週初下探、週中修復、隨後防回吐", "QQQ early dip, midweek repair, then fade risk"),
    summary: lt(
      "辅助导师02认为QQQ周一至周二更容易遇阻下探，随后出现修复；8月6日前后需防获利回吐，整体仍属于先压后修复而非稳定主升。",
      "輔助導師02認為QQQ週一至週二更容易遇阻下探，隨後出現修復；8月6日前後需防獲利回吐，整體仍屬於先壓後修復而非穩定主升。",
      "Teacher 02 expects QQQ to dip early in the week, repair afterward, and face profit-taking risk around Aug 6. This is a dip-and-repair path, not a confirmed primary uptrend."
    ),
    thesis: [
      lt("前段承压、中段修复的方向与MOOX现有探底回升路径高度接近。", "前段承壓、中段修復的方向與MOOX現有探底回升路徑高度接近。", "The early-pressure, midweek-repair path closely matches the current MOOX dip-and-recovery view."),
      lt("8月6日前后需防修复后的获利回吐。", "8月6日前後需防修復後的獲利回吐。", "Watch for profit-taking after repair around Aug 6."),
    ],
    risks: [lt("修复集中于少数权重股时，指数表面上涨不代表宽度改善。", "修復集中於少數權重股時，指數表面上漲不代表寬度改善。", "A narrow mega-cap repair may not mean broad market improvement.")],
    turningWindows: [
      { id: "ndx-t02-low-0804", start: "2026-08-03", end: "2026-08-04", label: lt("周初下探窗口", "週初下探窗口", "Early-week dip window") },
      { id: "ndx-t02-fade-0806", date: "2026-08-06", label: lt("修复后回吐观察", "修復後回吐觀察", "Post-repair fade watch") },
    ],
    verificationChecklist: [
      lt("周初是否先下探再修复。", "週初是否先下探再修復。", "Did the week dip before repairing?"),
      lt("8月6日前后是否出现获利回吐。", "8月6日前後是否出現獲利回吐。", "Was there profit-taking around Aug 6?"),
    ],
    status: "active",
    tags: ["nasdaq-100", "ndx", "qqq", "source:teacher02", "policy:teacher02-liuyao", "forward-sample", "source-locked", "no-retroactive-edit", "no-auto-trade"],
  }),
  common({
    id: "T02-SPX-20260803-0810",
    forecastStart: "2026-08-03",
    forecastEnd: "2026-08-10",
    assetId: "sp500",
    assetName: lt("标普500", "標普500", "S&P 500"),
    symbol: "SPX",
    sourceSymbol: "SPY",
    market: "index",
    internalSourceRef: "用户上传：辅助导师02（狼叔）2026-08-02视频截图；SPY周度路径",
    direction: "slightly-bullish",
    editorialConfidence: 64,
    layer: "tactical",
    horizon: lt("2026年8月3日至8月10日", "2026年8月3日至8月10日", "Aug 3–10, 2026"),
    title: lt("SPY周初探底后V形修复", "SPY週初探底後V形修復", "SPY early dip followed by V-shaped repair"),
    summary: lt(
      "辅助导师02认为SPY周一至周二先下探并形成阶段低点，随后进入V形修复，后半周可能维持偏强。这与MOOX现有“周初反弹、周中后回落”路径顺序相反，因此只作为分歧源参与内部六爻加权。",
      "輔助導師02認為SPY週一至週二先下探並形成階段低點，隨後進入V形修復，後半週可能維持偏強。這與MOOX現有「週初反彈、週中後回落」路徑順序相反，因此只作為分歧源參與內部六爻加權。",
      "Teacher 02 expects an early SPY dip and local low, followed by V-shaped repair and possible late-week strength. This conflicts with the current MOOX rise-then-fade order, so it remains a disagreement source inside the Liu-Yao blend."
    ),
    thesis: [lt("先跌后涨是辅助导师02的主路径，但不覆盖MOOX已锁定的冲高回落版本。", "先跌後漲是輔助導師02的主路徑，但不覆蓋MOOX已鎖定的衝高回落版本。", "Dip-then-rise is Teacher 02's main path, but it does not overwrite MOOX's locked rise-then-fade version.")],
    risks: [lt("两套路径先后顺序相反，周初价格结构是关键裁决条件。", "兩套路徑先後順序相反，週初價格結構是關鍵裁決條件。", "The two paths have opposite sequencing; early-week price structure is the key tie-breaker.")],
    turningWindows: [
      { id: "spx-t02-low-0804", start: "2026-08-03", end: "2026-08-04", label: lt("周初低点观察", "週初低點觀察", "Early-week low watch") },
      { id: "spx-t02-repair-0805", start: "2026-08-05", end: "2026-08-07", label: lt("V形修复观察", "V形修復觀察", "V-shaped repair watch") },
    ],
    verificationChecklist: [
      lt("周一至周二是否先形成低点。", "週一至週二是否先形成低點。", "Did Monday–Tuesday form a local low first?"),
      lt("后半周是否出现V形修复并维持强势。", "後半週是否出現V形修復並維持強勢。", "Did late week show and hold a V-shaped repair?"),
    ],
    status: "active",
    tags: ["sp500", "spx", "spy", "source:teacher02", "policy:teacher02-liuyao", "forward-sample", "source-locked", "no-retroactive-edit", "no-auto-trade", "path-conflict"],
  }),
  common({
    id: "T02-GOLD-20260803-0810",
    forecastStart: "2026-08-03",
    forecastEnd: "2026-08-10",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "Gold"),
    symbol: "GOLD",
    sourceSymbol: "GLD",
    market: "commodity",
    internalSourceRef: "用户上传：辅助导师02（狼叔）2026-08-02视频截图；GLD周度路径",
    direction: "bullish",
    editorialConfidence: 74,
    layer: "tactical",
    horizon: lt("2026年8月3日至8月10日", "2026年8月3日至8月10日", "Aug 3–10, 2026"),
    title: lt("黄金周初寻低后进入小周期修复", "黃金週初尋低後進入小週期修復", "Gold seeks an early low before a short-cycle repair"),
    summary: lt(
      "辅助导师02认为黄金周一至周二先寻找低点，8月4日前后可能完成第一低点或初步反转，随后进入小周期上涨；8月7日前后再观察修复能否延续。该方向与MOOX现有先跌后涨路径高度一致。",
      "輔助導師02認為黃金週一至週二先尋找低點，8月4日前後可能完成第一低點或初步反轉，隨後進入小週期上漲；8月7日前後再觀察修復能否延續。該方向與MOOX現有先跌後漲路徑高度一致。",
      "Teacher 02 expects gold to seek an early-week low, possibly form an initial low or turn near Aug 4, then enter a short-cycle advance. Aug 7 is a second confirmation window. This closely aligns with MOOX's dip-then-rise path."
    ),
    thesis: [
      lt("8月4日前后是第一低点或反转窗口。", "8月4日前後是第一低點或反轉窗口。", "Around Aug 4 is the first low/turn window."),
      lt("8月7日前后用于确认修复是否延续，而不是无条件追涨。", "8月7日前後用於確認修復是否延續，而不是無條件追漲。", "Around Aug 7 is for confirming repair continuation, not chasing unconditionally."),
    ],
    risks: [lt("即使方向一致，也只定义为逆势修复，不直接升级为持续主升。", "即使方向一致，也只定義為逆勢修復，不直接升級為持續主升。", "Even with alignment, this remains a countertrend repair rather than a confirmed primary uptrend.")],
    turningWindows: [
      { id: "gold-t02-low-0804", date: "2026-08-04", label: lt("第一低点或初步反转", "第一低點或初步反轉", "First low / initial reversal") },
      { id: "gold-t02-confirm-0807", date: "2026-08-07", label: lt("修复延续确认", "修復延續確認", "Repair continuation confirmation") },
    ],
    verificationChecklist: [
      lt("8月3日至4日是否先下探并形成低点。", "8月3日至4日是否先下探並形成低點。", "Did Aug 3–4 dip and form a low?"),
      lt("8月4日后是否进入持续数日的修复。", "8月4日後是否進入持續數日的修復。", "Did a multi-day repair begin after Aug 4?"),
    ],
    status: "active",
    tags: ["gold", "gld", "source:teacher02", "policy:teacher02-liuyao", "gold-specialty", "forward-sample", "source-locked", "no-retroactive-edit", "no-auto-trade"],
  }),
  common({
    id: "T02-SILVER-20260803-0810",
    forecastStart: "2026-08-03",
    forecastEnd: "2026-08-10",
    assetId: "silver",
    assetName: lt("国际银价", "國際銀價", "Silver"),
    symbol: "SILVER",
    sourceSymbol: "SLV",
    market: "commodity",
    internalSourceRef: "用户上传：辅助导师02（狼叔）2026-08-02视频截图；SLV周度路径",
    direction: "bullish",
    editorialConfidence: 70,
    layer: "tactical",
    horizon: lt("2026年8月3日至8月10日", "2026年8月3日至8月10日", "Aug 3–10, 2026"),
    title: lt("白银周初扎坑洗盘后修复", "白銀週初扎坑洗盤後修復", "Silver washout early, then repair"),
    summary: lt(
      "辅助导师02认为白银8月3日至4日先扎坑洗盘，8月4日盘中可能完成阶段低点，随后上涨数日；但白银强度低于黄金、波动更大，修复途中仍可能出现急跌与回踩。",
      "輔助導師02認為白銀8月3日至4日先扎坑洗盤，8月4日盤中可能完成階段低點，隨後上漲數日；但白銀強度低於黃金、波動更大，修復途中仍可能出現急跌與回踩。",
      "Teacher 02 expects silver to wash out on Aug 3–4, possibly form a local low intraday on Aug 4, then rise for several days. Silver remains weaker and more volatile than gold, with pullback risk during repair."
    ),
    thesis: [
      lt("8月3日至4日先下探，随后进入数日修复。", "8月3日至4日先下探，隨後進入數日修復。", "Dip on Aug 3–4, then enter a multi-day repair."),
      lt("白银方向与黄金一致，但强度低、回撤更快。", "白銀方向與黃金一致，但強度低、回撤更快。", "Silver aligns with gold directionally but is weaker and more volatile."),
    ],
    risks: [lt("高波动使低点和反弹都可能提前或延后一个交易时段。", "高波動使低點和反彈都可能提前或延後一個交易時段。", "High volatility may shift the low or rebound by one trading session.")],
    turningWindows: [
      { id: "silver-t02-low-0804", date: "2026-08-04", label: lt("洗盘低点观察", "洗盤低點觀察", "Washout-low watch") },
      { id: "silver-t02-repair-0805", start: "2026-08-05", end: "2026-08-08", label: lt("数日修复窗口", "數日修復窗口", "Multi-day repair window") },
    ],
    verificationChecklist: [
      lt("8月3日至4日是否先下探。", "8月3日至4日是否先下探。", "Did Aug 3–4 dip first?"),
      lt("8月4日后是否出现持续数日的修复。", "8月4日後是否出現持續數日的修復。", "Did a multi-day repair follow Aug 4?"),
      lt("白银是否弱于同期黄金。", "白銀是否弱於同期黃金。", "Was silver weaker than gold over the same window?"),
    ],
    status: "active",
    tags: ["silver", "slv", "source:teacher02", "policy:teacher02-liuyao", "forward-sample", "source-locked", "no-retroactive-edit", "no-auto-trade"],
  }),
];

export const TEACHER02_RECORD_IDS = teacher02Liuyao20260802Records.map((record) => record.id);
