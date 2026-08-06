/**
 * 闪迪（SanDisk / SNDK）多周期六爻研究。
 * 两套框架并列保存：六亲旺衰结构、主互变卦时间轴。
 * 2026-08-07至08-31按自然日记录；周末只作为情绪/消息观察，不冒充交易日。
 */
import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-07T06:12:00+08:00";

function methods(
  structureDirection: string,
  structureSummary: string,
  timelineDirection: string,
  timelineSummary: string
): NonNullable<ConvictionPeriodForecast["methodViews"]> {
  return [
    {
      id: `sandisk-structure-${structureDirection}`,
      label: "六亲旺衰·结构力量",
      direction: structureDirection,
      weight: 50,
      summary: structureSummary,
    },
    {
      id: `sandisk-timeline-${timelineDirection}`,
      label: "主卦互卦变卦·时间轴",
      direction: timelineDirection,
      weight: 50,
      summary: timelineSummary,
    },
  ];
}

export const SANDISK_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "SNDK-W1-20260807-V1",
    assetId: "sandisk",
    forecastType: "WEEK",
    periodStart: "2026-08-07",
    periodEnd: "2026-08-16",
    direction: "先跌后涨",
    upProbability: 43,
    sidewaysProbability: 34,
    downProbability: 23,
    summary:
      "雷地豫六合化泽地萃。财爻未土持世，短线存在承接；子孙巳午火可制官鬼、生财，但官鬼申金发动化酉金，进入申月后压力会逐日增强。两套方法共同指向：先清洗，11日至13日修复，14日前后转折。",
    expectedPath:
      "7日至10日震荡清洗 → 11日至13日第一轮明显修复 → 14日冲高转弱风险上升 → 15日至16日消化抛压并等待下一轮企稳。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["存储板块风险偏好", "超跌修复", "资金重新聚集"],
    risks: ["申酉金旺导致抛压", "反弹量能不足", "消息驱动的快速冲高回落"],
    consensusStars: 4,
    consensusLabel: "结构框架与时间轴均支持中段修复、后段防转弱",
    methodViews: methods(
      "先弱后修复",
      "妻财未土持世有承接，子孙火可制鬼生财；但官鬼申金发动化酉金，申月后越接近14日至15日压力越重。",
      "先清洗后聚集",
      "雷地豫经互卦蹇至泽地萃，先有阻滞，再出现资金和关注度聚集；萃并不等同连续主升。"
    ),
    dailyPath: [
      { date: "2026-08-07", ganzhi: "丑日", status: "进行中", direction: "探底回升", consensusStars: 4, summary: "丑冲财未，盘中容易先压后稳；能否收回早盘弱势决定修复质量。", confirmation: "下探后收回主要成交区", riskNote: "直接跌破承接区则弱势延长" },
      { date: "2026-08-08", ganzhi: "寅日", status: "预测", direction: "震荡下跌", consensusStars: 3, summary: "休市消息观察日，兄弟木出空，竞争与分流情绪偏强。", riskNote: "周末消息可能放大周一缺口" },
      { date: "2026-08-09", ganzhi: "卯日", status: "预测", direction: "震荡", consensusStars: 4, summary: "休市情绪仍偏谨慎，不支持无条件追高；更适合等待周一重新定价。" },
      { date: "2026-08-10", ganzhi: "辰日", status: "预测", direction: "探底回升", consensusStars: 4, summary: "辰冲财戌，容易再次下探；尾段若收回则构成修复前置。", confirmation: "低点不再扩大且尾盘回收" },
      { date: "2026-08-11", ganzhi: "巳日", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "子孙巳火临日，制官鬼并生财，第一轮修复窗口开启。", confirmation: "放量站上前一日高点" },
      { date: "2026-08-12", ganzhi: "午日", status: "预测", direction: "上涨", consensusStars: 5, summary: "子孙午火临日，是本阶段最强反弹候选之一。", riskNote: "快速拉升后需防高位分歧" },
      { date: "2026-08-13", ganzhi: "未日", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "财爻未土临日，偏强延续，但开始进入兑现观察区。", confirmation: "回踩不破并保持量价结构" },
      { date: "2026-08-14", ganzhi: "申日", status: "预测", direction: "冲高回落", consensusStars: 5, summary: "动爻官鬼申金临日，属于重要转折窗口，更像先惯性冲高、后快速转弱。", riskNote: "申月申日抛压共振" },
      { date: "2026-08-15", ganzhi: "酉日", status: "预测", direction: "震荡下跌", consensusStars: 4, summary: "休市但化出官鬼酉金临日，利空情绪与兑现压力可能延续。" },
      { date: "2026-08-16", ganzhi: "戌日", status: "预测", direction: "震荡", consensusStars: 3, summary: "财戌临日，情绪有修复条件，但仍需等待下周交易确认。" },
    ],
    keyDates: [
      { date: "2026-08-12", ganzhi: "午日", type: "上涨候选", label: "第一阶段最强修复候选", source: "LIUYAO", confidence: 82 },
      { date: "2026-08-14", ganzhi: "申日", type: "转折", label: "冲高转弱与抛压放大窗口", source: "LIUYAO", confidence: 86 },
    ],
    ichingEvidence: {
      primaryHexagram: "雷地豫（六合）",
      changingHexagram: "泽地萃",
      notes: "财未土持世；官鬼申金发动化官鬼酉金；子孙巳午火提供阶段性修复。互卦蹇提示修复前仍有阻滞。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-W2-20260817-V1",
    assetId: "sandisk",
    forecastType: "WEEK_2",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "探底回升",
    upProbability: 39,
    sidewaysProbability: 31,
    downProbability: 30,
    summary:
      "雷风恒化泽水困。官鬼酉金持世并处申月旺地，周初压力仍重；官鬼发动化子孙午火，说明压力释放后会有快速修复，但变困意味着反弹上方仍受限制。",
    expectedPath:
      "17日至18日偏弱探底 → 19日跌势减缓 → 20日至21日第二轮明显反弹 → 22日至23日进入受阻与消化阶段。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["压力释放后的均值回归", "子孙火转强", "板块轮动"],
    risks: ["官鬼持世", "反弹受困", "周末消息扰动"],
    consensusStars: 4,
    consensusLabel: "两种方法都支持周初弱、周中后段快速修复，但不确认主升",
    methodViews: methods(
      "压力释放后反弹",
      "官鬼酉金持世先压制价格，发动后化子孙午火，风险释放到一定程度后修复力量增强。",
      "恒久承压后受困",
      "雷风恒先表现为趋势惯性，互卦夬带来快速决断和反弹，最终泽水困限制上涨持续性。"
    ),
    dailyPath: [
      { date: "2026-08-17", ganzhi: "亥日", status: "预测", direction: "震荡下跌", consensusStars: 4, summary: "延续前一阶段压力，容易低开或盘中反复。" },
      { date: "2026-08-18", ganzhi: "子日", status: "预测", direction: "下跌", consensusStars: 4, summary: "子水冲子孙午火，修复力量受压，是本周主要探底候选。", riskNote: "跌速加快时不宜机械抄底" },
      { date: "2026-08-19", ganzhi: "丑日", status: "预测", direction: "震荡", consensusStars: 3, summary: "财丑临日，跌势有望减缓，进入低位稳定观察。", confirmation: "不再创新低并出现承接" },
      { date: "2026-08-20", ganzhi: "寅日", status: "预测", direction: "探底回升", consensusStars: 5, summary: "寅冲官鬼申金，风险被冲动，容易出现快速反弹。", confirmation: "突破前两日压力区" },
      { date: "2026-08-21", ganzhi: "卯日", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "卯冲世爻官鬼酉金，压力继续释放，反弹可延续但尾盘分歧上升。", riskNote: "高位量能衰减时防回吐" },
      { date: "2026-08-22", ganzhi: "辰日", status: "预测", direction: "震荡", consensusStars: 3, summary: "休市进入困象，资金观望，重点观察反弹能否保持。" },
      { date: "2026-08-23", ganzhi: "巳日", status: "预测", direction: "震荡上涨", consensusStars: 3, summary: "巳火克金，情绪偏修复，但上方压力尚未彻底解除。" },
    ],
    keyDates: [
      { date: "2026-08-18", ganzhi: "子日", type: "阶段低点", label: "第二阶段探底风险窗口", source: "LIUYAO", confidence: 75 },
      { date: "2026-08-20", ganzhi: "寅日", type: "上涨候选", label: "风险释放后的快速反弹窗口", source: "LIUYAO", confidence: 84 },
    ],
    ichingEvidence: {
      primaryHexagram: "雷风恒",
      changingHexagram: "泽水困（六合）",
      notes: "官鬼酉金持世并发动，化子孙午火；先承压后修复，困卦限制反弹高度和持续性。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-W3-20260824-V1",
    assetId: "sandisk",
    forecastType: "WEEK_3",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-31",
    direction: "冲高回落",
    upProbability: 34,
    sidewaysProbability: 28,
    downProbability: 38,
    summary:
      "泽风大过静卦，互卦乾。中段推动力强，但大过意味着承载过重、预期容易走向极端；财爻丑未相冲，官鬼酉金在申月旺，月底更需防冲高后快速兑现。",
    expectedPath:
      "24日至25日第三轮冲高 → 26日至27日形成月内重要转折和回撤 → 28日止跌反抽 → 29日至30日休市消息消化 → 31日低位修复但仍处月底分歧。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["互卦乾的推动力", "月末资金再平衡", "板块短线轮动"],
    risks: ["大过过盛", "财爻丑未冲", "申酉日官鬼旺", "月底分歧"],
    consensusStars: 5,
    consensusLabel: "两套方法均把26日至27日列为高风险转折窗口",
    methodViews: methods(
      "前强后压",
      "财未土、财丑土分居上下且相冲，官鬼酉金在申月旺；前段有财，后段风险力量更强。",
      "强推后过载",
      "泽风大过以乾为互卦，中段可强推，但大过静卦表示过盛问题未被化解，最终更易回撤。"
    ),
    dailyPath: [
      { date: "2026-08-24", ganzhi: "午日", status: "预测", direction: "上涨", consensusStars: 4, summary: "午火制官鬼、生财，第三轮冲高窗口启动。" },
      { date: "2026-08-25", ganzhi: "未日", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "财未临日，强势可延续，但已接近过热区。", riskNote: "高开急拉后不宜忽视兑现" },
      { date: "2026-08-26", ganzhi: "申日", status: "预测", direction: "冲高回落", consensusStars: 5, summary: "申月申日金气极旺，是月内重要高点与转折候选。", riskNote: "盘中冲高后卖压可能迅速放大" },
      { date: "2026-08-27", ganzhi: "酉日", status: "预测", direction: "下跌", consensusStars: 5, summary: "官鬼酉金临日，是本月抛压最明确的窗口之一。" },
      { date: "2026-08-28", ganzhi: "戌日", status: "预测", direction: "探底回升", consensusStars: 4, summary: "急跌后出现止跌反抽，但暂不确认新一轮主升。", confirmation: "缩量止跌并收回盘中跌幅" },
      { date: "2026-08-29", ganzhi: "亥日", status: "预测", direction: "震荡", consensusStars: 2, summary: "休市消息和研报影响增强，方向置信度较低。" },
      { date: "2026-08-30", ganzhi: "子日", status: "预测", direction: "震荡", consensusStars: 2, summary: "休市继续消化分歧，等待周一重新定价。" },
      { date: "2026-08-31", ganzhi: "丑日", status: "预测", direction: "探底回升", consensusStars: 3, summary: "财丑临日，偏向低位修复；但整月变讼，反弹仍伴随明显分歧。", riskNote: "信心低于前三周核心日期" },
    ],
    keyDates: [
      { date: "2026-08-26", ganzhi: "申日", type: "阶段高点", label: "第三轮冲高后的月内重要转折", source: "LIUYAO", confidence: 88 },
      { date: "2026-08-27", ganzhi: "酉日", type: "下跌风险", label: "官鬼旺、抛压集中释放", source: "LIUYAO", confidence: 90 },
      { date: "2026-08-28", ganzhi: "戌日", type: "阶段低点", label: "急跌后的止跌反抽观察", source: "LIUYAO", confidence: 70 },
    ],
    ichingEvidence: {
      primaryHexagram: "泽风大过（游魂）",
      changingHexagram: null,
      notes: "静卦大过，互卦乾；财爻丑未相冲，官鬼酉金在申月旺。强推动与过度承载并存。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-M1-20260807-V1",
    assetId: "sandisk",
    forecastType: "MONTH_1",
    periodStart: "2026-08-07",
    periodEnd: "2026-08-31",
    direction: "震荡",
    upProbability: 38,
    sidewaysProbability: 35,
    downProbability: 27,
    summary:
      "泽地萃化天水讼。萃代表资金和关注度会多次聚集，讼代表月底分歧、争夺与冲高回落加剧。月内可出现三轮反弹，但不构成平滑的单边主升。",
    expectedPath:
      "7日至10日清洗 → 11日至13日反弹 → 14日至18日转弱探底 → 19日至21日第二轮修复 → 24日至25日第三轮冲高 → 26日至27日明显回撤 → 28日至31日止跌整理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["存储周期预期", "资金聚集", "三次修复窗口"],
    risks: ["官鬼持世", "月底讼象", "高波动冲高回落"],
    consensusStars: 4,
    consensusLabel: "共同结论是有反弹、但整月多次冲高回落",
    methodViews: methods(
      "反弹受压",
      "官鬼持世令风险与消息扰动主导；妻财卯木起卦空亡且入申月受金克，上涨需要不断消化抛压。",
      "聚集后分歧",
      "泽地萃经风山渐化天水讼，资金先聚集、路径逐步展开，月底进入更激烈分歧。"
    ),
    keyDates: [
      { date: "2026-08-12", ganzhi: "午日", type: "上涨候选", label: "第一轮反弹核心日", source: "LIUYAO", confidence: 82 },
      { date: "2026-08-20", ganzhi: "寅日", type: "上涨候选", label: "第二轮反弹核心日", source: "LIUYAO", confidence: 84 },
      { date: "2026-08-26", ganzhi: "申日", type: "转折", label: "第三轮冲高后的转折窗口", source: "LIUYAO", confidence: 88 },
      { date: "2026-08-27", ganzhi: "酉日", type: "下跌风险", label: "月底抛压集中释放", source: "LIUYAO", confidence: 90 },
    ],
    ichingEvidence: {
      primaryHexagram: "泽地萃",
      changingHexagram: "天水讼（游魂）",
      notes: "官鬼巳火持世；妻财卯木起卦空亡，申月受金克。萃主聚集，讼主分歧与争夺。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-M3-20260807-V1",
    assetId: "sandisk",
    forecastType: "MONTH_3",
    periodStart: "2026-08-07",
    periodEnd: "2026-11-07",
    direction: "震荡上涨",
    upProbability: 49,
    sidewaysProbability: 32,
    downProbability: 19,
    summary:
      "风天小畜化风火家人，互卦火泽睽。三个月比单月结构更好：前期蓄势受限，中段分歧加大，后段资金与基本面逻辑重新归位。",
    expectedPath: "8月至9月上旬震荡蓄势 → 9月上旬至10月中旬分歧放大 → 10月中旬至11月初结构逐步转稳。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["存储景气验证", "产品与需求预期", "后段资金重新聚集"],
    risks: ["中段睽象分歧", "财报兑现差异", "行业供给变化"],
    consensusStars: 4,
    consensusLabel: "两套方法均认为三个月终点优于8月低点，但过程不会直线",
    methodViews: methods(
      "分歧后财星归位",
      "父母子水持世，先由预期与信息主导；兄弟寅木发动带来分流，变卦妻财丑土持世，后段价格与盈利逻辑重新主导。",
      "小畜—睽—家人",
      "先积累、再分歧、后稳定，属于渐进式中期修复。"
    ),
    archiveSummary: "三个月：前蓄势、中分歧、后转稳，整体震荡偏多。",
    ichingEvidence: {
      primaryHexagram: "风天小畜",
      changingHexagram: "风火家人",
      notes: "互卦火泽睽；后段变卦妻财丑土持世，结构优于8月单月。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-Y1-20260807-V1",
    assetId: "sandisk",
    forecastType: "YEAR_1",
    periodStart: "2026-08-07",
    periodEnd: "2027-08-07",
    direction: "探底回升",
    upProbability: 44,
    sidewaysProbability: 31,
    downProbability: 25,
    summary:
      "坎为水六冲化风泽中孚游魂，互卦山雷颐。未来一年以大波动和多轮涨跌为主，前半程风险更高，经过基本面消化后，后半程信心与认可度更可能改善。",
    expectedPath: "2026年8月至11月高波动试底 → 2026年末至2027年春基本面消化和稳定 → 2027年5月至8月信心改善。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["行业周期修复", "盈利验证", "机构认可度改善"],
    risks: ["六冲高波动", "行业周期反复", "前半程估值与业绩波动"],
    consensusStars: 4,
    consensusLabel: "共同结论为前险后稳、后半程优于前半程",
    methodViews: methods(
      "前期竞争、后期信心改善",
      "兄弟子水持世，资金竞争和分流较重；妻财午火在应位说明机会存在，但需要穿越波动；变中孚后信任修复。",
      "坎—颐—中孚",
      "先经历险阻，再由基本面和供需消化，最终进入信心恢复阶段。"
    ),
    archiveSummary: "一年：前半程风险较大，后半程更有利，期间至少会有两轮显著回撤。",
    ichingEvidence: {
      primaryHexagram: "坎为水（六冲）",
      changingHexagram: "风泽中孚（游魂）",
      notes: "互卦山雷颐；六冲强调高波动，中孚强调后段信心重建。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SNDK-Y5-20260807-V1",
    assetId: "sandisk",
    forecastType: "YEAR_5",
    periodStart: "2026-08-07",
    periodEnd: "2031-08-07",
    direction: "震荡上涨",
    upProbability: 56,
    sidewaysProbability: 27,
    downProbability: 17,
    summary:
      "雷水解化雷山小过游魂，互卦水火既济。长期方向偏正面：先解除行业和估值压力，中段可能完成一轮较强周期兑现，后段需防好逻辑被定价过满。",
    expectedPath: "2026年下半年至2028年初逐步解困 → 2028年至2030年进入相对成熟的强周期阶段 → 2030年至2031年高位波动与过热风险增加。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["长期存储需求", "产品升级", "行业周期复苏"],
    risks: ["强周期属性", "资本开支与供给扩张", "后期估值过热"],
    consensusStars: 4,
    consensusLabel: "长期偏多，但两套方法均反对把强周期资产理解为永久单边上涨",
    methodViews: methods(
      "财星有根、周期兑现",
      "妻财辰土持世提供长期价值基础；解卦利于压力释放，但后期小过要求兑现和降仓。",
      "解—既济—小过",
      "先修复、再完成强周期、最后进入过热和回撤管理阶段。"
    ),
    archiveSummary: "五年：长期修复偏多，中段可能出现强周期，后段必须防过热和大回撤。",
    ichingEvidence: {
      primaryHexagram: "雷水解",
      changingHexagram: "雷山小过（游魂）",
      notes: "互卦水火既济；长期先解困，中段兑现，后段小过提示估值和周期过热。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export const SANDISK_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_5",
];

export const SANDISK_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
];

export const SANDISK_PERIOD_LABELS: Partial<
  Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>
> = {
  WEEK: { zh: "8月7—16日逐日", en: "Aug 7–16 daily", emptyZh: "该阶段逐日分析尚未发布" },
  WEEK_2: { zh: "8月17—23日逐日", en: "Aug 17–23 daily", emptyZh: "该阶段逐日分析尚未发布" },
  WEEK_3: { zh: "8月24—31日逐日", en: "Aug 24–31 daily", emptyZh: "该阶段逐日分析尚未发布" },
  MONTH_1: { zh: "8月整体", en: "August", emptyZh: "8月整体分析尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "3个月分析尚未发布" },
  YEAR_1: { zh: "1年", en: "1Y", emptyZh: "1年分析尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "5年分析尚未发布" },
};

export function listSandiskPeriodForecasts(): ConvictionPeriodForecast[] {
  return SANDISK_PERIOD_FORECASTS.filter((item) => item.status === "published");
}

export function sandiskPeriodMeta() {
  const published = listSandiskPeriodForecasts();
  return SANDISK_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: SANDISK_PERIOD_LABELS[type]?.zh ?? type,
    emptyZh: SANDISK_PERIOD_LABELS[type]?.emptyZh ?? "该周期预测尚未发布",
    hasResearch: published.some((item) => item.forecastType === type),
  }));
}
