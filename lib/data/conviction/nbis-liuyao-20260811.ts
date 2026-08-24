/**
 * NBIS member research restored verbatim from the locked V7.18.2 dossier.
 * Do not rewrite these historical forecasts after publication.
 */
import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import { NBIS_WEEKLY_REVISIONS_20260825 } from "@/lib/data/conviction/focus-weekly-revisions-20260825";

const PUBLISHED_AT = "2026-08-11T21:00:00+08:00";
const FULL_SUPPORT = ["205", "200", "174", "165"];
const FULL_RESISTANCE = ["224", "234", "250", "280", "300"];

type LockedRecord = {
  id: string;
  forecastType: ConvictionForecastType;
  periodStart: string;
  periodEnd: string;
  direction: ConvictionPeriodForecast["direction"];
  probabilities: [number, number, number];
  summary: string;
  expectedPath: string;
  catalysts: string[];
  risks: string[];
  stars: 3 | 4 | 5;
  consensus: string;
  primary: string;
  changing: string;
  notes: string;
  methods: NonNullable<ConvictionPeriodForecast["methodViews"]>;
  support?: string[];
  resistance?: string[];
};

function locked(record: LockedRecord): ConvictionPeriodForecast {
  return {
    id: record.id,
    assetId: "nbis",
    forecastType: record.forecastType,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    direction: record.direction,
    upProbability: record.probabilities[0],
    sidewaysProbability: record.probabilities[1],
    downProbability: record.probabilities[2],
    summary: record.summary,
    expectedPath: record.expectedPath,
    supportLevels: record.support ?? FULL_SUPPORT,
    resistanceLevels: record.resistance ?? FULL_RESISTANCE,
    riskLevel: "高",
    catalysts: record.catalysts,
    risks: record.risks,
    consensusStars: record.stars,
    consensusLabel: record.consensus,
    methodViews: record.methods,
    ichingEvidence: {
      primaryHexagram: record.primary,
      changingHexagram: record.changing,
      notes: record.notes,
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const NBIS_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  locked({
    id: "NBIS-W1-20260811-V1", forecastType: "WEEK", periodStart: "2026-08-11", periodEnd: "2026-08-16",
    direction: "震荡上涨", probabilities: [55, 30, 15], stars: 4,
    primary: "雷水解", changing: "雷风恒",
    summary: "老师01按财爻优先与六亲旺衰看：世爻妻财辰土明现，底爻父母子水发动后化妻财丑土，说明压力释放后价格端仍有承接；但子孙午火动化官鬼酉金，申月又放大金气，故只给修复偏多，不判直线主升。老师02看雷水解→雷风恒，‘解’负责解除前期压力，‘恒’负责恢复稳定延续，两套方法合看本段偏修复、偏上。",
    expectedPath: "先止跌修复，再尝试向上；盘中允许回踩和反复。技术执行只等右侧确认，不追一根急拉。第一观察压力在224–234区域，真正转强要看突破后能否回踩站稳。",
    catalysts: ["压力释放后的承接", "解→恒的修复延续"], risks: ["子孙化官鬼", "申月金气", "急拉追高风险"],
    consensus: "两位老师共同指向止跌修复、震荡偏上；技术层只负责确认买点",
    support: ["205", "200"], resistance: ["224", "234"],
    notes: "原卦题：NBIS今天到8月16日走势。起卦时间2026-08-11 20:51；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-w1-teacher-01", label: "老师01·财爻优先/六亲旺衰", direction: "震荡上涨", weight: 65, summary: "世财辰土明现，父母子水发动化财丑土；风险爻仍在，因此偏多但不追涨。" },
      { id: "nbis-w1-teacher-02", label: "老师02·主卦→变卦/路径", direction: "震荡上涨", weight: 35, summary: "雷水解→雷风恒：先解压、后恢复稳定延续，路径偏修复上行。" },
    ],
  }),
  locked({
    id: "NBIS-W2-20260817-V1", forecastType: "WEEK_2", periodStart: "2026-08-17", periodEnd: "2026-08-23",
    direction: "震荡上涨", probabilities: [58, 24, 18], stars: 4,
    primary: "山天大畜", changing: "离为火（六冲）",
    summary: "老师01看两处妻财子水在申月得金生扶，变卦又出现妻财亥水应，说明资金端仍有向上弹性；但原财同时存在化兄弟、化官鬼的消耗，所以这是‘偏多+大波动’，不是无条件追涨。老师02看山天大畜→离为火（六冲），大畜先蓄、离六冲后释放；结合8月与8/11–10/31上级周期偏多，本周更偏向上释放，但会伴随明显甩动。",
    expectedPath: "这是8月最值得关注的加速/变盘窗口之一：先蓄势，再放大波动，方向偏上；若快速冲到压力区，不追，等回踩确认。",
    catalysts: ["财子水得申月生扶", "大畜→离六冲释放"], risks: ["财化兄弟/官鬼", "六冲高波动", "压力区追高"],
    consensus: "偏多共识较强，但六冲决定这不是舒服的直线行情",
    support: ["205", "200", "174"], resistance: ["224", "234", "250"],
    notes: "原卦题：NBIS 8月17日到8月23日走势。起卦时间2026-08-11 20:53；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-w2-teacher-01", label: "老师01·财爻与目标月令", direction: "震荡上涨", weight: 60, summary: "财子水得申月生扶，变卦见财亥水；同时保留财化兄/鬼的高波动警告。" },
      { id: "nbis-w2-teacher-02", label: "老师02·大畜→离六冲", direction: "震荡上涨", weight: 40, summary: "先蓄后放，六冲放大振幅；在上级周期偏多背景下更偏向上释放。" },
    ],
  }),
  locked({
    id: "NBIS-W3-20260824-V1", forecastType: "WEEK_3", periodStart: "2026-08-24", periodEnd: "2026-08-30",
    direction: "震荡", probabilities: [30, 48, 22], stars: 3,
    primary: "地泽临", changing: "水地比（归魂）",
    summary: "老师01看到子孙酉金发动化妻财子水，是新增承接；但妻财亥水又发动化兄弟戌土，资金端同时存在兑现/争夺，属于明显的多空混合结构。老师02看地泽临→水地比（归魂），临与比允许承接和重新聚合，但归魂强调反复。两套方法合并后更像前一段上冲后的回踩、洗盘和再确认。",
    expectedPath: "若8/17–23已经明显上冲，8/24–30更容易出现冲高后的回踩、利润回吐或横向洗盘。这里优先找回踩不破后的二买/三买，而不是把洗盘误判成趋势反转。",
    catalysts: ["子孙化财承接", "临与比重新聚合"], risks: ["财化兄弟", "归魂反复", "利润回吐"],
    consensus: "多空信号并存，核心结论是洗盘/确认，不是单边追涨",
    support: ["205", "200", "174"], resistance: ["224", "234", "250"],
    notes: "原卦题：NBIS 8月24日到8月30日走势。起卦时间2026-08-11 20:54；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-w3-teacher-01", label: "老师01·动爻财兄转换", direction: "震荡", weight: 65, summary: "一边子孙化财，一边财化兄弟，资金承接与兑现同时存在。" },
      { id: "nbis-w3-teacher-02", label: "老师02·临→比归魂", direction: "震荡", weight: 35, summary: "临与比有承接聚合，但归魂放大反复，更像回踩确认周。" },
    ],
  }),
  locked({
    id: "NBIS-AUG-20260811-V1", forecastType: "MONTH_1", periodStart: "2026-08-11", periodEnd: "2026-08-31",
    direction: "震荡上涨", probabilities: [55, 30, 15], stars: 4,
    primary: "雷风恒", changing: "雷地豫（六合）",
    summary: "老师01看原卦妻财戌土应、妻财丑土明现，变卦又出现妻财未土持世，说明本月剩余阶段价格端并非趋势死亡；原世官鬼酉金说明前段压力仍重，因此应按‘先压、后改善’理解。老师02看雷风恒→雷地豫（六合），恒强调趋势延续与磨合，豫六合强调后段情绪和资金修复。综合结论：8月剩余时间震荡偏多，但中间至少会有一次明显洗盘。",
    expectedPath: "8/11–16先修复；8/17–23更可能出现向上加速/大波动；8/24–30容易回踩洗盘。整月不是直线拉升，而是‘修复→加速→洗盘确认’。",
    catalysts: ["财爻多现", "豫六合后段修复"], risks: ["原世官鬼压力", "中途大洗盘", "非直线拉升"],
    consensus: "8月总体偏多，但必须接受中途大洗盘",
    notes: "原卦题：NBIS今天到8月31日走势。起卦时间2026-08-11 20:50；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-aug-teacher-01", label: "老师01·财爻/世爻结构", direction: "震荡上涨", weight: 65, summary: "财爻多现，变卦财未土持世；原世官鬼提示先有压力、后改善。" },
      { id: "nbis-aug-teacher-02", label: "老师02·恒→豫六合", direction: "震荡上涨", weight: 35, summary: "恒主延续与磨合，豫六合主后段修复；不支持把短线回撤直接当趋势结束。" },
    ],
  }),
  locked({
    id: "NBIS-SEP-20260901-V1", forecastType: "MONTH_3", periodStart: "2026-09-01", periodEnd: "2026-09-30",
    direction: "震荡上涨", probabilities: [50, 35, 15], stars: 4,
    primary: "泽雷随（归魂）", changing: "风泽中孚（游魂）",
    summary: "老师01看本卦妻财未土发动化兄弟卯木，确有兑现压力；但父母亥水发动后化妻财未土并在变卦持世，同时原世妻财辰土仍保留为财，资金端最终重新回到财爻主导，所以9月更像震荡中继续抬高，而不是顺畅主升。老师02看泽雷随（归魂）→风泽中孚（游魂），主调是顺势而行但反复确认，支持‘继续偏多、过程不流畅’。",
    expectedPath: "9月整体仍偏多，震荡上行概率更高；如果8月底完成回踩，9月更适合等结构重新确认后持有，而不是追高斜率。",
    catalysts: ["父母化财并入世", "原世财辰土", "随→中孚的顺势确认"], risks: ["财化兄弟", "归魂/游魂反复", "高斜率追涨风险"],
    consensus: "9月偏多，但两位老师都保留反复与兑现压力",
    notes: "原卦题：NBIS 9月整月走势。起卦时间2026-08-11 20:56；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-sep-teacher-01", label: "老师01·财爻动变", direction: "震荡上涨", weight: 65, summary: "虽然有财化兄弟，但父母化财并在变卦持世，最终资金端仍回到财爻主导。" },
      { id: "nbis-sep-teacher-02", label: "老师02·随→中孚", direction: "震荡上涨", weight: 35, summary: "顺势而行但反复确认，适合持有确认后的趋势，不适合追高。" },
    ],
  }),
  locked({
    id: "NBIS-3M-20260811-V1", forecastType: "YEAR_1", periodStart: "2026-08-11", periodEnd: "2026-10-31",
    direction: "先跌后涨", probabilities: [60, 25, 15], stars: 5,
    primary: "地火明夷（游魂）", changing: "雷火丰",
    summary: "老师01最关键的信号是世爻官鬼丑土发动化妻财午火：风险/压力端最终转化为财，属于明显的后段改善结构；这与8月分周‘先修复、再加速、后洗盘’及9月偏多衔接。老师02看地火明夷（游魂）→雷火丰：明夷负责前段受压和光被遮蔽，丰负责后段能量释放，不能把明夷机械理解成一路下跌，也不能把丰机械理解成天天上涨。综合正式路径定为先震荡洗盘、后向上。",
    expectedPath: "主路径：8月中旬修复并可能加速 → 8月下旬洗盘确认 → 9月震荡偏多 → 10月仍保留后段释放空间。技术执行上，200–205是第一观察支撑，165–174是强支撑区；224–234是第一压力，站稳234并回踩不破才属于更明确的趋势确认，之后再看250以及更高的280–300前高区域。",
    catalysts: ["世官鬼化妻财", "明夷→丰后段释放", "多周期后段改善"], risks: ["明夷前段压力", "高波动AI股", "技术压力区追高"],
    consensus: "两位老师对‘先压后强’形成最强共识；技术层只负责等确认与回踩",
    notes: "原卦题：NBIS 8月11日到10月31日走势。起卦时间2026-08-11 20:57；原图显示丙午年、丙申月、丁巳日、庚戌时（日空子丑）。",
    methods: [
      { id: "nbis-3m-teacher-01", label: "老师01·世爻官鬼化财", direction: "先跌后涨", weight: 70, summary: "世官鬼丑土发动化妻财午火，风险端最终转财，支持后段明显强于前段。" },
      { id: "nbis-3m-teacher-02", label: "老师02·明夷→丰", direction: "先跌后涨", weight: 30, summary: "明夷解释前段受压，丰解释后段释放；主路径是先洗盘后向上。" },
    ],
  }),
];

export const NBIS_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5", "WEEK_6", "WEEK_7", "WEEK_8", "MONTH_1", "MONTH_3", "YEAR_1",
];

export const NBIS_VISIBLE_PERIOD_ORDER = NBIS_PERIOD_ORDER;

export const NBIS_PERIOD_LABELS: Partial<Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>> = {
  WEEK: { zh: "8月11—16日", en: "Aug 11–16", emptyZh: "该周期研究尚未发布" },
  WEEK_2: { zh: "8月17—23日", en: "Aug 17–23", emptyZh: "该周期研究尚未发布" },
  WEEK_3: { zh: "8月24—30日", en: "Aug 24–30", emptyZh: "该周期研究尚未发布" },
  WEEK_4: { zh: "8月31日—9月6日", en: "Aug 31–Sep 6", emptyZh: "该周期研究尚未发布" },
  WEEK_5: { zh: "9月7—13日", en: "Sep 7–13", emptyZh: "该周期研究尚未发布" },
  WEEK_6: { zh: "9月14—20日", en: "Sep 14–20", emptyZh: "该周期研究尚未发布" },
  WEEK_7: { zh: "9月21—27日", en: "Sep 21–27", emptyZh: "该周期研究尚未发布" },
  WEEK_8: { zh: "9月28日—10月4日", en: "Sep 28–Oct 4", emptyZh: "该周期研究尚未发布" },
  MONTH_1: { zh: "8月11—31日", en: "Aug 11–31", emptyZh: "该周期研究尚未发布" },
  MONTH_3: { zh: "2026年9月", en: "September 2026", emptyZh: "该周期研究尚未发布" },
  YEAR_1: { zh: "8月11日—10月31日", en: "Aug 11–Oct 31", emptyZh: "该周期研究尚未发布" },
};

export function listNbisPeriodForecasts(): ConvictionPeriodForecast[] {
  return [...NBIS_PERIOD_FORECASTS, ...NBIS_WEEKLY_REVISIONS_20260825]
    .filter((item) => item.status === "published");
}

export function nbisPeriodMeta() {
  const published = listNbisPeriodForecasts();
  return NBIS_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: NBIS_PERIOD_LABELS[type]?.zh ?? type,
    emptyZh: NBIS_PERIOD_LABELS[type]?.emptyZh ?? "该周期研究尚未发布",
    hasResearch: published.some((item) => item.forecastType === type),
  }));
}
