import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const INGESTED_AT = "2026-08-15T16:02:00+08:00";

type RecordSeed = Pick<
  ResearchRecord,
  "id" | "assetId" | "assetName" | "symbol" | "market" | "framework" | "direction" | "forecastStart" | "forecastEnd" | "title" | "summary" | "turningWindows" | "tags"
> & {
  sourceRef: string;
  sourceDate: string;
  confidence: number;
};

function researchOnly(seed: RecordSeed): ResearchRecord {
  return {
    id: seed.id,
    publishedAt: seed.sourceDate,
    sourcePublishedAt: seed.sourceDate,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    forecastStart: seed.forecastStart,
    forecastEnd: seed.forecastEnd,
    assetId: seed.assetId,
    assetName: seed.assetName,
    symbol: seed.symbol,
    market: seed.market,
    framework: seed.framework,
    sourceType: "public-analyst",
    internalSourceRef: seed.sourceRef,
    publicSourceLabel: lt("易老师综合解读", "易老師綜合解讀", "Yi interpretation"),
    direction: seed.direction,
    editorialConfidence: seed.confidence,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    verificationEligibility: "provisional",
    layer: "tactical",
    horizon: lt(`${seed.forecastStart} 至 ${seed.forecastEnd}`, `${seed.forecastStart} 至 ${seed.forecastEnd}`, `${seed.forecastStart} to ${seed.forecastEnd}`),
    title: seed.title,
    summary: seed.summary,
    moonxInterpretation: seed.summary,
    thesis: [lt("仅作研究辅助；不覆盖正式锁定周方向。", "僅作研究輔助；不覆蓋正式鎖定週方向。", "Research-only auxiliary evidence; it cannot override the locked weekly direction.")],
    turningWindows: seed.turningWindows,
    sourceStatus: "summary_only",
    status: "active",
    visibility: "internal",
    tags: [...seed.tags, "research-only", "no-direction-score", "ingested-20260815"],
  };
}

/**
 * User-supplied research archive received on 2026-08-15.
 *
 * Important integrity boundary:
 * - the Liuyao transcript does not contain a reliably structured original chart;
 * - the technical/macro material was ingested after its 2026-08-14 observation;
 * - consequently every record is provisional, RESEARCH_ONLY and consensus-ineligible.
 */
export const teacherResearch20260815: ResearchRecord[] = [
  researchOnly({
    id: "SOURCE-WOLF-SPX-WEEK-20260815",
    assetId: "sp500", assetName: lt("标普500", "標普500", "S&P 500"), symbol: "SPX", market: "index", framework: "oracle-six-yao",
    direction: "slightly-bearish", forecastStart: "2026-08-17", forecastEnd: "2026-08-21", sourceDate: "2026-08-15", confidence: 52,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("SPX：周中波动放大，空方略占优", "SPX：週中波動放大，空方略佔優", "SPX: volatility may expand midweek; bears slightly favored"),
    summary: lt("周初仍有蓄力或上冲尝试；8月19日至20日波动与回落风险增大，后段可能出现超跌修复。因缺少可核验原盘，只保留为路径风险提示。", "週初仍有蓄力或上沖嘗試；8月19日至20日波動與回落風險增大，後段可能出現超跌修復。因缺少可核驗原盤，只保留為路徑風險提示。", "Early strength remains possible; Aug 19-20 carries higher volatility and downside risk, followed by a possible oversold repair. The original chart is unavailable, so this remains a path-risk note."),
    turningWindows: [{ id: "SPX-20260819-20", start: "2026-08-19", end: "2026-08-20", label: lt("波动放大窗口", "波動放大窗口", "Volatility window") }],
    tags: ["spx", "weekly", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-WOLF-NDX-WEEK-20260815",
    assetId: "nasdaq-100", assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"), symbol: "NDX", market: "index", framework: "oracle-six-yao",
    direction: "bearish", forecastStart: "2026-08-17", forecastEnd: "2026-08-21", sourceDate: "2026-08-15", confidence: 54,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("NDX：相对偏弱，先修复后仍防回落", "NDX：相對偏弱，先修復後仍防回落", "NDX: relatively weaker; repair may precede renewed pressure"),
    summary: lt("周初若先下探，可能出现资金回流和反弹；8月19日至20日更容易进入震荡下行，后段再观察超跌修复。缺原盘，不升级为正式六爻方向。", "週初若先下探，可能出現資金回流和反彈；8月19日至20日更容易進入震盪下行，後段再觀察超跌修復。缺原盤，不升級為正式六爻方向。", "An early dip may attract a rebound, while Aug 19-20 is more exposed to choppy downside before a possible late repair. No original chart means no formal Liuyao promotion."),
    turningWindows: [{ id: "NDX-20260819-20", start: "2026-08-19", end: "2026-08-20", label: lt("偏空变盘窗口", "偏空變盤窗口", "Bearish turn window") }],
    tags: ["ndx", "weekly", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-WOLF-BTC-WEEK-20260815",
    assetId: "bitcoin", assetName: lt("比特币", "比特幣", "Bitcoin"), symbol: "BTC", market: "crypto", framework: "oracle-six-yao",
    direction: "neutral", forecastStart: "2026-08-17", forecastEnd: "2026-08-23", sourceDate: "2026-08-15", confidence: 46,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("BTC：先强后弱与先弱后修复两路径并存", "BTC：先強後弱與先弱後修復兩路徑並存", "BTC: both rebound-then-selloff and selloff-then-repair remain open"),
    summary: lt("8月17日至19日能量增强但伴随冲顶风险；19日至20日是主要变盘窗，20日可能形成周内高点。来源本身承认路径不确定，因此综合层保持中性，不据此翻转正式周方向。", "8月17日至19日能量增強但伴隨衝頂風險；19日至20日是主要變盤窗，20日可能形成週內高點。來源本身承認路徑不確定，因此綜合層保持中性，不據此翻轉正式週方向。", "Energy may strengthen Aug 17-19 but with topping risk. Aug 19-20 is the main turn window and the 20th may mark a weekly high. The source itself presents competing paths, so the synthesis remains neutral."),
    turningWindows: [
      { id: "BTC-20260819-20", start: "2026-08-19", end: "2026-08-20", label: lt("主要变盘窗口", "主要變盤窗口", "Primary turn window") },
      { id: "BTC-20260823", date: "2026-08-23", label: lt("次级观察日", "次級觀察日", "Secondary watch date") },
    ],
    tags: ["btc", "weekly", "conflicting-paths", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-WOLF-ETH-WEEK-20260815",
    assetId: "ethereum", assetName: lt("以太坊", "以太坊", "Ethereum"), symbol: "ETH", market: "crypto", framework: "oracle-six-yao",
    direction: "neutral", forecastStart: "2026-08-17", forecastEnd: "2026-08-23", sourceDate: "2026-08-15", confidence: 44,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("ETH：高波动无趋势，20日前后重点防反转", "ETH：高波動無趨勢，20日前後重點防反轉", "ETH: high-volatility range; watch for a reversal around Aug 20"),
    summary: lt("当前更接近无趋势来回震荡；17日至19日可能快速反弹，20日前后若反弹失败则回落风险显著。原叙述明确承认此前时点存在一天偏差，故不参与动态权重。", "當前更接近無趨勢來回震盪；17日至19日可能快速反彈，20日前後若反彈失敗則回落風險顯著。原敘述明確承認此前時點存在一天偏差，故不參與動態權重。", "The market is described as trendless and volatile. A fast rebound may occur Aug 17-19; failure around Aug 20 would raise downside risk. The source acknowledges a prior one-day timing miss, so it is excluded from dynamic weighting."),
    turningWindows: [{ id: "ETH-20260820", date: "2026-08-20", label: lt("反转确认日", "反轉確認日", "Reversal confirmation date") }],
    tags: ["eth", "weekly", "conflicting-paths", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-WOLF-GOLD-WEEK-20260815",
    assetId: "gold", assetName: lt("黄金", "黃金", "Gold"), symbol: "GLD", market: "commodity", framework: "oracle-six-yao",
    direction: "slightly-bearish", forecastStart: "2026-08-17", forecastEnd: "2026-08-21", sourceDate: "2026-08-15", confidence: 50,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("黄金：周初仍可冲高，18日至19日防补缺口", "黃金：週初仍可衝高，18日至19日防補缺口", "Gold: an early push remains possible; gap-fill risk rises Aug 18-19"),
    summary: lt("8月17日仍可能出现上冲或减仓窗口，18日至19日回落风险上升；缺少原始排盘，跌幅与是否完全补缺口均不作确定断言。", "8月17日仍可能出現上衝或減倉窗口，18日至19日回落風險上升；缺少原始排盤，跌幅與是否完全補缺口均不作確定斷言。", "Aug 17 may still offer an upside or de-risking window, while downside risk rises Aug 18-19. Without the original chart, neither decline magnitude nor a full gap fill is asserted."),
    turningWindows: [{ id: "GOLD-20260818-19", start: "2026-08-18", end: "2026-08-19", label: lt("回落风险窗口", "回落風險窗口", "Downside-risk window") }],
    tags: ["gold", "gld", "weekly", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-WOLF-SILVER-WEEK-20260815",
    assetId: "silver", assetName: lt("白银", "白銀", "Silver"), symbol: "SILVER", market: "commodity", framework: "oracle-six-yao",
    direction: "bearish", forecastStart: "2026-08-17", forecastEnd: "2026-08-21", sourceDate: "2026-08-15", confidence: 47,
    sourceRef: "wolf-liuyao-transcript-week-20260817",
    title: lt("白银：相对黄金更弱，仍处高波动蓄势", "白銀：相對黃金更弱，仍處高波動蓄勢", "Silver: weaker than gold and still in a high-volatility buildup"),
    summary: lt("相对黄金更弱，方向偏谨慎；来源只给出蓄势与高波动描述，未提供可核验的独立逐日路径，因此不拆分具体交易日结论。", "相對黃金更弱，方向偏謹慎；來源只給出蓄勢與高波動描述，未提供可核驗的獨立逐日路徑，因此不拆分具體交易日結論。", "Silver is described as weaker than gold. The source supplies only a high-volatility buildup thesis, not a verifiable daily path, so no day-by-day conclusions are invented."),
    tags: ["silver", "weekly", "source-chart-missing"],
  }),
  researchOnly({
    id: "SOURCE-GAOSHAN-SPX-20260814",
    assetId: "sp500", assetName: lt("标普500", "標普500", "S&P 500"), symbol: "SPX", market: "index", framework: "chan",
    direction: "neutral", forecastStart: "2026-08-14", forecastEnd: "2026-08-18", sourceDate: "2026-08-14", confidence: 59,
    sourceRef: "gaoshan-chan-transcript-and-chart-20260814",
    title: lt("SPX：高位结构趋于衰竭，但尚无顶部确认", "SPX：高位結構趨於衰竭，但尚無頂部確認", "SPX: elevated structure is tiring, but no top is confirmed"),
    summary: lt("30分钟中枢与上行盘整正在完成4小时内部结构，动能逐步衰竭；但尚无30分钟卖点和日线顶分型，因此只能提示回调风险，不能提前宣告见顶。", "30分鐘中樞與上行盤整正在完成4小時內部結構，動能逐步衰竭；但尚無30分鐘賣點和日線頂分型，因此只能提示回調風險，不能提前宣告見頂。", "A 30-minute center and upward consolidation are completing the four-hour structure as momentum fades. With no 30-minute sell point or daily top fractal, this is a pullback warning, not a top call."),
    tags: ["spx", "chan", "30m", "4h", "late-ingested"],
  }),
  researchOnly({
    id: "SOURCE-GAOSHAN-SNDK-20260814",
    assetId: "sandisk", assetName: lt("闪迪", "閃迪", "SanDisk"), symbol: "SNDK", market: "us-equity", framework: "chan",
    direction: "slightly-bullish", forecastStart: "2026-08-14", forecastEnd: "2026-08-18", sourceDate: "2026-08-14", confidence: 58,
    sourceRef: "gaoshan-chan-transcript-and-chart-20260814",
    title: lt("SNDK：30分钟三买成立但位置偏高", "SNDK：30分鐘三買成立但位置偏高", "SNDK: 30-minute third-buy structure, but at an elevated location"),
    summary: lt("回调后出现5分钟买点，三笔回调构成线段，结构可归为30分钟三买；但所处位置偏高且力度不强，只能作为偏多确认，不适合追价。该资料于次日录入，只进入历史方法复盘。", "回調後出現5分鐘買點，三筆回調構成線段，結構可歸為30分鐘三買；但所處位置偏高且力度不強，只能作為偏多確認，不適合追價。該資料於次日錄入，只進入歷史方法復盤。", "A five-minute buy point followed a pullback, with a three-stroke segment consistent with a 30-minute third buy. The setup is elevated and weak, so it confirms bias but does not justify chasing. Ingested a day later, it is historical method evidence only."),
    tags: ["sndk", "chan", "30m-third-buy", "late-ingested"],
  }),
  researchOnly({
    id: "SOURCE-GAOSHAN-MU-20260814",
    assetId: "mu", assetName: lt("美光科技", "美光科技", "Micron"), symbol: "MU", market: "us-equity", framework: "chan",
    direction: "slightly-bullish", forecastStart: "2026-08-14", forecastEnd: "2026-08-18", sourceDate: "2026-08-14", confidence: 60,
    sourceRef: "gaoshan-chan-transcript-and-chart-20260814",
    title: lt("MU：三买推进后进入冲高回踩阶段", "MU：三買推進後進入衝高回踩階段", "MU: third-buy advance entering a spike-and-pullback phase"),
    summary: lt("结构正在完成上行趋势类型，短线更像反弹、冲高、再回踩；方向偏多但节奏上不追高。财经材料同样认为MU相对SNDK更稳，不过具体点位因标的映射不明不写入系统。", "結構正在完成上行趨勢類型，短線更像反彈、衝高、再回踩；方向偏多但節奏上不追高。財經材料同樣認為MU相對SNDK更穩，不過具體點位因標的映射不明不寫入系統。", "The structure is completing an upward trend type and looks more like rebound, spike, then pullback. Bias is constructive, but chasing is discouraged. A separate market source also preferred MU over SNDK; ambiguous instrument levels were deliberately excluded."),
    tags: ["mu", "chan", "third-buy", "late-ingested"],
  }),
  researchOnly({
    id: "SOURCE-GAOSHAN-BTC-20260814",
    assetId: "bitcoin", assetName: lt("比特币", "比特幣", "Bitcoin"), symbol: "BTC", market: "crypto", framework: "chan",
    direction: "slightly-bearish", forecastStart: "2026-08-14", forecastEnd: "2026-08-18", sourceDate: "2026-08-14", confidence: 61,
    sourceRef: "gaoshan-chan-transcript-and-chart-20260814",
    title: lt("BTC：30分钟反弹后仍需完成4小时回踩", "BTC：30分鐘反彈後仍需完成4小時回踩", "BTC: 30-minute rebound still leaves a four-hour pullback incomplete"),
    summary: lt("4小时处于向下段，30分钟呈下—上—下结构并有背驰迹象；当前反弹属于短线向上段，随后仍需回踩以完成4小时内部结构。该判断只用于路径校验，不回写8月14日已发生行情。", "4小時處於向下段，30分鐘呈下—上—下結構並有背馳跡象；當前反彈屬於短線向上段，隨後仍需回踩以完成4小時內部結構。該判斷只用於路徑校驗，不回寫8月14日已發生行情。", "The four-hour structure remains in a downward leg. A 30-minute rebound is tactical and likely requires another pullback to complete the higher-timeframe structure. It is used for path validation only and never backfills Aug 14."),
    tags: ["btc", "chan", "30m", "4h", "late-ingested"],
  }),
  researchOnly({
    id: "SOURCE-GAOSHAN-ETH-20260814",
    assetId: "ethereum", assetName: lt("以太坊", "以太坊", "Ethereum"), symbol: "ETH", market: "crypto", framework: "chan",
    direction: "neutral", forecastStart: "2026-08-14", forecastEnd: "2026-08-18", sourceDate: "2026-08-14", confidence: 56,
    sourceRef: "gaoshan-chan-transcript-and-chart-20260814",
    title: lt("ETH：强于BTC但仍在1小时中枢震荡", "ETH：強於BTC但仍在1小時中樞震盪", "ETH: stronger than BTC but still inside a one-hour consolidation center"),
    summary: lt("ETH相对BTC更强，但仍处在1小时中枢整理，30分钟反弹与回踩交替；周末更偏窄幅三角震荡。该结构支持高波动观望，不单独生成方向票。", "ETH相對BTC更強，但仍處在1小時中樞整理，30分鐘反彈與回踩交替；週末更偏窄幅三角震盪。該結構支持高波動觀望，不單獨生成方向票。", "ETH is stronger than BTC but remains inside a one-hour consolidation center, alternating 30-minute rebounds and pullbacks. Weekend action was expected to resemble a narrow triangle; this supports waiting rather than a standalone direction vote."),
    tags: ["eth", "chan", "30m", "1h-center", "late-ingested"],
  }),
];

export const teacherArchiveIngestStatus20260815 = {
  textSourcesParsed: 29,
  chartImagesReviewed: 9,
  audioPendingTranscription: 3,
  policy: "UNTRANSCRIBED_AUDIO_CANNOT_INFLUENCE_RESEARCH",
} as const;
