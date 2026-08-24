/**
 * Asteroid（太空狗）多周期六爻研究。
 * 重点关注页展示本周逐日、下周逐日与1个月；更长周期进入总趋势资料库。
 * 来源包含2026-07-24与2026-07-29两次3个月卦，复测结果分别保留。
 */
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

export type ConvictionForecastType =
  | "TODAY"
  | "TOMORROW"
  | "WEEK"
  | "WEEK_2"
  | "WEEK_3"
  | "WEEK_4"
  | "WEEK_5"
  | "WEEK_6"
  | "WEEK_7"
  | "WEEK_8"
  | "WEEK_9"
  | "MONTH_1"
  | "MONTH_3"
  | "YEAR_1"
  | "YEAR_3"
  | "YEAR_5"
  | "YEAR_10";

export type ConvictionPeriodForecast = {
  id: string;
  assetId: string;
  forecastType: ConvictionForecastType;
  targetDate?: string | null;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection | "待复核";
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
  summary: string;
  expectedPath: string;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmationLevel?: string | null;
  invalidationLevel?: string | null;
  riskLevel: string;
  catalysts: string[];
  risks: string[];
  aiEvidence?: string | null;
  ichingEvidence: {
    primaryHexagram: string;
    changingHexagram?: string | null;
    notes: string;
  };
  waveEvidence?: string | null;
  version: number;
  status: "published" | "draft";
  sourceType: "ICHING_RESEARCH" | "ADMIN";
  publishedAt: string;
  lockedAt: string;
  validatedAt?: string | null;
  validationStatus: "UNVERIFIED" | "HIT" | "MISS" | "VOID";
  /** Optional cross-method consensus, shown only when grounded sources exist. */
  consensusStars?: 1 | 2 | 3 | 4 | 5 | null;
  consensusLabel?: string | null;
  methodViews?: Array<{
    id: string;
    label: string;
    direction: string;
    weight: number;
    summary: string;
  }>;
  /** Exact key dates derived from teacher rules or formally entered by an administrator. */
  keyDates?: Array<{
    date?: string | null;
    ganzhi?: string | null;
    branchRule?: string | null;
    type: "上涨候选" | "下跌风险" | "转折" | "波动放大" | "阶段高点" | "阶段低点" | "突破确认";
    label: string;
    source: "LIUYAO" | "QIMEN" | "BAZI" | "TECHNICAL" | "ADMIN";
    confidence?: number | null;
    note?: string | null;
  }>;
  /** Benchmark relationship captured at publication time. */
  benchmarkEvidence?: {
    benchmarkSymbol: string;
    benchmarkNameZh: string;
    benchmarkDirection: string;
    relation: string;
    summary: string;
  } | null;
  /** Compact text for the long-horizon archive. */
  archiveSummary?: string | null;
  /** Rolling calibration preserves the locked forecast while recording live timing drift. */
  rollingUpdate?: {
    asOf: string;
    label: string;
    summary: string;
    originalLockedView?: string | null;
    timingTolerance?: string | null;
  } | null;
  /** Day-by-day path for high-volatility assets; actuals and forecasts are explicitly separated. */
  dailyPath?: Array<{
    date: string;
    ganzhi?: string | null;
    status: "已验证" | "进行中" | "预测";
    direction: string;
    consensusStars: 1 | 2 | 3 | 4 | 5;
    summary: string;
    confirmation?: string | null;
    riskNote?: string | null;
  }>;
  /** Scenario ladder from separately cast target questions. Ratings are qualitative, not statistical probabilities. */
  targetScenarioTests?: Array<{
    targetMarketCap: string;
    tier: string;
    consensusStars: 1 | 2 | 3 | 4 | 5;
    consensusRange?: string | null;
    primaryHexagram: string;
    changingHexagram: string;
    structureView: string;
    timelineView: string;
    conclusion: string;
    activation: string;
    riskNote: string;
  }>;
  /** Calendar-month roadmap for dossiers that have independently cast month-by-month charts. */
  calendarMonthPath?: Array<{
    period: string;
    labelZh: string;
    direction: FormalDirection;
    primaryHexagram: string;
    changingHexagram?: string | null;
    summary: string;
    sourceNote?: string | null;
    riskNote?: string | null;
  }>;
  /** Event-level market environment reference; never used as a direct ASTEROID price signal. */
  marketContext?: {
    label: string;
    primaryHexagram: string;
    changingHexagram: string;
    direction: string;
    summary: string;
    note: string;
  } | null;
};

/** Published long-horizon snapshots only — never fabricate TODAY/TOMORROW from these. */
export const ASTEROID_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "ASTEROID-W1-20260803-V4",
    assetId: "asteroid",
    forecastType: "WEEK",
    periodStart: "2026-08-03",
    periodEnd: "2026-08-09",
    direction: "冲高回落",
    upProbability: 35,
    sidewaysProbability: 38,
    downProbability: 27,
    summary:
      "原始周结构仍是前强后弱，但实际节奏从8月4日开始提前约1天：3日稳定上涨，4日已完成冲高与快速回撤，5日至6日进入修复。当前重点转为判断修复能否重新站回4日回撤前的关键结构。",
    expectedPath:
      "3日启动上涨 → 4日提前完成第一轮冲高和兑现 → 5日至6日修复 → 7日方向选择 → 8日二次震荡或回踩 → 9日观察弱反弹和结构确认。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["修复资金延续", "社区情绪二次升温", "短线流动性放大"],
    risks: ["4日高点附近抛压", "修复量能不足", "小市值资产时间节奏提前或延后", "快速滑点"],
    consensusStars: 4,
    consensusLabel: "两套六爻框架均支持先冲高后修复；奇门环境仅作15%节奏验证，不支持连续单边主升",
    methodViews: [
      {
        id: "asteroid-structure-w1-v4",
        label: "结构力量框架",
        direction: "冲高后修复",
        weight: 45,
        summary: "父母申金持世化酉金，筹码与技术压力增强；子孙卯木空亡化官鬼，拉升后容易快速兑现。",
      },
      {
        id: "asteroid-timeline-w1-v4",
        label: "时序演变框架",
        direction: "前强后弱",
        weight: 40,
        summary: "雷火丰至泽山咸对应放量、过热、情绪修复；小市值资产把中段高潮提前压缩到4日。",
      },
      {
        id: "asteroid-qimen-w1-v4",
        label: "奇门环境验证",
        direction: "震荡修复",
        weight: 15,
        summary: "仅验证整体风险偏好和板块分化，不单独为太空狗确定用神，也不独立触发交易。",
      },
    ],
    rollingUpdate: {
      asOf: "2026-08-06T22:35:00+08:00",
      label: "滚动校准",
      summary: "实际走势较原推演提前约1天。日级别改用核心日加前后1天容差，不追溯修改原始锁定结论。",
      originalLockedView: "高位震荡或继续试探冲高，冲高后承接需要验证。",
      timingTolerance: "高波动小市值资产默认允许±1天时间容差",
    },
    dailyPath: [
      { date: "2026-08-03", ganzhi: "酉日", status: "已验证", direction: "稳定上涨", consensusStars: 4, summary: "稳定上涨并完成第一轮启动，方向与前强结构一致。" },
      { date: "2026-08-04", ganzhi: "戌日", status: "已验证", direction: "冲高回落", consensusStars: 5, summary: "冲高后快速回撤，阶段高潮较原推演提前约1天。", riskNote: "高点附近抛压明显" },
      { date: "2026-08-05", ganzhi: "亥日", status: "已验证", direction: "震荡上涨", consensusStars: 4, summary: "快速回撤后进入修复，属于高波动后的第一轮承接。" },
      { date: "2026-08-06", ganzhi: "子日", status: "进行中", direction: "震荡上涨", consensusStars: 3, summary: "修复暂时延续，但尚未确认重新进入主升。", confirmation: "放量收复4日回撤核心区域", riskNote: "急拉但量价不配合时防再次诱多" },
      { date: "2026-08-07", ganzhi: "丑日", status: "预测", direction: "震荡", consensusStars: 4, summary: "修复延续与方向选择日；能否突破4日回撤核心区决定二次上攻是否成立。", confirmation: "修复量能持续并站稳压力区", riskNote: "冲不过压力则重新回落" },
      { date: "2026-08-08", ganzhi: "寅日", status: "预测", direction: "震荡下跌", consensusStars: 3, summary: "更可能进入第二次震荡或回踩，重点观察卖压是否减弱。", riskNote: "跌破修复起点则结构转弱" },
      { date: "2026-08-09", ganzhi: "卯日", status: "预测", direction: "探底回升", consensusStars: 4, summary: "弱反弹或重新选择方向；站回关键结构才算修复有效。", confirmation: "回踩不破并收回周末短线压力" },
    ],
    keyDates: [
      { date: "2026-08-04", ganzhi: "戌日", type: "阶段高点", label: "第一轮冲高与快速兑现已提前完成", source: "LIUYAO", confidence: 88, note: "作为滚动校准样本保留，不改写原始周预测。" },
      { date: "2026-08-07", ganzhi: "丑日", type: "转折", label: "修复是否升级为二次上攻的方向选择日", source: "LIUYAO", confidence: 72 },
      { date: "2026-08-09", ganzhi: "卯日", type: "突破确认", label: "周末修复有效性确认窗口", source: "TECHNICAL", confidence: 68 },
    ],
    ichingEvidence: {
      primaryHexagram: "雷火丰",
      changingHexagram: "泽山咸",
      notes:
        "父母申金持世发动化父母酉金；子孙卯木旬空发动化官鬼辰土；妻财午火安静。实际走势显示高潮与修复阶段较预期提前约1天。",
    },
    version: 4,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-06T22:35:00+08:00",
    lockedAt: "2026-08-06T22:35:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-W2-20260810-V2",
    assetId: "asteroid",
    forecastType: "WEEK_2",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡",
    upProbability: 34,
    sidewaysProbability: 38,
    downProbability: 28,
    summary:
      "下周不是连续主升，而是先弱震荡、中段修复、后段兑现。两套六爻框架把主要转强窗口放在12日至13日；考虑本周实际提前1天，前置观察从11日下午开始。奇门仅以15%权重验证整体锯齿上涨和板块分化。",
    expectedPath:
      "10日至11日上午震荡蓄势 → 11日下午至13日主要修复和拉升 → 13日晚至14日冲高转折 → 14日至15日兑现回落 → 16日止跌整理或弱反弹。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["11日下午起的前置转强窗口", "12日至13日修复资金", "社区情绪回暖"],
    risks: ["财爻承接不足", "14日至15日兑现", "申酉金阶段抛压", "流动性与滑点风险"],
    consensusStars: 4,
    consensusLabel: "双框架均支持中段转强、后段回落；时间窗口按小市值资产增加±1天容差",
    methodViews: [
      {
        id: "asteroid-structure-w2-v2",
        label: "结构力量框架",
        direction: "先弱后修复",
        weight: 45,
        summary: "财爻卯木与化出寅木承接偏虚，官鬼发动带来洗盘；中段可修复，但后段重新受兄弟金压制。",
      },
      {
        id: "asteroid-timeline-w2-v2",
        label: "时序演变框架",
        direction: "中段转强后兑现",
        weight: 40,
        summary: "归妹至既济再到损，依次对应不稳、结构完成、减损兑现。",
      },
      {
        id: "asteroid-qimen-w2-v2",
        label: "奇门环境验证",
        direction: "锯齿修复",
        weight: 15,
        summary: "整体市场更偏震荡式上涨与板块分化，支持修复但不支持把一次拉升解释为长期反转。",
      },
    ],
    rollingUpdate: {
      asOf: "2026-08-06T22:35:00+08:00",
      label: "提前量修正",
      summary: "根据本周实际节奏，核心日同时展示前置窗口；不机械地把全部日期统一平移。",
      timingTolerance: "核心日±1天；前置窗口从8月11日下午开始",
    },
    dailyPath: [
      { date: "2026-08-10", ganzhi: "辰日", status: "预测", direction: "震荡下跌", consensusStars: 4, summary: "震荡蓄势偏弱，容易先下探再收回。", riskNote: "避免把盘中急拉当成趋势确认" },
      { date: "2026-08-11", ganzhi: "巳日", status: "预测", direction: "震荡", consensusStars: 3, summary: "前半段低位震荡，下午可能提前进入转强窗口。", confirmation: "下午放量并收复短线压力" },
      { date: "2026-08-12", ganzhi: "午日", status: "预测", direction: "探底回升", consensusStars: 4, summary: "主要修复窗口启动，更偏先压后拉。", confirmation: "回踩不破并出现持续买盘" },
      { date: "2026-08-13", ganzhi: "未日", status: "预测", direction: "上涨", consensusStars: 5, summary: "下周最明确的转强和拉升窗口，但尾段需要防过热。", riskNote: "高位放量滞涨时先保护利润" },
      { date: "2026-08-14", ganzhi: "申日", status: "预测", direction: "冲高回落", consensusStars: 5, summary: "冲高转折概率升高，兑现风险明显增加。", riskNote: "申月申日对财爻压力更强" },
      { date: "2026-08-15", ganzhi: "酉日", status: "预测", direction: "下跌", consensusStars: 5, summary: "抛压可能进一步放大，偏向回落和获利兑现。", riskNote: "不宜在快速下跌中盲目补仓" },
      { date: "2026-08-16", ganzhi: "戌日", status: "预测", direction: "震荡", consensusStars: 3, summary: "跌势放缓，低位整理或弱反弹，但暂不确认反转。", confirmation: "缩量止跌并重新站回短线均衡区" },
    ],
    keyDates: [
      { date: "2026-08-11", ganzhi: "巳日", type: "上涨候选", label: "下午开始观察提前转强", source: "LIUYAO", confidence: 66, note: "来自本周实际提前约1天后的前置窗口，不是机械平移。" },
      { date: "2026-08-13", ganzhi: "未日", type: "阶段高点", label: "主要拉升窗口与过热观察日", source: "LIUYAO", confidence: 82 },
      { date: "2026-08-14", ganzhi: "申日", type: "转折", label: "冲高转折与兑现风险窗口", source: "LIUYAO", confidence: 84 },
      { date: "2026-08-15", ganzhi: "酉日", type: "下跌风险", label: "抛压放大窗口", source: "LIUYAO", confidence: 86 },
    ],
    ichingEvidence: {
      primaryHexagram: "雷泽归妹",
      changingHexagram: "山泽损",
      notes:
        "妻财卯木空亡；父母戌土发动化妻财寅木，寅木同样空亡；官鬼午火发动化父母戌土。时序采用归妹—既济—损，奇门只作环境验证。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-06T22:35:00+08:00",
    lockedAt: "2026-08-06T22:35:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-W3-20260817-V1",
    assetId: "asteroid",
    forecastType: "WEEK_3",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "探底回升",
    upProbability: 45,
    sidewaysProbability: 35,
    downProbability: 20,
    summary:
      "进入申月后，世爻子孙酉金和变爻子孙酉金力量增强，多条动爻又转化出妻财亥水，具备超跌修复、二次拉升和资金重新试盘的条件。但主卦六冲、变卦游魂，反弹稳定性仍低。",
    expectedPath:
      "先震荡或回踩，随后出现较明显修复或二次拉升；上涨后仍容易出现大幅回吐。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["申月扶助子孙金", "多爻化财与化子孙"],
    risks: ["六冲", "游魂", "兄弟土仍在", "拉升后快速回吐"],
    consensusStars: 3,
    consensusLabel: "8月相对更容易出现二次机会的一周，但不是长期反转确认",
    methodViews: [
      {
        id: "asteroid-liuyiao-w3",
        label: "六爻·8月17日至23日",
        direction: "探底回升",
        weight: 100,
        summary: "子孙酉金在申月转旺，多爻化财，支持风险释放后的二次修复。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "坤为地",
      changingHexagram: "泽风大过",
      notes:
        "六冲化游魂。妻财亥水、兄弟丑土、官鬼卯木、父母巳火多爻发动；申月后子孙金增强，形成修复条件。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-W4-20260824-V1",
    assetId: "asteroid",
    forecastType: "WEEK_4",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "冲高回落",
    upProbability: 30,
    sidewaysProbability: 30,
    downProbability: 40,
    summary:
      "妻财戌土持世，妻财辰土临应并发动，辰戌相冲，说明做多资金与兑现资金直接对冲。财辰土发动化父母亥水，资金最终转向观望、技术结构和风险控制。",
    expectedPath:
      "仍可能冲高，但更容易形成阶段高点、剧烈分歧或明显回撤；若此前已二次拉升，本周应重点防范兑现。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["财爻双现带来的短线推动"],
    risks: ["辰戌财爻相冲", "财化父母", "六冲剧烈分歧"],
    consensusStars: 2,
    consensusLabel: "月末冲高后兑现风险高于持续主升概率",
    methodViews: [
      {
        id: "asteroid-liuyiao-w4",
        label: "六爻·8月24日至30日",
        direction: "冲高回落",
        weight: 100,
        summary: "两财相冲，发动之财最终化父母，资金分歧与兑现压力明显。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "震为雷",
      changingHexagram: "雷火丰",
      notes:
        "妻财戌土持世，妻财辰土临应并发动；辰戌相冲，财辰土化父母亥水。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-M1-20260801-V4",
    assetId: "asteroid",
    forecastType: "MONTH_1",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    direction: "先涨后跌",
    upProbability: 36,
    sidewaysProbability: 34,
    downProbability: 30,
    summary:
      "八月仍按高波动反弹结构管理，不把一次拉升直接解释成稳定主升。8月7日新增9月底目标市值梯度复测：4000万属于基准目标，5000万属于正常强势目标，7000万需要持续趋势，8000万属于极端情绪情景。四档卦不是统计概率，而是用两套六爻框架做相对难度压力测试。",
    expectedPath:
      "上旬高位震荡或试探冲高 → 中旬回调与换手 → 8月17日至23日二次修复 → 月末冲高分歧。若后续先触及4000万，重点观察回撤能否守住3000万—3500万；守住并重新放量，才逐级激活5000万、7000万情景。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["申月子孙金增强", "风险释放后的二次试盘"],
    risks: ["财爻空亡", "财化兄弟回头克", "六冲与游魂多见", "小市值流动性风险"],
    consensusStars: 3,
    consensusLabel: "短线能拉，中期反复回落；当前上涨尚未确认主升",
    methodViews: [
      {
        id: "asteroid-liuyiao-m1",
        label: "六爻·8月综合",
        direction: "先涨后跌",
        weight: 100,
        summary: "分段卦支持试盘、回调、二次修复和月末兑现的高波动路径。",
      },
    ],
    targetScenarioTests: [
      {
        targetMarketCap: "4000万美元",
        tier: "基准目标",
        consensusStars: 5,
        primaryHexagram: "水火既济",
        changingHexagram: "风天小畜",
        structureView: "妻财午火持世，未月午未相合，目标本身有承接基础；两套方法里这是四档目标中最顺的一档。",
        timelineView: "既济代表阶段目标具备完成条件，化小畜后更像达到后蓄势整理，而不是触及后马上失效。",
        conclusion: "高概率能够触及，更像阶段中继位置而非最终顶部。",
        activation: "触及后若回撤仍能守住3000万—3500万美元并重新放量，5000万以上情景开始增强。",
        riskNote: "到达不等于一路上涨；既济之后的小畜仍要求换手和整理。",
      },
      {
        targetMarketCap: "5000万美元",
        tier: "正常强势目标",
        consensusStars: 4,
        primaryHexagram: "地火明夷",
        changingHexagram: "水天需",
        structureView: "财爻仍有基础，但兄弟、官鬼力量带来明显阻力；从4000万继续抬升时需要消化兑现盘。",
        timelineView: "明夷先受压、需卦主等待，路径更像上涨后回撤或横盘，再等新催化突破。",
        conclusion: "有明显机会，但通常需要一次洗盘和等待，不属于顺滑直达。",
        activation: "4000万附近完成换手并能重新放量站稳，5000万才由目标变成主攻区。",
        riskNote: "若4000万一触即溃并快速跌回原区间，5000万情景应降级。",
      },
      {
        targetMarketCap: "7000万美元",
        tier: "趋势强势情景",
        consensusStars: 4,
        consensusRange: "★★★☆☆～★★★★☆",
        primaryHexagram: "雷泽归妹",
        changingHexagram: "雷风恒",
        structureView: "风险爻有转财的条件，但世侧又化出兄弟，说明上涨越高兑现越重，必须靠持续新增资金消化。",
        timelineView: "归妹代表节奏不规则和突然加速，最终化恒说明只有形成连续数周趋势，7000万才具备持续性。",
        conclusion: "属于强势行情目标，不是当前基准情景；需要真正的趋势行情才能实现。",
        activation: "5000万突破后不是脉冲冲高，而是连续数周保持高低点抬升、成交与社区热度同步扩张。",
        riskNote: "若只靠单日急拉触及高位而缺乏持续资金，容易迅速回吐。",
      },
      {
        targetMarketCap: "8000万美元",
        tier: "极端FOMO情景",
        consensusStars: 2,
        consensusRange: "★★☆☆☆～★★★☆☆",
        primaryHexagram: "泽地萃",
        changingHexagram: "天雷无妄",
        structureView: "萃卦具备资金和注意力聚集的爆发条件，亥卯未木局条件也能增强财爻；但稳定承接不足。",
        timelineView: "萃后无妄且见六冲，更像意外爆发、情绪高潮和巨大震荡，能碰到与能站稳是两回事。",
        conclusion: "可以作为牛市或FOMO尾部目标观察，但不作为9月底基本盘；即使触及也更偏瞬时极值。",
        activation: "7000万已经形成稳定趋势后，叙事和资金进一步集中、市场整体风险偏好同步走强。",
        riskNote: "最需要防止把短暂冲高误判成新平台；六冲结构下高位回撤可能非常快。",
      },
    ],
    marketContext: {
      label: "市场环境旁证｜8月7日非农事件",
      primaryHexagram: "火水未济",
      changingHexagram: "山水蒙",
      direction: "先乱后定，震荡偏多",
      summary: "财爻发动而兄弟持世，事件落地后更像先扫动、反复定价，再偏向风险资产修复；第一根K线不宜直接当成最终方向。",
      note: "该卦只作为BTC和加密市场风险偏好的环境旁证，不直接决定太空狗目标市值，也不计入四档目标评级。",
    },
    rollingUpdate: {
      asOf: "2026-08-07T18:46:00+08:00",
      label: "9月底目标市值压力测试",
      summary: "连续四卦按4000万、5000万、7000万、8000万美元分档询问。由于属于同一主题的连续起卦，网站只把它们用于相对难度排序，不把星级解释成真实概率，也不替代原有月度锁定路径。",
      originalLockedView: "8月高波动反弹，中旬与月末均需防快速兑现。",
      timingTolerance: "目标按逐级激活管理：4000万 → 5000万 → 7000万 → 8000万；每一级必须由实际价格和流动性确认。",
    },
    ichingEvidence: {
      primaryHexagram: "山地剥",
      changingHexagram: "巽为风",
      notes:
        "财寅木、财卯木同时出现但均空亡；妻财卯木发动化兄弟酉金并受回头克；子孙子水持世化官鬼巳火。",
    },
    version: 4,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-07T18:46:00+08:00",
    lockedAt: "2026-08-07T18:46:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-M3-20260801-V2",
    assetId: "asteroid",
    forecastType: "MONTH_3",
    periodStart: "2026-08-01",
    periodEnd: "2026-10-31",
    direction: "先跌后涨",
    upProbability: 38,
    sidewaysProbability: 30,
    downProbability: 32,
    summary:
      "三个月仍是反复筑底和阶段修复，不支持连续主升。8月有试盘与二次修复，9月兄弟申酉金转旺、克制空亡财木，重心偏弱；10月兄弟戌土发动化妻财亥水，风险释放后可能出现技术修复。",
    archiveSummary:
      "8月高波动反弹与回落；9月偏弱；10月风险释放后修复。11月为中期最弱月，12月低位企稳或弱反弹。",
    expectedPath:
      "8月反复拉升与回落 → 9月余热消退、重心下移 → 10月先压后修复。更长背景中，11月压力最大，12月可能低位企稳。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["10月兄弟动化财", "极端回撤后的流动性修复"],
    risks: ["9月兄弟金旺克财", "11月兄弟亥水持世", "高波动与流动性骤降"],
    consensusStars: 3,
    consensusLabel: "中期以冲高回落和反复筑底为主",
    methodViews: [
      {
        id: "asteroid-liuyiao-m3",
        label: "六爻·中期",
        direction: "先跌后涨",
        weight: 100,
        summary: "8月反复、9月偏弱、10月修复；11月压力最大，12月弱企稳。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山地剥",
      changingHexagram: "巽为风",
      notes:
        "总卦财爻空亡并化兄弟回头克。9月火天大有化雷风恒偏弱；10月水地比化坤为地有风险后修复。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-Y1-20260801-V2",
    assetId: "asteroid",
    forecastType: "YEAR_1",
    periodStart: "2026-08-01",
    periodEnd: "2027-08-01",
    direction: "震荡上涨",
    upProbability: 45,
    sidewaysProbability: 30,
    downProbability: 25,
    summary:
      "一年尺度不是彻底归零，仍有逐步修复和抬升空间；但短中期财爻空亡、化兄弟和六冲结构反复出现，决定了路径不会稳定。更适合按周期管理，而不是把每次拉升都视为长期主升。",
    archiveSummary:
      "一年：短期高波动，中期反复筑底，后期仍有修复和抬升空间。",
    expectedPath:
      "前期多次试盘和深度回撤，中期反复筑底；若项目、流动性和大盘环境改善，后期仍可能逐步抬升。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["项目进展", "社区扩张", "加密市场风险偏好恢复"],
    risks: ["极高波动", "流动性骤降", "财化兄弟", "项目执行风险"],
    consensusStars: 2,
    consensusLabel: "长期仍有修复空间，但确定性显著低于BTC与ETH",
    methodViews: [
      {
        id: "asteroid-liuyiao-y1",
        label: "六爻·一年",
        direction: "震荡上涨",
        weight: 100,
        summary: "地风升化地山谦支持缓慢抬升，但必须经历多次整理和回撤。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "地风升",
      changingHexagram: "地山谦",
      notes:
        "妻财丑土持世，一年尺度仍有修复基础；谦卦结构不支持短期暴涨后一路延续。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-Y5-20260729-V1",
    assetId: "asteroid",
    forecastType: "YEAR_5",
    periodStart: "2026-07-29",
    periodEnd: "2031-07-28",
    direction: "震荡上涨",
    upProbability: 52,
    sidewaysProbability: 20,
    downProbability: 28,
    summary:
      "五年基准仍为高波动扩张情景，但六冲结构意味着大涨与深度回撤会反复出现。该长期卦只放入总趋势资料库，不直接生成短期交易信号。",
    archiveSummary:
      "五年：存在扩张机会，但大涨和深度回撤会交替出现。",
    expectedPath:
      "长期积累、传播扩张和极端回撤并存；必须依靠仓位、止损和周期管理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["生态扩张", "加密市场风险偏好"],
    risks: ["六冲大幅回撤", "本金大幅损失", "项目长期存续不确定"],
    ichingEvidence: {
      primaryHexagram: "山天大畜",
      changingHexagram: "离为火",
      notes:
        "高波动上涨结构；六冲意味着大幅上涨与大幅回撤可能交替出现。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-07-29T10:00:00+08:00",
    lockedAt: "2026-07-29T10:00:00+08:00",
    validationStatus: "UNVERIFIED",
  },
];

export const ASTEROID_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "WEEK_5",
  "WEEK_6",
  "WEEK_7",
  "WEEK_8",
  "WEEK_9",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_5",
];

export const ASTEROID_PERIOD_LABELS: Record<
  ConvictionForecastType,
  { zh: string; en: string; emptyZh: string }
> = {
  TODAY: { zh: "今日", en: "Today", emptyZh: "今日分析尚未发布" },
  TOMORROW: { zh: "明日", en: "Tomorrow", emptyZh: "下一交易日分析尚未发布" },
  WEEK: { zh: "本周", en: "Week", emptyZh: "该周期预测尚未发布" },
  WEEK_2: { zh: "第2阶段", en: "Stage 2", emptyZh: "该周期预测尚未发布" },
  WEEK_3: { zh: "第3阶段", en: "Stage 3", emptyZh: "该周期预测尚未发布" },
  WEEK_4: { zh: "第4阶段", en: "Stage 4", emptyZh: "该周期预测尚未发布" },
  WEEK_5: { zh: "第5阶段", en: "Stage 5", emptyZh: "该周期预测尚未发布" },
  WEEK_6: { zh: "第6阶段", en: "Stage 6", emptyZh: "该周期预测尚未发布" },
  WEEK_7: { zh: "第7阶段", en: "Stage 7", emptyZh: "该周期预测尚未发布" },
  WEEK_8: { zh: "第8阶段", en: "Stage 8", emptyZh: "该周期预测尚未发布" },
  WEEK_9: { zh: "第9阶段", en: "Stage 9", emptyZh: "该周期预测尚未发布" },
  MONTH_1: { zh: "1个月", en: "1M", emptyZh: "该周期预测尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "该周期预测尚未发布" },
  YEAR_1: { zh: "1年", en: "1Y", emptyZh: "该周期预测尚未发布" },
  YEAR_3: { zh: "3年", en: "3Y", emptyZh: "该周期预测尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "该周期预测尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "该周期预测尚未发布" },
};

export function listAsteroidPeriodForecasts(): ConvictionPeriodForecast[] {
  return ASTEROID_PERIOD_FORECASTS.filter((f) => f.status === "published");
}

export function getAsteroidForecastByType(
  type: ConvictionForecastType
): ConvictionPeriodForecast | null {
  return listAsteroidPeriodForecasts().find((f) => f.forecastType === type) ?? null;
}
