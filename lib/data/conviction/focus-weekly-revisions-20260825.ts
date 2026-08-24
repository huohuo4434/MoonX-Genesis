import type { ConvictionForecastType, ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { OfficialDirection } from "@/lib/forecasts/formal-direction";

const PUBLISHED_AT = "2026-08-25T07:10:00+08:00";
const QIMEN_GAP = "同周期奇门盘尚未提供；本条只记录六爻，不标记双方法共振。";

type RevisionInput = {
  id: string;
  assetId: "sandisk" | "nbis" | "sp500" | "nasdaq-100";
  forecastType: ConvictionForecastType;
  periodStart: string;
  periodEnd: string;
  direction: OfficialDirection;
  primary: string;
  changing?: string | null;
  summary: string;
  path: string;
  longRelation: string;
  risk: string;
  consensusStars?: 2 | 3 | 4;
  methodViews?: NonNullable<ConvictionPeriodForecast["methodViews"]>;
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

function revision(input: RevisionInput): ConvictionPeriodForecast {
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
    catalysts: ["完整独立周卦", input.longRelation],
    risks: [input.risk, QIMEN_GAP, "幅度与交易位置仍需真实K线确认。"],
    consensusStars: input.consensusStars ?? 2,
    consensusLabel: `${input.longRelation}；星级只表示现有方法共识，不表示涨跌幅。`,
    methodViews: input.methodViews ?? [
      {
        id: `${input.id}-liuyiao`,
        label: "六爻·完整周卦",
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
      notes: `2026-08-24至25日新增完整排盘，按财爻、世应、月令与动变次序复核。${input.longRelation}。`,
    },
    version: input.id.endsWith("V2") ? 2 : 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const SANDISK_WEEKLY_REVISIONS_20260825: ConvictionPeriodForecast[] = [
  revision({
    id: "SNDK-W5-20260831-V2", assetId: "sandisk", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先涨后跌",
    primary: "雷风恒", summary: "新周卦为恒静卦，财爻两现、官鬼持世，单独看更偏延续震荡；但同周期既有完整阶段卦已锁定第二峰后于9月3日至4日转弱，阶段来源略优先。",
    path: "前段延续第二轮修复并测试高位 → 9月初分歧放大 → 后段防兑现回落；若前段没有上冲，则只保留震荡转弱。",
    longRelation: "与既有双峰后转弱路线部分一致", risk: "新静卦与既有阶段卦不完全同向，正式结论降置信，不把任一来源隐藏。", consensusStars: 2,
    methodViews: [
      { id: "SNDK-W5-20260831-V2-stage", label: "阶段卦·既有锁定", direction: "先涨后跌", weight: 65, summary: "第二轮上涨延续至9月初，随后进入兑现窗口。" },
      { id: "SNDK-W5-20260831-V2-week", label: "六爻·本次完整周卦", direction: "震荡", weight: 35, summary: "恒静卦以延续和区间消化为主，未提供单独转折动爻。" },
      { id: "SNDK-W5-20260831-V2-qimen", label: "奇门·同周期证据待补", direction: "资料不足", weight: 0, summary: QIMEN_GAP },
    ],
  }),
  revision({
    id: "SNDK-W6-20260907-V1", assetId: "sandisk", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡下跌",
    primary: "天地否（六合）", summary: "否静卦不见主动修复动爻，财卯木持世又受酉月冲，兄弟申金偏强，承接弱于资金分流。",
    path: "反抽受阻 → 震荡转弱 → 周后段低位整理。", longRelation: "接续申月第二峰后的转弱阶段", risk: "六合只降低失序程度，不代表方向自动转多。",
  }),
  revision({
    id: "SNDK-W7-20260914-V1", assetId: "sandisk", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "先跌后涨",
    primary: "山雷颐（游魂）", changing: "风地观", summary: "子孙巳火化父母子水，前段生财力量退出；底爻父母子水化妻财未土，后段压力重新转到价格承接。",
    path: "前段继续释放压力 → 中段观察止跌 → 后段出现受限修复。", longRelation: "与长期反弹中的中途洗盘相容", risk: "财土在酉月泄气，后段修复强度不宜高估。",
  }),
  revision({
    id: "SNDK-W8-20260921-V1", assetId: "sandisk", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡下跌",
    primary: "泽雷随（归魂）", summary: "随静卦缺少反转动爻，财土持世但持续生扶当令官鬼酉金，价格端仍受风险与兑现约束。",
    path: "弱反抽与回落交替 → 周度重心偏低；等待新月令再确认。", longRelation: "与第二峰后的整理阶段一致", risk: "归魂提高反复，偏弱中仍可能出现快速反弹。",
  }),
  revision({
    id: "SNDK-W9-20260928-V1", assetId: "sandisk", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡上涨",
    primary: "天泽履", summary: "子孙申金持世得令并能生伏财子水，官鬼卯木受酉月冲；履静卦要求谨慎推进，支持修复但不支持追涨。",
    path: "低位确认 → 震荡修复 → 跨月前高位仍有反复。", longRelation: "与三个月反弹背景重新接轨", risk: "静卦动能有限，进入戌月后需新资料确认。",
  }),
];

export const NBIS_WEEKLY_REVISIONS_20260825: ConvictionPeriodForecast[] = [
  revision({
    id: "NBIS-W4-20260831-V1", assetId: "nbis", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡下跌",
    primary: "兑为泽（六冲）", changing: "天泽履", summary: "六冲放大波动，世位父母发动后仍为父母，变卦世位转兄弟；财卯木受金月压制，价格推动不足。",
    path: "高波动整理 → 反抽受阻 → 重心偏弱。", longRelation: "属于九月偏多大框架中的前段回撤", risk: "短周偏弱不等于九月与三个月方向反转。",
  }),
  revision({
    id: "NBIS-W5-20260907-V1", assetId: "nbis", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "先跌后涨",
    primary: "天火同人（归魂）", changing: "天地否（六合）", summary: "官鬼亥水持世发动后退出风险位，底爻父母卯木又化子孙未土；财申金在酉月有力，但否卦限制修复斜率。",
    path: "前段承压确认 → 风险转弱 → 中后段修复，但上方仍受阻。", longRelation: "与九月震荡偏上方向一致", risk: "归魂转六合仍有反复，不把修复写成单边主升。",
  }),
  revision({
    id: "NBIS-W6-20260914-V1", assetId: "nbis", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡上涨",
    primary: "地天泰（六合）", changing: "雷天大壮（六冲）", summary: "子孙酉金当令并能生财水，兄弟丑土发动后退出竞争位；六合转六冲说明方向偏上但振幅显著放大。",
    path: "承接增强 → 中段上冲 → 周后段高位剧烈换手。", longRelation: "与九月和三个月后段改善同向", risk: "六冲下可能急涨急跌，不追高斜率。", consensusStars: 3,
  }),
  revision({
    id: "NBIS-W7-20260921-V1", assetId: "nbis", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "先涨后跌",
    primary: "泽雷随（归魂）", changing: "坎为水（六冲）", summary: "兄弟寅木化妻财辰土保留前段上冲，但父母亥水化官鬼申金、父母子水化兄弟寅木，后段风险与分流重新接掌。",
    path: "前中段修复上冲 → 高位换手 → 后段回吐。", longRelation: "属于震荡上涨大框架中的一次洗盘", risk: "坎六冲提高急跌尾部风险。",
  }),
  revision({
    id: "NBIS-W8-20260928-V1", assetId: "nbis", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡上涨",
    primary: "火天大有（归魂）", changing: "山天大畜", summary: "兄弟酉金发动后退出竞争位，变卦财寅木持世；大畜限制斜率，但资金端仍保留修复条件。",
    path: "跨月蓄势 → 回踩有承接 → 震荡抬高，末端防高位约束。", longRelation: "与三个月先压后强的后段一致", risk: "财木在酉月仍弱，修复需要真实结构确认。",
  }),
];

export const US_INDEX_WEEKLY_REVISIONS_20260825: ConvictionPeriodForecast[] = [
  revision({
    id: "SPX-W5-20260831-V1", assetId: "sp500", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡上涨",
    primary: "天火同人（归魂）", changing: "泽火革", summary: "子孙戌土发动化妻财未土，风险端未增强，价格端得到补入；同人到革支持修复中换结构。",
    path: "震荡承接 → 中段修复 → 高位换手。", longRelation: "与九月资金修复但路径不稳的大框架一致", risk: "归魂与革卦都提高换手，不能按直线上涨处理。",
  }),
  revision({
    id: "SPX-W6-20260907-V1", assetId: "sp500", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "先涨后跌",
    primary: "风山渐（归魂）", changing: "水山蹇", summary: "上爻官鬼卯木化妻财子水保留前段推进，但渐至上爻后转蹇，后段阻力和兑现更明确。",
    path: "缓慢推升 → 上方遇阻 → 后段回吐。", longRelation: "与九月高波动、非顺畅主升一致", risk: "前段若未形成修复，则直接按受阻震荡处理。",
  }),
  revision({
    id: "SPX-W7-20260914-V1", assetId: "sp500", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡",
    primary: "离为火（六冲）", changing: "火泽睽", summary: "官鬼亥水化子孙丑土是风险缓和，子孙丑土又化父母卯木则削弱后续推动；财酉金在变卦持世，多空结构并列。",
    path: "急跌急拉并存 → 中枢式换手 → 等待周末选择方向。", longRelation: "与九月不稳定修复背景一致", risk: "六冲转睽分歧很大，不硬判单边。",
  }),
  revision({
    id: "SPX-W8-20260921-V1", assetId: "sp500", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡下跌",
    primary: "山水蒙", changing: "火水未济", summary: "世位妻财酉金发动后化子孙戌土，价格力量退出；蒙到未济表示结构仍未完成，后段承接不足。",
    path: "反抽确认 → 资金推动减弱 → 周度重心下移。", longRelation: "与九月后段风险上升一致", risk: "未济不等于连续暴跌，偏弱中仍有反抽。", consensusStars: 3,
  }),
  revision({
    id: "SPX-W9-20260928-V1", assetId: "sp500", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "先跌后涨",
    primary: "天水讼（游魂）", changing: "火风鼎", summary: "妻财申金化子孙未土先释放压力，兄弟午火又化妻财酉金，为后段重新补入价格力量；讼到鼎更像先分歧后重整。",
    path: "前段继续承压 → 中段止跌重整 → 后段修复。", longRelation: "与九月修复不稳、跨月重整一致", risk: "游魂结构下修复持续性仍需确认。",
  }),
  revision({
    id: "NDX-W5-20260831-V1", assetId: "nasdaq-100", forecastType: "WEEK_5", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨",
    primary: "山天大畜", changing: "地风升", summary: "底爻妻财子水化兄弟丑土先见资金分流，上爻官鬼寅木化子孙酉金则在后段释放风险并补入生财力量。",
    path: "前段下探与蓄势 → 中段止跌 → 后段修复。", longRelation: "与九月偏弱背景中的短修复并存", risk: "升卦只描述后段，不推翻九月月卦偏弱。",
  }),
  revision({
    id: "NDX-W6-20260907-V1", assetId: "nasdaq-100", forecastType: "WEEK_6", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "下跌",
    primary: "坎为水（六冲）", summary: "静卦六冲放大科技权重波动，财午火在酉月失势，官鬼与兄弟力量不弱，没有动爻提供有效反转。",
    path: "高波动下探 → 急反后再承压 → 周度重心下移。", longRelation: "与九月科技指数相对弱势同向", risk: "六冲偏空中仍会出现快速反抽。", consensusStars: 3,
  }),
  revision({
    id: "NDX-W7-20260914-V1", assetId: "nasdaq-100", forecastType: "WEEK_7", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "震荡",
    primary: "风火家人", summary: "静卦没有主动趋势动爻，财丑土持世但在酉月泄气，官鬼酉金得令；更适合按既有弱势中的整理周处理。",
    path: "区间反复 → 尝试修复 → 上方仍受压。", longRelation: "与九月偏弱但非直线下跌一致", risk: "静卦只能顺势，真实结构破位时需下调。",
  }),
  revision({
    id: "NDX-W8-20260921-V1", assetId: "nasdaq-100", forecastType: "WEEK_8", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "下跌",
    primary: "兑为泽（六冲）", changing: "水雷屯", summary: "子孙亥水化兄弟申金，修复力量转为竞争；妻财卯木虽发动后仍为财木，但受酉月冲，难以抵消六冲与屯卦压力。",
    path: "分歧放大 → 反抽失败 → 后段继续探底。", longRelation: "与九月科技指数弱势同向", risk: "跌速过快时会出现急反，不代表周方向转多。", consensusStars: 3,
  }),
  revision({
    id: "NDX-W9-20260928-V1", assetId: "nasdaq-100", forecastType: "WEEK_9", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "先涨后跌",
    primary: "雷风恒", changing: "天地否（六合）", summary: "财戌土发动保留前段修复，但官鬼申金与酉金同时发动，变卦世位落兄弟卯木，后段分流与闭塞风险更高。",
    path: "前段反抽延续 → 中段高位分歧 → 后段回落。", longRelation: "延续九月偏弱并向十月过渡", risk: "六合只让回落更有序，不等于风险消失。",
  }),
];

