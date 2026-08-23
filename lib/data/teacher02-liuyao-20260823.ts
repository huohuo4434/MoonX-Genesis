import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const PUBLISHED_AT = "2026-08-23";
const INGESTED_AT = "2026-08-23T11:05:00+08:00";
const EXPIRES_AT = "2026-08-29T00:00:00-04:00";

export type Teacher02SourceClockPolicy = {
  assetId: "gold" | "silver" | "ethereum";
  sourceSymbol: "GLD" | "SLV" | "ETH";
  sourceTimeZone: "America/New_York" | "UTC";
  marketClock: "US_SECURITIES_SESSION" | "CONTINUOUS_7X24";
  hasNewForwardForecast: boolean;
  note: string;
};

export const TEACHER02_SOURCE_CLOCK_POLICIES_20260823: Teacher02SourceClockPolicy[] = [
  {
    assetId: "gold",
    sourceSymbol: "GLD",
    sourceTimeZone: "America/New_York",
    marketClock: "US_SECURITIES_SESSION",
    hasNewForwardForecast: true,
    note: "原材料明确以GLD和北美交易时段表述，盘中时间按纽约夏令时EDT保存。",
  },
  {
    assetId: "silver",
    sourceSymbol: "SLV",
    sourceTimeZone: "America/New_York",
    marketClock: "US_SECURITIES_SESSION",
    hasNewForwardForecast: true,
    note: "原材料明确以SLV和北美交易时段表述，盘中时间按纽约夏令时EDT保存。",
  },
  {
    assetId: "ethereum",
    sourceSymbol: "ETH",
    sourceTimeZone: "UTC",
    marketClock: "CONTINUOUS_7X24",
    hasNewForwardForecast: false,
    note: "老师已将加密市场统一改用UTC；本次只有旧案复盘，没有完整的新一周ETH前瞻。",
  },
];

export type Teacher02ForwardWindow20260823 = {
  assetId: "gold" | "silver";
  phase: "WASHOUT" | "REPAIR" | "LATE_VOLATILITY";
  startAt: string;
  endAt: string;
  sourceTimeZone: "America/New_York";
  label: string;
};

export const TEACHER02_FORWARD_WINDOWS_20260823: Teacher02ForwardWindow20260823[] = [
  { assetId: "gold", phase: "WASHOUT", startAt: "2026-08-24T09:30:00-04:00", endAt: "2026-08-25T14:22:00-04:00", sourceTimeZone: "America/New_York", label: "周初震荡下杀与低点观察" },
  { assetId: "gold", phase: "REPAIR", startAt: "2026-08-25T14:22:00-04:00", endAt: "2026-08-27T14:22:00-04:00", sourceTimeZone: "America/New_York", label: "止跌后修复，周三至周四相对更强" },
  { assetId: "gold", phase: "LATE_VOLATILITY", startAt: "2026-08-27T14:22:00-04:00", endAt: "2026-08-28T16:00:00-04:00", sourceTimeZone: "America/New_York", label: "高位宽幅波动与回吐风险" },
  { assetId: "silver", phase: "WASHOUT", startAt: "2026-08-24T09:30:00-04:00", endAt: "2026-08-25T12:00:00-04:00", sourceTimeZone: "America/New_York", label: "周初洗盘与阶段低点观察" },
  { assetId: "silver", phase: "REPAIR", startAt: "2026-08-25T12:00:00-04:00", endAt: "2026-08-27T12:00:00-04:00", sourceTimeZone: "America/New_York", label: "反弹修复，周三允许较强阳线" },
  { assetId: "silver", phase: "LATE_VOLATILITY", startAt: "2026-08-27T12:00:00-04:00", endAt: "2026-08-28T16:00:00-04:00", sourceTimeZone: "America/New_York", label: "冲击压力后回吐与高波动" },
];

export const TEACHER02_REVIEW_EVOLUTION_POLICY_20260823 = {
  visibleSourceMethodVersion: "Rev3.2.9-h",
  completeFormulaRecovered: false,
  rules: [
    "方向是否命中与转折时间是否命中分开记分。",
    "美股交易品种的半日至一个交易日容差只影响时间评分，不能挽救错误方向。",
    "复盘按急涨急跌、真实支撑/压力和时间窗口三项核对，时间不能脱离价格结构单独触发。",
    "任何复盘结论只升级未来版本，不覆盖原始前瞻、失败样本或部分命中样本。",
    "只记录材料中可见的Rev3.2.9-h版本号；完整公式未恢复前禁止从案例反推成自动规则。",
  ],
} as const;

function common(
  input: Omit<
    ResearchRecord,
    | "publishedAt"
    | "sourcePublishedAt"
    | "sourcePublishedAtVerified"
    | "ingestedAt"
    | "expiresAt"
    | "sourceType"
    | "framework"
    | "publicSourceLabel"
    | "consensusEligible"
    | "visibility"
    | "verificationEligibility"
    | "sourceStatus"
    | "publishGate"
    | "humanReviewStatus"
  >
): ResearchRecord {
  return {
    ...input,
    publishedAt: PUBLISHED_AT,
    sourcePublishedAt: null,
    sourcePublishedAtVerified: false,
    ingestedAt: INGESTED_AT,
    expiresAt: EXPIRES_AT,
    sourceType: "external-symbolic-analysis",
    framework: "oracle-six-yao",
    publicSourceLabel: lt("贵金属六爻分析师", "貴金屬六爻分析師", "Precious-metals Liu Yao analyst"),
    consensusEligible: false,
    visibility: "internal",
    verificationEligibility: "formal",
    sourceStatus: "raw_source_saved",
    publishGate: "approved",
    humanReviewStatus: "approved",
  };
}

export const teacher02Liuyao20260823Records: ResearchRecord[] = [
  common({
    id: "T02-GOLD-20260824-0828-V1",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-08-28",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "Gold"),
    symbol: "GOLD",
    sourceSymbol: "GLD",
    market: "commodity",
    internalSourceRef: "用户本地材料：03-六爻狼叔/0823；GLD周卦及2026-08-19更新截图",
    direction: "slightly-bullish",
    editorialConfidence: 72,
    layer: "tactical",
    horizon: lt("2026年8月24日至28日（纽约交易时段）", "2026年8月24日至28日（紐約交易時段）", "Aug 24–28, 2026 (New York trading hours)"),
    title: lt("GLD周初下杀、周中修复、周尾宽幅波动", "GLD週初下殺、週中修復、週尾寬幅波動", "GLD early washout, midweek repair, late volatility"),
    summary: lt(
      "最新的8月19日更新给出三段路径：周一至周二先震荡下杀，周二纽约时间约14:22前后观察低点与止跌；随后周三至周四修复走强；周四后段至周五进入高位宽幅波动并防回吐。该更新取代同材料中8月17日的旧版路径，但旧版仍保留作历史证据。",
      "最新的8月19日更新給出三段路徑：週一至週二先震盪下殺，週二紐約時間約14:22前後觀察低點與止跌；隨後週三至週四修復走強；週四後段至週五進入高位寬幅波動並防回吐。該更新取代同材料中8月17日的舊版路徑，但舊版仍保留作歷史證據。",
      "The Aug 19 update defines three phases: an early-week washout into a Tuesday New York-time turn watch near 14:22, a Wednesday–Thursday repair, then elevated late-week volatility and fade risk. The earlier Aug 17 path remains historical evidence."
    ),
    thesis: [
      lt("本卦风水涣、互卦山雷颐、变卦巽为风（六冲），三爻动。", "本卦風水渙、互卦山雷頤、變卦巽為風（六沖），三爻動。", "Primary: Huan; mutual: Yi; transformed: Xun (six clash); line 3 moves."),
      lt("六三‘涣其躬，无悔’用于解释先释放压力、再修复的周内顺序，不生成价格点位。", "六三‘渙其躬，無悔’用於解釋先釋放壓力、再修復的週內順序，不生成價格點位。", "Line 3 supports a pressure-release then repair sequence; it does not generate price levels."),
      lt("8月27日是路径切换观察日，修复后仍需防获利回吐。", "8月27日是路徑切換觀察日，修復後仍需防獲利回吐。", "Aug 27 is a path-transition watch; profit-taking risk remains after repair."),
    ],
    risks: [lt("转折时间允许半日至一个交易日偏差；方向和时间必须分开复盘。", "轉折時間允許半日至一個交易日偏差；方向和時間必須分開復盤。", "Turning time may vary by half to one trading session; direction and timing are scored separately.")],
    invalidation: lt("若周初不下杀且持续突破，早段洗盘路径失效；若低点后继续持续破低，周中修复分支失效。", "若週初不下殺且持續突破，早段洗盤路徑失效；若低點後繼續持續破低，週中修復分支失效。", "A sustained early breakout invalidates the washout path; continued new lows after the turn window invalidate the repair branch."),
    turningWindows: [
      { id: "gld-t02-low-0825", date: "2026-08-25", label: lt("纽约时间14:22附近低点/止跌观察", "紐約時間14:22附近低點/止跌觀察", "Low/turn watch near 14:22 New York time") },
      { id: "gld-t02-shift-0827", date: "2026-08-27", label: lt("修复转高波动观察", "修復轉高波動觀察", "Repair-to-volatility transition watch") },
    ],
    verificationChecklist: [
      lt("周一至周二是否先出现震荡下杀。", "週一至週二是否先出現震盪下殺。", "Did GLD wash out Monday–Tuesday?"),
      lt("周二低点后至周四是否出现修复。", "週二低點後至週四是否出現修復。", "Did GLD repair after Tuesday's low into Thursday?"),
      lt("周四后段至周五是否波动放大并出现回吐。", "週四後段至週五是否波動放大並出現回吐。", "Did volatility rise and gains fade late Thursday–Friday?"),
    ],
    status: "active",
    tags: ["gold", "gld", "source:teacher02", "policy:teacher02-liuyao", "gold-specialty", "forward-sample", "horizon:WEEK", "regime:US_WEEKLY", "source-timezone:America/New_York", "source-locked", "no-retroactive-edit", "no-auto-trade", "method-version:Rev3.2.9-h"],
  }),
  common({
    id: "T02-SILVER-20260824-0828-V1",
    forecastStart: "2026-08-24",
    forecastEnd: "2026-08-28",
    assetId: "silver",
    assetName: lt("国际银价", "國際銀價", "Silver"),
    symbol: "SILVER",
    sourceSymbol: "SLV",
    market: "commodity",
    internalSourceRef: "用户本地材料：03-六爻狼叔/0823；SLV周卦及2026-08-20更新截图",
    direction: "slightly-bullish",
    editorialConfidence: 70,
    layer: "tactical",
    horizon: lt("2026年8月24日至28日（纽约交易时段）", "2026年8月24日至28日（紐約交易時段）", "Aug 24–28, 2026 (New York trading hours)"),
    title: lt("SLV周初洗盘、周中修复、周尾回吐", "SLV週初洗盤、週中修復、週尾回吐", "SLV early washout, midweek repair, late fade"),
    summary: lt(
      "8月20日更新给出明确纽约时间三段：周一开盘至周二12:00先洗盘下探；周二12:00至周四12:00反弹修复，周三允许出现较强阳线；周四12:00至周五冲击压力但受约束，防获利回吐。白银与黄金周内顺序接近，但波动更大。",
      "8月20日更新給出明確紐約時間三段：週一開盤至週二12:00先洗盤下探；週二12:00至週四12:00反彈修復，週三允許出現較強陽線；週四12:00至週五衝擊壓力但受約束，防獲利回吐。白銀與黃金週內順序接近，但波動更大。",
      "The Aug 20 update defines three New York-time phases: washout into Tuesday noon, repair through Thursday noon, then a constrained resistance test and fade risk into Friday. Silver follows a similar order to gold with higher volatility."
    ),
    thesis: [
      lt("本卦天雷无妄（六冲）、互卦风山渐、变卦火雷噬嗑，五爻动。", "本卦天雷無妄（六沖）、互卦風山漸、變卦火雷噬嗑，五爻動。", "Primary: Wu Wang (six clash); mutual: Jian; transformed: Shi He; line 5 moves."),
      lt("九五‘无妄之疾，勿药有喜’用于解释洗盘后自行修复，不等于无条件追涨。", "九五‘無妄之疾，勿藥有喜’用於解釋洗盤後自行修復，不等於無條件追漲。", "Line 5 supports spontaneous repair after a washout, not unconditional chasing."),
      lt("周尾只视为冲击压力与回吐阶段，不定义为稳定主升。", "週尾只視為衝擊壓力與回吐階段，不定義為穩定主升。", "The late week is a resistance-test and fade phase, not a stable primary advance."),
    ],
    risks: [lt("六冲与白银高波动会放大上下两端；时间容差不能替错误方向找借口。", "六沖與白銀高波動會放大上下兩端；時間容差不能替錯誤方向找藉口。", "Six-clash and silver volatility amplify both directions; timing tolerance cannot excuse a wrong direction.")],
    invalidation: lt("若周初持续突破而没有洗盘，第一阶段失效；若周三后仍持续破低，修复阶段失效。", "若週初持續突破而沒有洗盤，第一階段失效；若週三後仍持續破低，修復階段失效。", "A sustained early breakout invalidates phase one; continued new lows after Wednesday invalidate the repair phase."),
    turningWindows: [
      { id: "slv-t02-low-0825", date: "2026-08-25", label: lt("纽约时间12:00阶段低点观察", "紐約時間12:00階段低點觀察", "Local-low watch at 12:00 New York time") },
      { id: "slv-t02-shift-0827", date: "2026-08-27", label: lt("纽约时间12:00修复转回吐观察", "紐約時間12:00修復轉回吐觀察", "Repair-to-fade watch at 12:00 New York time") },
    ],
    verificationChecklist: [
      lt("周一至周二中午是否先出现下探。", "週一至週二中午是否先出現下探。", "Did SLV dip into Tuesday noon?"),
      lt("周二中午至周四中午是否反弹修复。", "週二中午至週四中午是否反彈修復。", "Did SLV repair from Tuesday noon through Thursday noon?"),
      lt("周四中午后是否冲击压力并出现回吐。", "週四中午後是否衝擊壓力並出現回吐。", "Did SLV test resistance and fade after Thursday noon?"),
    ],
    status: "active",
    tags: ["silver", "slv", "source:teacher02", "policy:teacher02-liuyao", "silver-specialty", "forward-sample", "horizon:WEEK", "regime:US_WEEKLY", "source-timezone:America/New_York", "source-locked", "no-retroactive-edit", "no-auto-trade", "method-version:Rev3.2.9-h"],
  }),
];

export const TEACHER02_20260823_RECORD_IDS = teacher02Liuyao20260823Records.map((record) => record.id);
