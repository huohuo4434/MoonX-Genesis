import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

export const BTC_SEPTEMBER_WEEKLY_SOURCE_META_20260831 = Object.freeze([
  { forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", capturedAt: "2026-08-20T06:20:00+08:00", sourceFile: "BTC/8.31-9.6.jpg" },
  { forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-14", capturedAt: "2026-08-20T06:22:00+08:00", sourceFile: "BTC/9.7-9.14.jpg" },
  { forecastType: "WEEK_7", periodStart: "2026-09-15", periodEnd: "2026-09-21", capturedAt: "2026-08-20T06:27:00+08:00", sourceFile: "BTC/9.15-9.21.jpg" },
  { forecastType: "WEEK_8", periodStart: "2026-09-22", periodEnd: "2026-09-29", capturedAt: "2026-08-20T06:28:00+08:00", sourceFile: "BTC/9.22-9.29.jpg" },
] as const);

type MethodView = NonNullable<ConvictionPeriodForecast["methodViews"]>[number];

function methodViews(input: {
  primary: Pick<MethodView, "direction" | "summary">;
  rhythm: Pick<MethodView, "direction" | "summary">;
  strength: Pick<MethodView, "direction" | "summary">;
  image: Pick<MethodView, "direction" | "summary">;
}): NonNullable<ConvictionPeriodForecast["methodViews"]> {
  return [
    { id: "monthly-relations-primary", label: "月令六亲流派（主判）", weight: 40, ...input.primary },
    { id: "moving-line-rhythm", label: "动爻节奏流派（复核）", weight: 25, ...input.rhythm },
    { id: "use-god-strength", label: "用神强弱流派（复核）", weight: 20, ...input.strength },
    { id: "hexagram-image", label: "卦象取形流派（复核）", weight: 15, ...input.image },
  ];
}

const PUBLISHED_AT = "2026-08-31T07:35:00+08:00";

export const BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831: readonly ConvictionPeriodForecast[] = Object.freeze([
  {
    id: "BTC-W5-20260831-V1",
    assetId: "bitcoin",
    forecastType: "WEEK_5",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    direction: "先涨后跌",
    upProbability: 30,
    sidewaysProbability: 35,
    downProbability: 35,
    summary: "水火既济化水雷屯。既济先给已有平衡和短时承接，但兄弟亥水持世发动化官鬼辰土，资金分流最终转入风险线；屯又主起步受阻。本周按先有修复、后段承压处理，不把前段反弹当成趋势反转。",
    expectedPath: "周初延续既济平衡并尝试反弹 → 中段观察量价能否跟随 → 后段若承接不足，进入屯卦阻滞与回落；实际K线若始终不能上涨，直接按弱势提前兑现处理。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "反弹后出现30分钟或4H上攻衰减、重新跌回主要结构，确认由前段修复转入后段压力。",
    invalidationLevel: "若后半周持续放量上行并守住回踩，兄弟化官的压力没有兑现，本版先涨后跌失效。",
    riskLevel: "高",
    catalysts: ["既济前段平衡", "短线超跌修复"],
    risks: ["兄弟持世发动化官鬼", "妻财伏藏", "屯卦后段受阻"],
    consensusStars: 3,
    consensusLabel: "易老师综合取舍：主判、节奏与卦象都指向先修复后承压；用神强弱流派更偏全周弱势，因此维持先涨后跌，但下跌可能提前出现。",
    methodViews: methodViews({
      primary: { direction: "先涨后跌", summary: "兄弟亥水持世发动化官鬼辰土，价格资金由分流转为风险；既济只保留前段承接，主线偏前稳后压。" },
      rhythm: { direction: "先涨后跌", summary: "动爻在三爻交接位，前段先走既济余势，中后段再进入屯的阻滞，节奏不是直线下跌。" },
      strength: { direction: "震荡下跌", summary: "妻财午火伏于兄弟亥水之下，财源不显且兄弟持世，反弹持续性偏弱，压力可能早于预期兑现。" },
      image: { direction: "先涨后跌", summary: "既济为阶段完成，屯为重新起步受阻；从已成转入难行，形态更像先稳后退。" },
    }),
    ichingEvidence: {
      primaryHexagram: "水火既济",
      changingHexagram: "水雷屯",
      notes: "原盘起卦于2026-08-20 06:20，问题为BTC 8月31日至9月6日走势。妻财午火伏于兄弟亥水之下，兄弟亥水持世发动化官鬼辰土；本记录于8月31日首次锁定，不回填此前页面。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W6-20260907-V1",
    assetId: "bitcoin",
    forecastType: "WEEK_6",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-14",
    direction: "先涨后跌",
    upProbability: 34,
    sidewaysProbability: 36,
    downProbability: 30,
    summary: "山雷颐（游魂）化山水蒙。妻财戌土持世，兄弟寅木发动化妻财辰土，前中段仍有价格修复；但游魂本就反复，父母子水发动后化兄弟寅木，最终又回到分流与不确定。主判为先涨后跌，且高位确认比追涨更重要。",
    expectedPath: "前段先看财持世与兄弟化财带来的修复 → 中段容易冲高并放大分歧 → 后段转入蒙卦不明与回吐；若该涨窗口不涨，后段压力按更弱情形处理。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "冲高后不能继续扩张，30分钟或4H形成更低高点并跌回中枢，确认由修复转入回落。",
    invalidationLevel: "若回踩持续守稳并放量突破上方结构，游魂化蒙的回吐没有兑现，本版失效。",
    riskLevel: "高",
    catalysts: ["妻财戌土持世", "兄弟寅木化妻财辰土", "月度高点窗口交叉观察"],
    risks: ["颐卦游魂", "父母化兄弟", "蒙卦方向不明与追高风险"],
    consensusStars: 3,
    consensusLabel: "易老师综合取舍：三路偏先涨后跌，用神强弱流派因财持世、兄弟化财而保留震荡上涨可能；正式方向仍以主判为先涨后跌。",
    methodViews: methodViews({
      primary: { direction: "先涨后跌", summary: "妻财戌土持世先给价格承接，但父母子水动化兄弟寅木，后段资金重新分流，主线偏前扬后退。" },
      rhythm: { direction: "先涨后跌", summary: "动爻集中在下部，前中段先完成兄弟化财的修复，随后游魂转蒙，后段进入不明与回吐。" },
      strength: { direction: "震荡上涨", summary: "财爻持世且兄弟寅木化妻财辰土，用神并不弱；若真实K线回踩不破，仍可能走成震荡上涨。" },
      image: { direction: "先涨后跌", summary: "颐游魂主反复取养，变蒙主信息不清；形态适合冲高后谨慎，不支持高位持续追涨。" },
    }),
    ichingEvidence: {
      primaryHexagram: "山雷颐（游魂）",
      changingHexagram: "山水蒙",
      notes: "原盘起卦于2026-08-20 06:22，问题为BTC 9月7日至9月14日走势。妻财戌土持世；兄弟寅木发动化妻财辰土，父母子水发动化兄弟寅木。月度高点只作上级周期交叉观察，不冒充本周卦点名日期。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W7-20260915-V1",
    assetId: "bitcoin",
    forecastType: "WEEK_7",
    periodStart: "2026-09-15",
    periodEnd: "2026-09-21",
    direction: "震荡下跌",
    upProbability: 20,
    sidewaysProbability: 35,
    downProbability: 45,
    summary: "兑为泽六冲静卦。卦虽不动，但六冲天然放大反复；酉月兄弟酉金得令，妻财卯木受冲且月破，资金分流强于价格承接。四个流派一致偏震荡下跌，重点防反弹无力后的再度破位。",
    expectedPath: "先以六冲方式反复拉扯 → 反弹若量能不足，兄弟旺而财弱的结构继续压制 → 后段防扩大下跌；盘中急拉只作震荡，不自动改成看涨。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "反弹不能收回主要中枢并形成更低高点，随后跌破前低，确认震荡下跌延续。",
    invalidationLevel: "若放量收回主要中枢且回踩确认，妻财月破的弱势没有兑现，本版失效。",
    riskLevel: "高",
    catalysts: ["超跌反抽", "六冲带来的双向波动"],
    risks: ["兑为泽六冲", "兄弟酉金月旺", "妻财卯木受冲月破"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派同向偏弱；六冲意味着过程会反复，不等于每天直线下跌，但正式方向为震荡下跌。",
    methodViews: methodViews({
      primary: { direction: "震荡下跌", summary: "酉月兄弟酉金得令，妻财卯木被冲且月破，资金分流压过价格用神，主判偏弱。" },
      rhythm: { direction: "震荡下跌", summary: "静卦没有单一动爻排出先后，六冲负责制造来回，方向由财弱兄旺确定为震荡下跌。" },
      strength: { direction: "震荡下跌", summary: "妻财卯木在酉月直接受冲，用神失令；即使出现反抽，也需真实结构证明财爻恢复。" },
      image: { direction: "震荡下跌", summary: "兑为泽六冲主快速反复和共识松动，结合财弱更像反弹后继续下探。" },
    }),
    ichingEvidence: {
      primaryHexagram: "兑为泽（六冲）",
      notes: "原盘起卦于2026-08-20 06:27，问题为BTC 9月15日至9月21日走势，为静卦。父母未土持世，兄弟酉金、子孙亥水、妻财卯木、官鬼巳火均据图片可见信息录入。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W8-20260922-V1",
    assetId: "bitcoin",
    forecastType: "WEEK_8",
    periodStart: "2026-09-22",
    periodEnd: "2026-09-29",
    direction: "先跌后涨",
    upProbability: 36,
    sidewaysProbability: 36,
    downProbability: 28,
    summary: "火雷噬嗑化火风鼎。噬嗑先处理阻碍，妻财辰土发动化官鬼酉金，前段价格仍承压；但父母子水发动化妻财丑土，变鼎又主重整与重新建立结构，后段具备修复条件。正式方向为先跌后涨，反弹必须等风险释放和技术止跌。",
    expectedPath: "前段继续处理噬嗑阻碍并可能下探 → 中段观察财化官压力是否释放完毕 → 后段父母化财、鼎卦重整后尝试修复；没有止跌结构时不提前抄底。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "下探停止扩张，30分钟与4H重新站回中枢并形成更高低点后，确认由前段压力转入后段修复。",
    invalidationLevel: "若后段继续破低且反弹不能收回中枢，父母化财与鼎卦重整没有兑现，本版失效。",
    riskLevel: "高",
    catalysts: ["父母子水化妻财丑土", "鼎卦重整", "月底风险释放后的修复"],
    risks: ["妻财辰土化官鬼酉金", "多爻发动导致路径反复", "反弹确认不足"],
    consensusStars: 3,
    consensusLabel: "易老师综合取舍：主判、节奏和卦象偏先跌后涨；用神强弱流派认为财化官与父化财相互抵消，更偏震荡，因此修复结论必须等技术确认。",
    methodViews: methodViews({
      primary: { direction: "先跌后涨", summary: "妻财辰土先化官鬼酉金，前段价格转入风险；父母子水又化妻财丑土，风险释放后价格机会重新出现。" },
      rhythm: { direction: "先跌后涨", summary: "下三爻连续发动，变化先在前段快速释放；由噬嗑处理阻碍再转鼎重整，后段才具备修复条件。" },
      strength: { direction: "震荡", summary: "财化官与父化财同时存在，价格用神一损一补；若没有K线止跌，单凭变卦不能提前确认上涨。" },
      image: { direction: "先跌后涨", summary: "噬嗑先破障，鼎后立新；卦象顺序清楚指向先处理下行压力，再重建结构。" },
    }),
    ichingEvidence: {
      primaryHexagram: "火雷噬嗑",
      changingHexagram: "火风鼎",
      notes: "原盘起卦于2026-08-20 06:28，问题为BTC 9月22日至9月29日走势。妻财未土持世；妻财辰土化官鬼酉金，兄弟寅木化父母亥水，父母子水化妻财丑土。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
]);

export function listBtcSeptemberWeeklyForecasts20260831() {
  return [...BTC_SEPTEMBER_WEEKLY_FORECASTS_20260831];
}
