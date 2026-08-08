import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import { VIBE_FOCUS_PERIOD_FORECASTS } from "@/lib/data/conviction/vibe-focus-forecasts";

/**
 * Tencent expanded dossier, Aug. 9, 2026.
 *
 * Integrity rule:
 * - The original Aug. 3 -> Sep. 3 monthly V1 remains locked in vibe-focus-forecasts.ts.
 * - New Aug. 9 source charts are added as new weekly/calendar-horizon records.
 * - No historical direction/probability is rewritten after the fact.
 */
const PUBLISHED_AT = "2026-08-09T07:04:00+08:00";

export const TENCENT_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "MONTH_3",
];

export const TENCENT_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "MONTH_3",
];

export const TENCENT_PERIOD_LABELS: Partial<
  Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>
> = {
  WEEK: { zh: "8/10–16", en: "Aug 10–16", emptyZh: "8/10–16研究尚未发布" },
  WEEK_2: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23研究尚未发布" },
  WEEK_3: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "8/24–30研究尚未发布" },
  MONTH_1: { zh: "8/3–9/3月卦", en: "Aug 3–Sep 3", emptyZh: "月度研究尚未发布" },
  MONTH_3: { zh: "9–12月路线", en: "Sep–Dec roadmap", emptyZh: "9–12月路线尚未发布" },
};

const NEW_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "TENCENT-W1-20260810-V2",
    assetId: "tencent",
    forecastType: "WEEK",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡",
    upProbability: 38,
    sidewaysProbability: 42,
    downProbability: 20,
    summary:
      "火雷噬嗑→山水蒙，初、二、四爻发动。噬嗑的核心是先处理阻碍，三个动爻并非一路凶象；同时妻财未土持世，说明价格并非没有承接。但最终化蒙，代表障碍处理完以后仍会进入新的不确定和反复，因此这一周更像‘解决阻力后的震荡修复’，而不是流畅主升。",
    expectedPath:
      "周初先处理上方阻力和情绪分歧 → 中段若承接有效可以继续修复 → 后段进入蒙卦式反复，容易出现冲高后重新震荡。整体以箱体内修复和确认优先，不把单日上涨直接当成趋势突破。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "周内突破后能够回踩守住，并且恒生科技同步止跌、腾讯相对强度没有转弱。",
    invalidationLevel: "放量跌破新形成的平台且恒生科技同步走弱，则本周‘修复而非主跌’的判断失效。",
    riskLevel: "中高",
    catalysts: ["妻财未土持世", "噬嗑动爻多为先难后解", "回购与现金流基本面"],
    risks: ["变卦蒙带来反复", "申月港股风险偏好", "突破后快速回吐"],
    aiEvidence:
      "腾讯基本面和回购仍提供客观支撑，但本周六爻没有给出单边加速结构。Vibe只作为独立证据，不改变卦象节奏。",
    ichingEvidence: {
      primaryHexagram: "火雷噬嗑",
      changingHexagram: "山水蒙",
      notes:
        "2026-08-09 06:56起卦。初、二、四爻发动；妻财未土持世。按主卦→动爻→变卦的顺序，先看解决阻碍，再看化蒙后的不确定；月令只修正力度，不把主卦硬翻成单边方向。",
    },
    consensusStars: 3,
    consensusLabel: "有修复条件，但变蒙限制持续性；更适合等确认而不是追涨",
    methodViews: [
      {
        id: "tencent-w1-liuyiao",
        label: "六爻·8/10–16",
        direction: "震荡修复",
        weight: 75,
        summary: "噬嗑先破障、妻财持世，但最终化蒙，方向不宜过度乐观。",
      },
      {
        id: "tencent-w1-vibe",
        label: "基本面/回购",
        direction: "偏多支撑",
        weight: 20,
        summary: "现金流和回购提供底层承接，但不直接决定一周价格路径。",
      },
      {
        id: "tencent-w1-benchmark",
        label: "恒生科技联动",
        direction: "待确认",
        weight: 5,
        summary: "港股风险偏好决定修复能否从个股扩散为趋势。",
      },
    ],
    benchmarkEvidence: {
      benchmarkSymbol: "HSTECH",
      benchmarkNameZh: "恒生科技指数",
      benchmarkDirection: "震荡",
      relation: "腾讯需要相对强度确认",
      summary: "若恒生科技继续承压，腾讯即便个股承接较好，也更容易表现为相对抗跌而非单边上行。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "TENCENT-W2-20260817-V2",
    assetId: "tencent",
    forecastType: "WEEK_2",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "震荡下跌",
    upProbability: 22,
    sidewaysProbability: 34,
    downProbability: 44,
    summary:
      "巽为风（六冲）→天水讼（游魂），三、四爻发动。六冲先放大来回，讼又把分歧升级成争夺，游魂降低趋势持续性；兄弟卯木持世也不利于把这一周理解成舒服的赚钱周。这里是8月三张新周卦里最需要防守的一段。",
    expectedPath:
      "前段可能仍有惯性冲高或反抽 → 中段分歧扩大、波动明显增加 → 后段更容易回落或形成宽幅震荡。即使出现快速拉升，也优先视为六冲环境中的波动，而不是自动升级为主升。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "若周内出现急跌后快速收回，并重新站稳前一周核心平台，才可把偏空等级降为中性。",
    invalidationLevel: "若高低点持续抬升且六冲波动没有破坏结构，则‘风险周’判断失效。",
    riskLevel: "高",
    catalysts: ["前期强势惯性", "龙头现金流与回购"],
    risks: ["巽为风六冲", "讼卦分歧", "游魂持续性弱", "兄弟持世"],
    aiEvidence: "基本面可以降低极端下跌概率，但不能抵消这组卦对高波动与价格分歧的提醒。",
    ichingEvidence: {
      primaryHexagram: "巽为风（六冲）",
      changingHexagram: "天水讼（游魂）",
      notes:
        "2026-08-09 06:57起卦。三、四爻发动；兄弟卯木持世。特殊卦先走六冲规则，再看讼与游魂，结论偏向风险放大而非趋势顺滑。",
    },
    consensusStars: 4,
    consensusLabel: "六冲、讼、游魂三层风险共振，是8月最明确的防守周",
    methodViews: [
      {
        id: "tencent-w2-liuyiao",
        label: "六爻·8/17–23",
        direction: "震荡下跌",
        weight: 80,
        summary: "六冲化讼游魂，分歧和反向波动显著增加。",
      },
      {
        id: "tencent-w2-fundamental",
        label: "基本面缓冲",
        direction: "抗跌但不反转",
        weight: 20,
        summary: "现金流和回购可能带来承接，但不足以把风险周改判成主升。",
      },
    ],
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "TENCENT-W3-20260824-V2",
    assetId: "tencent",
    forecastType: "WEEK_3",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "探底回升",
    upProbability: 43,
    sidewaysProbability: 37,
    downProbability: 20,
    summary:
      "山风蛊（归魂）→火风鼎，四爻独动。蛊不是直接主升，而是先处理积弊、修旧结构；归魂说明资金容易回到旧价格锚。变鼎则比前一周明显改善，代表修整之后有重新组织和建立新平衡的机会。",
    expectedPath:
      "周初继续消化8/17–23留下的压力 → 中段完成修复和换手 → 后段若结构不再创新低，开始出现企稳或反弹。更像‘修旧后重建’，而不是一开周就强攻。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "低点停止下移、回踩缩量，并重新收回前一周被破坏的平台。",
    invalidationLevel: "若蛊卦的‘积弊’继续扩大、周线再度放量破低，则鼎卦修复推迟。",
    riskLevel: "中高",
    catalysts: ["蛊→鼎的修复重建", "月底资金再平衡", "龙头回购承接"],
    risks: ["归魂回到旧锚", "四爻修复过程不顺", "港股整体风险"],
    aiEvidence: "基本面支持‘修复后重建’而非基本面崩坏；是否真正转强仍需价格结构确认。",
    ichingEvidence: {
      primaryHexagram: "山风蛊（归魂）",
      changingHexagram: "火风鼎",
      notes:
        "2026-08-09 06:59起卦，四爻独动。先按蛊的修弊逻辑处理，再看鼎的重建；单动爻不支持把月底直接解释成无条件暴涨。",
    },
    consensusStars: 4,
    consensusLabel: "前一风险周之后出现修复信号，但启动要等价格确认",
    methodViews: [
      {
        id: "tencent-w3-liuyiao",
        label: "六爻·8/24–30",
        direction: "先弱后稳",
        weight: 80,
        summary: "蛊先修旧、鼎后重建，方向较8/17–23明显改善。",
      },
      {
        id: "tencent-w3-fundamental",
        label: "现金流/回购",
        direction: "提供承接",
        weight: 20,
        summary: "若市场风险没有继续恶化，龙头基本面更有利于月底企稳。",
      },
    ],
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "TENCENT-CALENDAR-20260809-V2",
    assetId: "tencent",
    forecastType: "MONTH_3",
    periodStart: "2026-08-09",
    periodEnd: "2026-12-31",
    direction: "震荡",
    upProbability: 35,
    sidewaysProbability: 40,
    downProbability: 25,
    summary:
      "8月9日至年底大卦为火泽睽→天地否（六合）。睽代表阶段性分歧，否代表运行到后段会遇到阻滞；妻财子水伏于兄弟未土之下，也说明价值与现金流并非消失，而是价格兑现经常被市场分歧和资金竞争压住。因此四季度不能按‘一路上涨’理解，但内部月份仍有明显强弱切换。",
    expectedPath:
      "8月先震荡修复并经历一次明显风险周 → 9月重建并蓄势 → 10月六冲放大高波动 → 11月再次出现分歧和回吐压力 → 12月泰六合转为全年末段最顺的局部窗口。大周期的否提醒：即使12月局部顺畅，年底附近仍要防止估值和市场环境重新形成上方阻滞。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "每个月都按独立月卦验证，不用单月强势去覆盖8/9–12/31大卦的‘睽→否’约束。",
    invalidationLevel: "若10–11月没有出现预期的高波动/分歧，且年底仍持续单边抬升，则大周期阻滞判断需要新版本复核。",
    riskLevel: "中高",
    catalysts: ["9月鼎→大畜的重建与蓄势", "12月地天泰六合", "腾讯现金流与回购"],
    risks: ["8/9–12/31睽→否", "10月离为火六冲", "11月井→兑六冲", "港股系统性风险"],
    aiEvidence:
      "腾讯基本面仍是正向底色，但六爻给出的四季度价格路线明显不是单边牛市。MOOX继续把公司质量与价格节奏分开验证。",
    ichingEvidence: {
      primaryHexagram: "火泽睽",
      changingHexagram: "天地否（六合）",
      notes:
        "2026-08-09 07:04起卦，范围为8/9至12/31。妻财子水伏于兄弟未土之下，多爻发动后化否；作为大周期约束，不用它覆盖每张独立月卦。",
    },
    calendarMonthPath: [
      {
        period: "2026-09",
        labelZh: "9月 · 重建后蓄势",
        direction: "震荡上涨",
        primaryHexagram: "火风鼎",
        changingHexagram: "山天大畜",
        summary:
          "鼎→大畜，一、四爻发动。鼎先重建，大畜再蓄势和约束，属于偏正向但不追直线的月份；更像修复、抬升后进入蓄力。",
        sourceNote: "2026-08-09 07:00起卦 · 用户原始截图",
        riskNote: "大畜意味着涨势需要积累，若连续急拉反而要防短期回吐。",
      },
      {
        period: "2026-10",
        labelZh: "10月 · 六冲宽幅震荡",
        direction: "震荡",
        primaryHexagram: "离为火（六冲）",
        changingHexagram: null,
        summary:
          "离为火静卦但属于六冲。没有动爻提供明确单边转化，重点是高波动、快速反向和情绪放大，方向确定性低于9月。",
        sourceNote: "2026-08-09 07:01起卦 · 用户原始截图",
        riskNote: "六冲月不适合把单日突破直接外推为整月趋势。",
      },
      {
        period: "2026-11",
        labelZh: "11月 · 先稳后分歧放大",
        direction: "冲高回落",
        primaryHexagram: "水风井",
        changingHexagram: "兑为泽（六冲）",
        summary:
          "井先代表基础和资源仍在，但多爻发动后化兑六冲，容易从稳定预期转向交易分歧。若前段走强，后段更需要防回吐和快速反向。",
        sourceNote: "2026-08-09 07:02起卦 · 用户原始截图",
        riskNote: "基本面稳定不等于价格稳定；六冲是11月的主要风险标签。",
      },
      {
        period: "2026-12",
        labelZh: "12月 · 局部最顺窗口",
        direction: "震荡上涨",
        primaryHexagram: "地天泰（六合）",
        changingHexagram: null,
        summary:
          "泰六合静卦，是9–12月几张月卦里局部结构最顺的一张。更适合看作年底修复、秩序改善和趋势顺畅，而不是保证大涨。",
        sourceNote: "2026-08-09 07:03起卦 · 用户原始截图",
        riskNote: "仍需服从8/9–12/31大卦睽→否的年底阻滞约束，局部强不等于无限上行。",
      },
    ],
    consensusStars: 4,
    consensusLabel: "独立月卦呈现清晰的强弱轮动；大周期限制单边乐观",
    methodViews: [
      {
        id: "tencent-calendar-liuyiao",
        label: "六爻·9–12月",
        direction: "轮动震荡",
        weight: 85,
        summary: "9月改善、10月高波动、11月分歧、12月局部顺畅。",
      },
      {
        id: "tencent-calendar-fundamental",
        label: "基本面底色",
        direction: "偏多",
        weight: 15,
        summary: "现金流、游戏广告和回购支撑长期质量，但不覆盖价格周期。",
      },
    ],
    archiveSummary:
      "8/9–12/31：睽→否约束单边上涨。月度内部为9月改善、10月六冲、11月再分歧、12月泰六合修复。",
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listTencentPeriodForecasts(): ConvictionPeriodForecast[] {
  const oldMonthly = VIBE_FOCUS_PERIOD_FORECASTS.filter(
    (item) => item.assetId === "tencent" && item.forecastType === "MONTH_1" && item.status === "published"
  );
  return [...NEW_FORECASTS, ...oldMonthly];
}

export function tencentPeriodMeta() {
  const periods = listTencentPeriodForecasts();
  return TENCENT_VISIBLE_PERIOD_ORDER.map((type) => {
    const label = TENCENT_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
    return {
      type,
      labelZh: label.zh,
      emptyZh: label.emptyZh,
      hasResearch: periods.some((item) => item.forecastType === type),
    };
  });
}
