import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

export type TSLAResearchAssetId = "tsla";

export const TSLA_RESEARCH_COMPLETENESS_20260816 = {
  formalPeriodCount: 11,
  corroborationCount: 0,
  requiresDailyHexagram: false,
  dailyAnalysisSourceZh: "当前有效周卦/阶段卦拆解 + 缠论与技术结构验算",
  completenessRuleZh: "已经提供并锁定的周卦、月度/阶段卦和年底/长期卦构成完整研究；没有日卦不属于资料缺失。",
} as const;

export function isTSLAResearchAssetId(value: string): value is TSLAResearchAssetId {
  return value === "tsla";
}

// Storage keys reuse the existing ConvictionForecastType vocabulary.
// Member-facing labels below are the actual locked research windows.
export const TSLA_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "MONTH_1",
  "MONTH_3",
  "TODAY",
  "YEAR_1",
  "YEAR_3",
  "YEAR_5",
  "YEAR_10",
];
export const TSLA_VISIBLE_PERIOD_ORDER = TSLA_PERIOD_ORDER;

const LABELS: Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }> = {
  ...ASTEROID_PERIOD_LABELS,
  TODAY: { zh: "9/28–10/4", en: "Sep 28–Oct 4", emptyZh: "9/28–10/4研究尚未发布" },
  TOMORROW: { zh: "备用周期", en: "Reserved", emptyZh: "该周期研究尚未发布" },
  WEEK: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23研究尚未发布" },
  WEEK_2: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "8/24–30研究尚未发布" },
  WEEK_3: { zh: "8/31–9/6", en: "Aug 31–Sep 6", emptyZh: "8/31–9/6研究尚未发布" },
  WEEK_4: { zh: "9/7–13", en: "Sep 7–13", emptyZh: "9/7–13研究尚未发布" },
  MONTH_1: { zh: "9/14–20", en: "Sep 14–20", emptyZh: "9/14–20研究尚未发布" },
  MONTH_3: { zh: "9/21–27", en: "Sep 21–27", emptyZh: "9/21–27研究尚未发布" },
  YEAR_1: { zh: "8/17–10/4", en: "Aug 17–Oct 4", emptyZh: "8/17–10/4研究尚未发布" },
  YEAR_3: { zh: "8/17–12/31", en: "Aug 17–Dec 31", emptyZh: "8/17–12/31研究尚未发布" },
  YEAR_5: { zh: "2027年", en: "2027", emptyZh: "2027年度研究尚未发布" },
  YEAR_10: { zh: "至2029年8月", en: "Through Aug 2029", emptyZh: "未来三年研究尚未发布" },
};

export function tslaPeriodLabel20260816(type: ConvictionForecastType) {
  return LABELS[type];
}

const PUBLISHED_AT = "2026-08-16T11:40:00+08:00";

function publish(
  input: Omit<ConvictionPeriodForecast,
    "supportLevels" | "resistanceLevels" | "riskLevel" | "sourceType" |
    "publishedAt" | "lockedAt" | "validationStatus" | "status" | "version">,
): ConvictionPeriodForecast {
  return {
    ...input,
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

const CALENDAR = "原图统一显示：丙午年、丙申月、壬戌日、乙巳时（日空子丑）。";
const NO_EXACT_LEVELS = "原附件未给出可锁定的具体价格支撑/压力；万里老师只提出回踩10日线或20日线后再用小仓测试，因此本档案不编造固定价位。";

export const TSLA_LIUYAO_FORECASTS_20260816: ConvictionPeriodForecast[] = [
  publish({
    id: "TSLA-W1-20260817-V1",
    assetId: "tsla",
    forecastType: "WEEK",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "震荡",
    upProbability: 28,
    sidewaysProbability: 47,
    downProbability: 25,
    summary:
      "老师01按财爻优先看：妻财午火伏在世爻兄弟亥水之下，申月金旺又生兄弟水，财爻不显而竞争/分歧力量更强；全卦安静，没有主动突破动能。老师02看水火既济静卦，属于阶段已成但盛中需谨慎，短线更像修复和整理，而不是新的直线主升。",
    expectedPath:
      "本周允许出现反弹和止跌修复，但更可能围绕原区间反复，先观察承接是否稳定。方向没有转成明显看空，但不追盘中急拉；技术层只等回踩止稳或右侧结构确认。",
    catalysts: ["既济后的秩序修复", "下跌动能减弱", "消息面可能维持关注"],
    risks: ["财爻伏藏", "世兄弟得申金生", "静卦突破动力不足"],
    consensusStars: 3,
    consensusLabel: "两位老师都不支持把本周定义成直接主升，正式结论是震荡修复",
    methodViews: [
      { id: "tsla-w1-t01", label: "老师01·财爻优先/六亲旺衰", direction: "震荡", weight: 65, summary: "财午火伏藏，世兄弟亥水在申月得生，资金端有分歧，先看承接而不是追涨。" },
      { id: "tsla-w1-t02", label: "老师02·既济静卦路径", direction: "震荡", weight: 35, summary: "既济为事成后守成，静卦强调谨慎和整理，不能把一次反弹当成主升。" },
    ],
    ichingEvidence: {
      primaryHexagram: "水火既济",
      changingHexagram: null,
      notes: `原卦题：美股特斯拉，8月17号到23号走势情况。起卦时间2026-08-16 09:02；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W2-20260824-V1",
    assetId: "tsla",
    forecastType: "WEEK_2",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "震荡上涨",
    upProbability: 52,
    sidewaysProbability: 31,
    downProbability: 17,
    summary:
      "老师01看卦中妻财酉金、妻财申金明现，目标阶段又处申月，财爻得令，价格端较前一周明显改善；子孙辰土亦可生财。老师02看火山旅六合，六合给出向上靠拢和承接，但旅卦决定资金仍会快速流动，过程不会稳定直线。",
    expectedPath:
      "8月底是第一段较清楚的偏多窗口，主路径为震荡抬高而非连续逼空。若先急拉，仍等回踩；若前一周已完成充分整理，本周更容易出现向上释放。",
    catalysts: ["申月财爻得令", "两重财金明现", "六合改善承接"],
    risks: ["旅卦漂移", "冲高后快速换手", "追涨风险"],
    consensusStars: 4,
    consensusLabel: "两位老师共同偏多，但旅卦要求以回踩买点代替追高",
    methodViews: [
      { id: "tsla-w2-t01", label: "老师01·财爻得令", direction: "震荡上涨", weight: 65, summary: "妻财酉金、申金在申月有力，子孙土亦能生财，价格端较前周改善。" },
      { id: "tsla-w2-t02", label: "老师02·旅卦六合", direction: "震荡上涨", weight: 35, summary: "六合偏向聚合，旅卦则保留漂移和反复，方向偏上但不适合追高。" },
    ],
    ichingEvidence: {
      primaryHexagram: "火山旅（六合）",
      changingHexagram: null,
      notes: `原卦题：美股特斯拉，8月24号到30号走势情况。起卦时间2026-08-16 09:03；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W3-20260831-V1",
    assetId: "tsla",
    forecastType: "WEEK_3",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    direction: "震荡下跌",
    upProbability: 20,
    sidewaysProbability: 38,
    downProbability: 42,
    summary:
      "老师01看妻财寅木由动爻化出，但寅木在申月受冲，财爻得到的上行动力不稳；另一财卯木同样受到金旺环境压制。老师02看地山谦变山风蛊（归魂），谦要求降低斜率，蛊对应清理旧结构，归魂又放大回到原区间的反复。",
    expectedPath:
      "如果8月底已经上行，本周更容易回吐和洗盘，主任务是修复结构而不是继续拔高。回撤不自动等于中期转空，但本周不适合在反弹末端追仓。",
    catalysts: ["谦卦降低斜率", "回踩清理浮筹", "为后续周期重新蓄势"],
    risks: ["财寅木受申冲", "蛊卦修理旧问题", "归魂反复"],
    consensusStars: 3,
    consensusLabel: "两位老师共同指向9月第一周的回踩整理",
    methodViews: [
      { id: "tsla-w3-t01", label: "老师01·财爻受冲", direction: "震荡下跌", weight: 65, summary: "财寅木虽化出但受申月冲，价格端更像上涨后的回吐和重新承接。" },
      { id: "tsla-w3-t02", label: "老师02·谦→蛊归魂", direction: "震荡下跌", weight: 35, summary: "谦主降速，蛊主修理，归魂主反复，路径偏回踩整理。" },
    ],
    ichingEvidence: {
      primaryHexagram: "地山谦",
      changingHexagram: "山风蛊（归魂）",
      notes: `原卦题：美股特斯拉，8月31号到9月6号走势情况。起卦时间2026-08-16 09:05；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W4-20260907-V1",
    assetId: "tsla",
    forecastType: "WEEK_4",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    direction: "先涨后跌",
    upProbability: 26,
    sidewaysProbability: 31,
    downProbability: 43,
    summary:
      "老师01看世爻兄弟申金在金旺阶段力量较强，妻财卯木仍属伏藏，资金争夺大于财爻扩张。老师02看泽山咸变天山遯，咸允许先有情绪响应或反弹，遯则明确指向随后退守。",
    expectedPath:
      "更可能先出现修复性反弹，再由资金主动退守；即使盘中走强，也要防反弹之后重新承压。此段仍属于9月上旬的风险释放，而不是追涨窗口。",
    catalysts: ["咸卦带来短线响应", "前周回踩后的技术反抽"],
    risks: ["世兄弟申金偏强", "财卯木伏藏", "遯卦主动退守"],
    consensusStars: 4,
    consensusLabel: "两位老师对先反弹、后退守的路径形成较强共识",
    methodViews: [
      { id: "tsla-w4-t01", label: "老师01·兄弟强/财伏", direction: "先涨后跌", weight: 65, summary: "兄弟申金强而财卯木伏藏，反弹后的兑现和退守压力更值得防范。" },
      { id: "tsla-w4-t02", label: "老师02·咸→遯", direction: "先涨后跌", weight: 35, summary: "咸主感应与反弹，遯主撤退，路径是先响应后退守。" },
    ],
    ichingEvidence: {
      primaryHexagram: "泽山咸",
      changingHexagram: "天山遯",
      notes: `原卦题：美股特斯拉，9月7号到13号走势情况。起卦时间2026-08-16 09:06；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W5-20260914-V1",
    assetId: "tsla",
    forecastType: "MONTH_1",
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    direction: "探底回升",
    upProbability: 42,
    sidewaysProbability: 40,
    downProbability: 18,
    summary:
      "老师01看世爻妻财未土明现，另有妻财辰土，价格端仍有承接基础；但全卦安静，突破速度不会很快。老师02看火雷噬嗑静卦，核心是咬开阻碍、清除障碍，更像底部打磨和逐步修复。",
    expectedPath:
      "9月中旬先完成止跌和结构修复，再逐渐转强。它是后续强势周的准备段，不适合把第一根反弹K线直接理解成主升确认。",
    catalysts: ["世财未土明现", "财辰土提供承接", "噬嗑清除阻碍"],
    risks: ["静卦节奏偏慢", "阻力需要逐步消化", "过早追涨"],
    consensusStars: 3,
    consensusLabel: "两位老师共同指向止跌打磨，随后才有转强条件",
    methodViews: [
      { id: "tsla-w5-t01", label: "老师01·世财承接", direction: "探底回升", weight: 65, summary: "世财未土和财辰土给出承接，短线先稳后修复。" },
      { id: "tsla-w5-t02", label: "老师02·噬嗑静卦", direction: "探底回升", weight: 35, summary: "噬嗑主清障，静卦主慢，先打磨底部再逐步转强。" },
    ],
    ichingEvidence: {
      primaryHexagram: "火雷噬嗑",
      changingHexagram: null,
      notes: `原卦题：美股特斯拉，9月14号到20号走势情况。起卦时间2026-08-16 09:07；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W6-20260921-V1",
    assetId: "tsla",
    forecastType: "MONTH_3",
    periodStart: "2026-09-21",
    periodEnd: "2026-09-27",
    direction: "上涨",
    upProbability: 65,
    sidewaysProbability: 22,
    downProbability: 13,
    summary:
      "老师01看妻财亥水临应，进入酉月后金旺生水，财爻获得更直接的生扶。老师02看地泽临变地天泰（六合），临为机会靠近，泰为上下通达，六合进一步强化聚合与稳定。",
    expectedPath:
      "这是整组分周卦里最清楚的转强窗口。若9月上旬至中旬已经完成回踩，并在技术上出现底部确认，本周更容易从修复切换为主动上攻。",
    catalysts: ["酉月金生财水", "临卦机会靠近", "泰卦通达", "六合聚合"],
    risks: ["前段洗盘若未完成则启动延后", "急拉后的短线回吐"],
    consensusStars: 5,
    consensusLabel: "两位老师对9月21–27日的明显转强形成最强共识",
    methodViews: [
      { id: "tsla-w6-t01", label: "老师01·财亥水得生", direction: "上涨", weight: 65, summary: "财亥水临应并得酉金生扶，价格端进入更有利阶段。" },
      { id: "tsla-w6-t02", label: "老师02·临→泰六合", direction: "上涨", weight: 35, summary: "临主机会靠近，泰主通达，六合强化持续性，路径明显偏上。" },
    ],
    ichingEvidence: {
      primaryHexagram: "地泽临",
      changingHexagram: "地天泰（六合）",
      notes: `原卦题：美股特斯拉，9月21号到27号走势情况。起卦时间2026-08-16 09:08；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-W7-20260928-V1",
    assetId: "tsla",
    forecastType: "TODAY",
    periodStart: "2026-09-28",
    periodEnd: "2026-10-04",
    direction: "震荡上涨",
    upProbability: 58,
    sidewaysProbability: 27,
    downProbability: 15,
    summary:
      "老师01看两重妻财酉金明现，且目标阶段仍处酉月，财爻得令，价格端具备继续重估的条件。老师02看火风鼎静卦，鼎为革故鼎新、重新定价，但静卦说明上行更偏延续和结构升级，不宜把加速末端当新起点。",
    expectedPath:
      "大概率延续9月下旬的强势并震荡抬高；若前一周已经快速拉升，本周后段要开始防高位兑现。持有者可跟随，空仓者避免在加速尾端追入。",
    catalysts: ["两重财酉金", "酉月财爻得令", "鼎卦重估"],
    risks: ["静卦延续而非无限加速", "高位兑现", "追涨盈亏比下降"],
    consensusStars: 4,
    consensusLabel: "两位老师共同看多，但更适合持有和回踩跟随，不适合追加速",
    methodViews: [
      { id: "tsla-w7-t01", label: "老师01·两重财金得令", direction: "震荡上涨", weight: 65, summary: "两重妻财酉金处酉月，价格端仍有上行与重估动力。" },
      { id: "tsla-w7-t02", label: "老师02·鼎卦重构", direction: "震荡上涨", weight: 35, summary: "鼎卦支持革新和重估，静卦则要求防止把后段加速当成无风险起点。" },
    ],
    ichingEvidence: {
      primaryHexagram: "火风鼎",
      changingHexagram: null,
      notes: `原卦题：美股特斯拉，9月28号到10月4号走势情况。起卦时间2026-08-16 09:10；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-7W-20260817-V1",
    assetId: "tsla",
    forecastType: "YEAR_1",
    periodStart: "2026-08-17",
    periodEnd: "2026-10-04",
    direction: "先跌后涨",
    upProbability: 57,
    sidewaysProbability: 24,
    downProbability: 19,
    summary:
      "老师01看财午火仍在，但兄弟亥水发动并化官鬼辰土，说明前段竞争与风险释放较强；后续分周财爻在酉月得到更有利条件。老师02看雷火丰变震为雷（六冲），丰代表能量充足，震六冲则放大波动和阶段切换，主路径不是直线，而是前段震荡洗盘、后段向上释放。",
    expectedPath:
      "锁定路线：8月17–23日震荡修复 → 8月24–30日偏多 → 8月底至9月上旬回踩 → 9月14–20日止跌打磨 → 9月21日至10月4日明显转强。",
    catalysts: ["后段酉月财爻改善", "丰卦能量释放", "分周卦后半程同向"],
    risks: ["兄弟发动化官鬼", "震为雷六冲", "消息驱动的急涨急跌"],
    consensusStars: 4,
    consensusLabel: "两位老师对前弱后强形成共识，最强窗口集中在9月中下旬",
    methodViews: [
      { id: "tsla-7w-t01", label: "老师01·前段风险/后段财旺", direction: "先跌后涨", weight: 65, summary: "前段兄弟与官鬼压力较强，后段随月令切换和财爻改善而明显转强。" },
      { id: "tsla-7w-t02", label: "老师02·丰→震六冲", direction: "先跌后涨", weight: 35, summary: "丰有释放空间，震六冲先制造洗盘和变盘，随后才体现向上弹性。" },
    ],
    ichingEvidence: {
      primaryHexagram: "雷火丰",
      changingHexagram: "震为雷（六冲）",
      notes: `原卦题：美股特斯拉，8月17至10月4走势情况。起卦时间2026-08-16 09:11；${CALENDAR} ${NO_EXACT_LEVELS}`,
    },
  }),

  publish({
    id: "TSLA-YE-20260817-V1",
    assetId: "tsla",
    forecastType: "YEAR_3",
    periodStart: "2026-08-17",
    periodEnd: "2026-12-31",
    direction: "先涨后跌",
    upProbability: 35,
    sidewaysProbability: 20,
    downProbability: 45,
    summary:
      "老师01最关键的证据是妻财申金发动后化官鬼子水，价格/资金爻最终转成风险爻；世爻兄弟午火亦发动，代表后段兑现和竞争加剧。老师02看天水讼（游魂）变山地剥，讼为长期分歧与拉扯，剥为涨幅或估值逐层回吐，因此年底大周期不能按持续主升理解。",
    expectedPath:
      "中期允许先把9月中下旬至10月初的上升段走出来，但上行越充分，后续越要防逐步转弱。到年底的正式路线为先涨后跌，适合在高位分批锁定收益，而不是一路不动。",
    catalysts: ["9月下旬分周强共识", "前段仍有重估空间"],
    risks: ["财申金化官鬼子水", "世兄弟发动", "讼→剥的年底回吐"],
    consensusStars: 5,
    consensusLabel: "两位老师对年底前先涨、后转弱形成最强风险共识",
    methodViews: [
      { id: "tsla-ye-t01", label: "老师01·财化官鬼", direction: "先涨后跌", weight: 70, summary: "财申金最终化官鬼子水，后段价格端转为风险端，不能把前段上涨外推到年底。" },
      { id: "tsla-ye-t02", label: "老师02·讼→剥", direction: "先涨后跌", weight: 30, summary: "讼主分歧，剥主逐层回吐，年底更需防估值和涨幅被削减。" },
    ],
    ichingEvidence: {
      primaryHexagram: "天水讼（游魂）",
      changingHexagram: "山地剥",
      notes: `原卦题：美股特斯拉，8月17至12月31号走势情况。起卦时间2026-08-16 09:12；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-2027-20260816-V1",
    assetId: "tsla",
    forecastType: "YEAR_5",
    periodStart: "2027-01-01",
    periodEnd: "2027-12-31",
    direction: "震荡上涨",
    upProbability: 62,
    sidewaysProbability: 25,
    downProbability: 13,
    summary:
      "老师01看主卦世爻妻财未土，上爻亦见妻财戌土，子孙巳火发动化妻财辰土，变卦世爻再次落财，属于子孙生财、化财且财爻多现。老师02看雷地豫（六合）变雷水解，豫代表预期和扩张，解代表压力解除，整体是先释放约束、后恢复上行。",
    expectedPath:
      "2027年整体偏多，允许阶段震荡，但大方向是压力解除后的扩张和抬升。豫卦仍有乐中存戒，不能理解成全年无回撤。",
    catalysts: ["世财未土", "子孙巳火化财辰土", "豫六合", "解卦释放压力"],
    risks: ["阶段性过热", "高波动", "乐中存戒"],
    consensusStars: 5,
    consensusLabel: "两位老师对2027年压力解除、震荡上行形成最强共识",
    methodViews: [
      { id: "tsla-2027-t01", label: "老师01·子孙生财/化财", direction: "震荡上涨", weight: 70, summary: "财爻多现，子孙发动化财，且变卦世爻落财，2027年价格端占优。" },
      { id: "tsla-2027-t02", label: "老师02·豫→解", direction: "震荡上涨", weight: 30, summary: "豫主扩张，解主解除压力，路径偏向先解压后抬升。" },
    ],
    ichingEvidence: {
      primaryHexagram: "雷地豫（六合）",
      changingHexagram: "雷水解",
      notes: `原卦题：美股特斯拉，2027年走势情况。起卦时间2026-08-16 09:14；${CALENDAR}`,
    },
  }),

  publish({
    id: "TSLA-3Y-20260816-V1",
    assetId: "tsla",
    forecastType: "YEAR_10",
    periodStart: "2026-08-16",
    periodEnd: "2029-08-31",
    direction: "震荡上涨",
    upProbability: 55,
    sidewaysProbability: 30,
    downProbability: 15,
    summary:
      "老师01看主卦和变卦均保留两重妻财酉金/申金，长期价格端没有被破坏；官鬼亥水发动后化兄弟午火，说明中途仍会经历竞争、估值压缩或大幅回撤。老师02看火风鼎变火山旅（六合），鼎是长期重构与重新定价，旅则说明上升过程不会安稳直线，六合保留回撤后的再聚合能力。",
    expectedPath:
      "未来三年总方向为宽幅震荡上行，中间至少包含一次大级别回撤和重新换手。该大卦不覆盖细周期风险；2028年的人物周期风险仍需单独验证，不能用三年偏多结论否定。",
    catalysts: ["长期财金多现", "鼎卦重构", "六合回撤后再聚合"],
    risks: ["官鬼发动化兄弟", "旅卦漂移", "中途大级别回撤", "2028独立周期风险"],
    consensusStars: 4,
    consensusLabel: "两位老师共同看长期重估，但明确保留中途大回撤",
    methodViews: [
      { id: "tsla-3y-t01", label: "老师01·长期财爻保留", direction: "震荡上涨", weight: 65, summary: "主变卦财爻仍在，长期价格端偏上；官鬼化兄弟警示中途深度换手。" },
      { id: "tsla-3y-t02", label: "老师02·鼎→旅六合", direction: "震荡上涨", weight: 35, summary: "鼎支持重构与上行，旅使过程反复，六合允许回撤后重新聚合。" },
    ],
    ichingEvidence: {
      primaryHexagram: "火风鼎",
      changingHexagram: "火山旅（六合）",
      notes: `原卦题：美股特斯拉，现在到2029年8月，未来这3年走势情况。起卦时间2026-08-16 09:15；${CALENDAR} 外部旁证：万里老师以震为雷→地雷复判断8月底前大震荡中偏上，提醒不追高，并仅将子/午/未日作为波动窗口；该旁证不覆盖MOOX锁定分周方向。`,
    },
  }),
];

function tslaPrevious(id: string): ConvictionPeriodForecast {
  const record = TSLA_LIUYAO_FORECASTS_20260816.find((item) => item.id === id);
  if (!record) throw new Error(`Missing locked TSLA forecast ${id}`);
  return record;
}

const tslaWeek2V1 = tslaPrevious("TSLA-W2-20260824-V1");
const tslaWeek3V1 = tslaPrevious("TSLA-W3-20260831-V1");

/** Newer specialist monthly path; V1 rows remain immutable above. */
export const TSLA_LIUYAO_REVISIONS_20260824: ConvictionPeriodForecast[] = [
  {
    ...tslaWeek2V1,
    id: "TSLA-W2-20260824-V2",
    direction: "先涨后跌",
    upProbability: 34,
    sidewaysProbability: 30,
    downProbability: 36,
    summary:
      "最新专项月卦把8月25日上午列为主要高点候选，并把8月27日下午至9月1日列为连续承压段。由于老师专项来源优先于旧自算周卦，本周由原来的震荡上涨修订为先涨后跌；候选日期必须由真实价格结构确认。",
    expectedPath:
      "8月24日至25日先冲高并观察主要高点 → 26日高位换手 → 27日下午起逐步承压 → 28日延续回落；29日至30日美股休市，不制造日卦。",
    catalysts: ["周初惯性冲高", "高点形成前的情绪集中"],
    risks: ["8月25日主要高点候选", "27日下午后持续承压", "月卦候选需周卦和K线交叉"],
    consensusStars: 3,
    consensusLabel: "专项月卦与旧自算周卦发生分歧，老师来源优先，因此降置信并修订方向",
    methodViews: [
      {
        id: "tsla-w2-specialist-monthly",
        label: "专项月卦修正",
        direction: "先涨后跌",
        weight: 70,
        summary: "周初先冲高，25日上午为主要高点候选，27日下午以后压力持续到9月初。",
      },
      {
        id: "tsla-w2-original-weekly",
        label: "原周卦对照",
        direction: "震荡上涨",
        weight: 30,
        summary: "旧周卦财爻得令而偏多；与更新更晚的专项月卦冲突，保留为分歧票而不删除。",
      },
    ],
    keyDates: [
      { date: "2026-08-25", type: "阶段高点", label: "主要高点候选", source: "LIUYAO", confidence: 66, note: "原始来源为北美证券路径；允许半日至一个交易日误差，必须由K线确认。" },
      { date: "2026-08-27", type: "下跌风险", label: "下午后连续承压观察", source: "LIUYAO", confidence: 68, note: "只锁定风险窗口，不生成固定卖出价格。" },
    ],
    ichingEvidence: {
      primaryHexagram: "艮为山（六冲）",
      changingHexagram: "风山渐（归魂）",
      notes: "0824专项月卦更新；第五爻动。月卦路径优先于旧自算周卦，但完整周卦仍负责后续验收。",
    },
    rollingUpdate: {
      asOf: "2026-08-24",
      label: "目标周事前修订",
      summary: "收到更新更晚的专项月卦后，将本周从震荡上涨改为先涨后跌，并保留原V1作为分歧样本。",
      originalLockedView: `${tslaWeek2V1.direction}｜${tslaWeek2V1.expectedPath}`,
      timingTolerance: "高低点候选允许半日至一个交易日误差；方向单独验收。",
    },
    version: 2,
    publishedAt: "2026-08-24T12:25:00+08:00",
    lockedAt: "2026-08-24T12:25:00+08:00",
  },
  {
    ...tslaWeek3V1,
    id: "TSLA-W3-20260831-V2",
    direction: "先跌后涨",
    upProbability: 36,
    sidewaysProbability: 34,
    downProbability: 30,
    summary:
      "专项月卦把8月31日至9月1日列为前段寻底，把9月1日至3日列为修复；9月4日仍有冲高后再受压的尾部风险。周方向因此由旧版震荡下跌修订为先跌后涨，但不把三天修复扩大成新的长期主升。",
    expectedPath:
      "8月31日至9月1日先承压寻底 → 9月1日至3日反弹修复 → 9月4日允许冲高但防再次回落 → 9月5日至6日休市消化。",
    catalysts: ["前段风险释放", "9月1日至3日修复窗口"],
    risks: ["9月4日冲高回落", "归魂反复", "月卦高低点候选尚待周卦确认"],
    consensusStars: 3,
    consensusLabel: "专项月卦修正了旧周卦的整周偏弱结论，正式路径改为先跌后涨并保留周尾风险",
    methodViews: [
      {
        id: "tsla-w3-specialist-monthly",
        label: "专项月卦修正",
        direction: "先跌后涨",
        weight: 70,
        summary: "8月31日至9月1日寻底，9月1日至3日修复，9月4日再防冲高受压。",
      },
      {
        id: "tsla-w3-original-weekly",
        label: "原周卦对照",
        direction: "震荡下跌",
        weight: 30,
        summary: "旧周卦谦变蛊归魂指向回踩；保留其风险意义，但不再覆盖更新后的阶段顺序。",
      },
    ],
    keyDates: [
      { date: "2026-09-01", type: "阶段低点", label: "前段寻底与修复交接候选", source: "LIUYAO", confidence: 64, note: "候选时间必须与价格止跌结构同时出现。" },
      { date: "2026-09-04", type: "转折", label: "修复后再度受压观察", source: "LIUYAO", confidence: 62, note: "若此前没有明显反弹，不机械套用回落。" },
    ],
    ichingEvidence: {
      primaryHexagram: "艮为山（六冲）",
      changingHexagram: "风山渐（归魂）",
      notes: "0824专项月卦后段路线；第五爻动。月度阶段与原周卦存在部分分歧，按来源优先级发布V2。",
    },
    rollingUpdate: {
      asOf: "2026-08-24",
      label: "目标周事前修订",
      summary: "把旧版整周震荡下跌细化为前段寻底、周中修复、周尾再受压。",
      originalLockedView: `${tslaWeek3V1.direction}｜${tslaWeek3V1.expectedPath}`,
      timingTolerance: "高低点候选允许半日至一个交易日误差；方向单独验收。",
    },
    version: 2,
    publishedAt: "2026-08-24T12:25:00+08:00",
    lockedAt: "2026-08-24T12:25:00+08:00",
  },
];

export function listTSLAPeriodForecasts20260816(): ConvictionPeriodForecast[] {
  return [...TSLA_LIUYAO_FORECASTS_20260816, ...TSLA_LIUYAO_REVISIONS_20260824];
}

export function tslaPeriodMeta20260816() {
  return TSLA_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: tslaPeriodLabel20260816(type).zh,
    emptyZh: tslaPeriodLabel20260816(type).emptyZh,
    hasResearch: listTSLAPeriodForecasts20260816().some(
      (item) => item.forecastType === type && item.status === "published",
    ),
  }));
}
