import type { ConvictionForecastType, ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { OfficialDirection } from "@/lib/forecasts/formal-direction";

const PUBLISHED_AT = "2026-08-25T22:10:00+08:00";
const QIMEN_GAP = "同周期奇门盘尚未提供；本条只记录六爻，不标记双方法共振。";

type CompletionInput = {
  id: string;
  assetId: "mu" | "msft" | "tencent";
  forecastType: ConvictionForecastType;
  periodStart: string;
  periodEnd: string;
  direction: OfficialDirection;
  primary: string;
  changing?: string | null;
  summary: string;
  path: string;
  relation: string;
  risk: string;
  calendarMonthPath?: ConvictionPeriodForecast["calendarMonthPath"];
};

function probabilities(direction: OfficialDirection) {
  switch (direction) {
    case "上涨": return { upProbability: 54, sidewaysProbability: 29, downProbability: 17 };
    case "震荡上涨": return { upProbability: 45, sidewaysProbability: 37, downProbability: 18 };
    case "先跌后涨": return { upProbability: 40, sidewaysProbability: 35, downProbability: 25 };
    case "震荡": return { upProbability: 28, sidewaysProbability: 48, downProbability: 24 };
    case "先涨后跌": return { upProbability: 31, sidewaysProbability: 33, downProbability: 36 };
    case "震荡下跌": return { upProbability: 20, sidewaysProbability: 39, downProbability: 41 };
    case "下跌": return { upProbability: 16, sidewaysProbability: 29, downProbability: 55 };
  }
}

function completion(input: CompletionInput): ConvictionPeriodForecast {
  const isMonth = input.forecastType === "MONTH_1";
  return {
    id: input.id,
    assetId: input.assetId,
    forecastType: input.forecastType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    direction: input.direction,
    ...probabilities(input.direction),
    summary: input.summary,
    expectedPath: input.path,
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: [isMonth ? "完整独立月卦" : "完整独立周卦", input.relation],
    risks: [input.risk, QIMEN_GAP, "幅度与价格位置仍需真实K线确认。"],
    consensusStars: 2,
    consensusLabel: `${input.relation}；星级只表示已录入方法的一致程度，不表示涨跌幅。`,
    methodViews: [
      {
        id: `${input.id}-liuyao`,
        label: isMonth ? "六爻·完整月卦" : "六爻·完整周卦",
        direction: input.direction,
        weight: 100,
        summary: input.summary,
      },
      {
        id: `${input.id}-qimen-gap`,
        label: "奇门·同周期证据待补",
        direction: "资料不足",
        weight: 0,
        summary: QIMEN_GAP,
      },
    ],
    ichingEvidence: {
      primaryHexagram: input.primary,
      changingHexagram: input.changing ?? null,
      notes: `${input.summary}${input.relation}。按财爻、世应、月令与动变次序复核，不以卦名直接定涨跌。`,
    },
    calendarMonthPath: input.calendarMonthPath,
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const PRIORITY_ASSET_CYCLE_COMPLETIONS_20260825: ConvictionPeriodForecast[] = [
  completion({
    id: "MU-MONTH-20260901-V1", assetId: "mu", forecastType: "MONTH_1", periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "先涨后跌",
    primary: "天山遁", summary: "遁静卦没有主动突破动爻，财寅木伏于世位官鬼午火之下；酉月金旺又对财木形成压力，价格承接不宜高估。",
    path: "月初沿修复惯性反复测试上方 → 中段动能受限 → 月后段防回吐与重心转弱。", relation: "与年卦9月先涨后跌路线同向", risk: "静卦给出的是整月上限与退守结构，不等同于每天连续下跌。",
  }),
  completion({
    id: "MU-W4-20260824-V1", assetId: "mu", forecastType: "WEEK_4", periodStart: "2026-08-24", periodEnd: "2026-08-30", direction: "先涨后跌",
    primary: "雷地豫（六合）", changing: "水雷屯", summary: "财未土持世但发动后转父母子水，价格力量后段退出；官鬼申金化财戌土保留前段修复，随后屯卦增加阻滞。",
    path: "前段修复或上冲 → 中段分歧扩大 → 后段受阻回吐。", relation: "与9月月卦前强后弱的前置阶段相容", risk: "多爻发动且由六合转屯，周内波动可能明显放大。",
  }),
  completion({
    id: "MU-W5-20260831-V1", assetId: "mu", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先涨后跌",
    primary: "雷地豫（六合）", changing: "坤为地（六冲）", summary: "豫六合保留月初情绪与承接，动爻转财可支持前段推进；变坤六冲则提示后段方向分散、兑现与振幅上升。",
    path: "月初延续修复 → 冲高换手 → 周后段回落或宽幅震荡。", relation: "与9月月卦先涨后跌同向", risk: "六合转六冲时不能把前段上涨外推成整周单边。",
  }),
  completion({
    id: "MU-W6-20260907-V1", assetId: "mu", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡上涨",
    primary: "火水未济", summary: "未济静卦不支持顺滑突破，但财酉金在酉月得令并居应位，价格端有承接；兄弟午火持世使资金竞争仍在。",
    path: "区间换手 → 承接逐步增强 → 震荡抬高但不追直线。", relation: "属于9月先强阶段中的受限推进", risk: "静卦与未济结构限制持续性，冲高后仍可能快速回踩。",
  }),
  completion({
    id: "MU-W7-20260914-V1", assetId: "mu", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡下跌",
    primary: "水雷屯", changing: "水山蹇", summary: "财午火伏于官鬼辰土之下，价格力量受压；屯再化蹇，阻滞没有解除，周度承接弱于风险约束。",
    path: "反抽受阻 → 重心下移 → 周后段低位反复。", relation: "对应9月月卦由强转弱的中段", risk: "蹇卦偏阻不等于连续暴跌，弱势中仍会有急反。",
  }),
  completion({
    id: "MU-W8-20260921-V1", assetId: "mu", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "先跌后涨",
    primary: "火水未济", changing: "火山旅（六合）", summary: "兄弟午火持世发动后化妻财申金，竞争与分流后段转回价格承接；财酉金得令，但旅六合使修复更偏受限与反复。",
    path: "前段继续释放压力 → 中段止跌 → 后段受限修复。", relation: "属于9月偏弱阶段中的局部修复", risk: "旅卦不支持把后段反弹直接升级为趋势反转。",
  }),
  completion({
    id: "MU-W9-20260928-V1", assetId: "mu", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "先跌后涨",
    primary: "天雷无妄（六冲）", changing: "火雷噬嗑", summary: "六冲先放大跨月分歧，官鬼申金发动后化妻财未土，风险力量后段转为价格承接；噬嗑仍要求先处理阻力。",
    path: "前段高波动下探 → 中段处理阻力 → 后段尝试修复。", relation: "与年卦9月转弱、10月重新选择方向相容", risk: "跨月月令切换明显，后段修复需等真实结构确认。",
  }),
  completion({
    id: "MSFT-MONTH-20260901-V1", assetId: "msft", forecastType: "MONTH_1", periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌",
    primary: "雷山小过（游魂）", changing: "地山谦", summary: "官鬼持世而财卯木伏藏，四爻又有高位谨慎信号；小过转谦更偏过热后的收敛、降速与回撤消化。",
    path: "月初高位降温 → 中段回撤与反复 → 月末低位整理，等待10月新结构。", relation: "与年卦9月震荡下跌路线同向", risk: "谦卦表示收敛，不把整月偏弱夸大成无反弹的单边暴跌。",
  }),
  completion({
    id: "MSFT-W4-20260831-V1", assetId: "msft", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡下跌",
    primary: "山泽损", changing: "风泽中孚（游魂）", summary: "财子水发动后化父母巳火，价格力量退出；兄弟土持世增加分流，损转中孚游魂使反弹持续性不足。",
    path: "高位反复 → 反抽受阻 → 周度重心偏弱。", relation: "与9月月卦偏弱开局同向", risk: "游魂提高来回，不排除快速反抽。",
  }),
  completion({
    id: "MSFT-W5-20260907-V1", assetId: "msft", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡下跌",
    primary: "火泽睽", changing: "山泽损", summary: "子孙酉金持世发动后化兄弟戌土，生财力量转为资金竞争；财子水伏藏，睽转损继续压缩价格推动。",
    path: "分歧反复 → 承接减弱 → 周后段偏弱整理。", relation: "与9月月卦震荡下跌同向", risk: "睽卦分歧大，盘中仍可能急拉，不以单日上涨推翻周方向。",
  }),
  completion({
    id: "MSFT-W6-20260914-V1", assetId: "msft", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "先跌后涨",
    primary: "巽为风（六冲）", changing: "风水涣", summary: "六冲先放大下探和换手，官鬼酉金发动后化子孙午火，风险端后段转为修复力量；涣卦使反弹仍较分散。",
    path: "前段急跌急拉 → 中段风险释放 → 后段受限修复。", relation: "属于9月偏弱大框架中的阶段反弹", risk: "六冲转涣不支持追涨，修复失败时仍按月卦偏弱处理。",
  }),
  completion({
    id: "MSFT-W7-20260921-V1", assetId: "msft", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "先跌后涨",
    primary: "雷水解", changing: "火地晋（游魂）", summary: "两处财土发动后转子孙，前段价格力量先释放；解卦减压、晋卦保留后段修复，但游魂降低延续性。",
    path: "前段回撤释放 → 中段止跌 → 后段反弹但高度受限。", relation: "与月卦偏弱中的减压反弹相容", risk: "财爻退出后，反弹需要量价承接才能延续。",
  }),
  completion({
    id: "MSFT-W8-20260928-V1", assetId: "msft", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡",
    primary: "天山遁", changing: "火山旅（六合）", summary: "兄弟申金发动后化父母未土，竞争压力有所退出；但财寅木仍伏于官午火持世之下，价格承接没有完全释放。",
    path: "跨月退守整理 → 区间反复 → 等待10月方向确认。", relation: "承接9月降温并进入10月压力窗口", risk: "多空证据并列，不把局部反弹硬判成趋势转强。",
  }),
  completion({
    id: "TENCENT-MONTH-20260901-V1", assetId: "tencent", forecastType: "MONTH_1", periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡上涨",
    primary: "火风鼎", changing: "山天大畜", summary: "财酉金发动后化子孙戌土，价格推动先释放为蓄势；世位官鬼亥水转父母寅木，风险约束后段减轻。鼎到大畜偏重建与积累，不是直线主升。",
    path: "月初修复重建 → 中段震荡抬高 → 月末蓄势并防高位回吐。", relation: "与年卦9月震荡上涨路线同向", risk: "后续没有独立周卦，以下周路径只由9月月卦拆分，不计入周卦共振。",
    calendarMonthPath: [
      { period: "2026-08-31/2026-09-06", labelZh: "月初重建", direction: "震荡上涨", primaryHexagram: "火风鼎", changingHexagram: "山天大畜", summary: "月初先修复旧结构，财爻有承接但大畜限制斜率。", sourceNote: "9月独立月卦拆分", riskNote: "不是独立周卦。" },
      { period: "2026-09-07/2026-09-13", labelZh: "修复延续", direction: "震荡上涨", primaryHexagram: "火风鼎", changingHexagram: "山天大畜", summary: "重建逻辑延续，方向偏上但仍以震荡推进为主。", sourceNote: "9月独立月卦拆分", riskNote: "不是独立周卦。" },
      { period: "2026-09-14/2026-09-20", labelZh: "中段蓄势", direction: "震荡", primaryHexagram: "火风鼎", changingHexagram: "山天大畜", summary: "进入大畜蓄势段，换手和整理优先于追求斜率。", sourceNote: "9月独立月卦拆分", riskNote: "不是独立周卦。" },
      { period: "2026-09-21/2026-09-27", labelZh: "高位约束", direction: "先涨后跌", primaryHexagram: "火风鼎", changingHexagram: "山天大畜", summary: "前段仍有修复惯性，后段受大畜约束，防冲高后的回吐。", sourceNote: "9月独立月卦拆分", riskNote: "不是独立周卦。" },
      { period: "2026-09-28/2026-10-04", labelZh: "跨月确认", direction: "震荡", primaryHexagram: "火风鼎", changingHexagram: "山天大畜", summary: "9月末以蓄势和高位约束为主，进入10月后等待新月卦确认。", sourceNote: "9月独立月卦拆分", riskNote: "跨月段只能作为月卦背景。" },
    ],
  }),
];

export function listPriorityAssetCycleCompletions20260825(assetId: "mu" | "msft" | "tencent") {
  return PRIORITY_ASSET_CYCLE_COMPLETIONS_20260825.filter((item) => item.assetId === assetId && item.status === "published");
}
