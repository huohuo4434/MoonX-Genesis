/**
 * Asteroid（太空狗）多周期六爻研究。
 * 重点关注页只展示本周与1个月；更长周期进入总趋势资料库。
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
};

/** Published long-horizon snapshots only — never fabricate TODAY/TOMORROW from these. */
export const ASTEROID_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "ASTEROID-W1-20260803-V3",
    assetId: "asteroid",
    forecastType: "WEEK",
    periodStart: "2026-08-03",
    periodEnd: "2026-08-09",
    direction: "冲高回落",
    upProbability: 35,
    sidewaysProbability: 35,
    downProbability: 30,
    summary:
      "当前上涨更接近资金试盘、高位换手和部分获利兑现，不足以确认长期主升。父母申金持世发动化父母酉金，技术压力与筹码结构继续增强；子孙卯木空亡并化官鬼辰土，乐观情绪容易转为风险。",
    expectedPath:
      "高位震荡或继续试探冲高，但持续性一般；若冲高后不能守住新平台，容易快速回吐。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["短线流动性继续放大", "资金二次试盘"],
    risks: ["父母持世并继续增强", "子孙空亡化官鬼", "大阳线后的获利兑现"],
    consensusStars: 3,
    consensusLabel: "短期可继续试探，但尚未确认主升",
    methodViews: [
      {
        id: "asteroid-liuyiao-w1",
        label: "六爻·8月3日至9日",
        direction: "冲高回落",
        weight: 100,
        summary: "父母持世化父母，子孙空亡化官鬼，冲高后承接仍需验证。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "雷火丰",
      changingHexagram: "泽山咸",
      notes:
        "父母申金持世发动化父母酉金；子孙卯木旬空发动化官鬼辰土；妻财午火安静。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ASTEROID-W2-20260810-V1",
    assetId: "asteroid",
    forecastType: "WEEK_2",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡下跌",
    upProbability: 25,
    sidewaysProbability: 30,
    downProbability: 45,
    summary:
      "妻财卯木空亡；父母戌土发动化妻财寅木，但寅木同样空亡，表面有资金推动，实际承接不足。官鬼午火发动化父母戌土，风险最终落到筹码和技术压力。",
    expectedPath:
      "若前一阶段已经明显上涨，本周更容易出现冲高失败、回落和高位兑现；偶发拉升也可能较短促。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["短线消息或社区情绪"],
    risks: ["财爻双空", "官鬼化父母", "归魂化损", "虚拉后回落"],
    consensusStars: 2,
    consensusLabel: "资金承接不足，属于8月相对偏弱阶段",
    methodViews: [
      {
        id: "asteroid-liuyiao-w2",
        label: "六爻·8月10日至16日",
        direction: "震荡下跌",
        weight: 100,
        summary: "财爻卯木空，父母化财寅木仍空，官鬼化父母，回调压力较大。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "雷泽归妹",
      changingHexagram: "山泽损",
      notes:
        "妻财卯木空亡；父母戌土发动化妻财寅木，寅木同样空亡；官鬼午火发动化父母戌土。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
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
    id: "ASTEROID-M1-20260801-V3",
    assetId: "asteroid",
    forecastType: "MONTH_1",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    direction: "先涨后跌",
    upProbability: 36,
    sidewaysProbability: 34,
    downProbability: 30,
    summary:
      "八月不是稳定主升，而是高波动反弹结构。短线可能继续试盘，中旬偏弱，8月17日至23日存在二次修复，月末再度出现分歧和回落。财爻多次空亡、伏藏或化兄弟，持续资金基础不足。",
    expectedPath:
      "上旬高位震荡或试探冲高 → 中旬回调 → 8月17日至23日二次修复 → 月末冲高分歧和回落。",
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
    ichingEvidence: {
      primaryHexagram: "山地剥",
      changingHexagram: "巽为风",
      notes:
        "财寅木、财卯木同时出现但均空亡；妻财卯木发动化兄弟酉金并受回头克；子孙子水持世化官鬼巳火。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-01T10:38:00+08:00",
    lockedAt: "2026-08-01T10:38:00+08:00",
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
