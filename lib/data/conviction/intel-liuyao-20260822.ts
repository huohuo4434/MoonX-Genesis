/**
 * Intel (INTC) user-supplied Liu Yao research, cast on 2026-08-22.
 *
 * Source boundary:
 * - These are the user's own charts interpreted with the site's Liu Yao method.
 * - They are not teacher charts and must never be presented as teacher forecasts.
 * - No independent daily chart or verified price level was supplied. Do not
 *   fabricate a daily path, support/resistance, or percentage target here.
 */
import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-22T08:00:00+08:00";

function locked(
  record: Omit<ConvictionPeriodForecast, "assetId" | "version" | "status" | "sourceType" | "publishedAt" | "lockedAt" | "validationStatus">,
): ConvictionPeriodForecast {
  return {
    ...record,
    assetId: "intel",
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const INTEL_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  locked({
    id: "INTC-0822-0831-20260822-V1",
    forecastType: "MONTH_1",
    periodStart: "2026-08-22",
    periodEnd: "2026-08-31",
    direction: "震荡上涨",
    upProbability: 45,
    sidewaysProbability: 40,
    downProbability: 15,
    summary: "水天需（游魂）变水风井。需主等待、蓄势与条件尚未齐备，井主回到基本盘、重新聚集承接；世爻子孙申金、应爻妻财子水，初爻妻财子水发动化兄弟丑土，说明资金端有承接，也有消耗和反复。本段不判立即直线拉升，正式结论为前段磨底蓄势、后段逐步转强。",
    expectedPath: "前段震荡磨底并允许回测 → 条件逐步成熟、承接改善 → 8月底偏强。没有独立日卦，不拆成逐日涨跌。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["需→井的蓄势后改善", "世爻子孙申金", "应爻妻财子水"],
    risks: ["游魂反复", "妻财发动化兄弟的资金消耗", "磨底阶段误判为立即主升"],
    ichingEvidence: {
      primaryHexagram: "水天需（游魂）",
      changingHexagram: "水风井",
      notes: "原卦题：Intel美股，从8月22号到8月31号走势情况。起卦时间2026-08-22 07:11；丙午年、丙申月、戊辰日、丙辰时（日空戌亥）。六爻自上而下：朱雀妻财子水；青龙兄弟戌土；玄武子孙申金持世；白虎兄弟辰土化子孙酉金；腾蛇伏父母巳火、官鬼寅木化妻财亥水；勾陈妻财子水临应发动化兄弟丑土。来源为用户本人排盘，不是老师原卦。",
    },
  }),
  locked({
    id: "INTC-0822-0930-20260822-V1",
    forecastType: "MONTH_3",
    periodStart: "2026-08-22",
    periodEnd: "2026-09-30",
    direction: "先涨后跌",
    upProbability: 52,
    sidewaysProbability: 31,
    downProbability: 17,
    summary: "地风升变山风蛊（归魂）。升主逐步抬高而非一步到位；世、应同见妻财丑土，价格与资金主题明确。上爻官鬼酉金发动化兄弟寅木，且变卦归魂，说明主升后会进入兑现、整理和修复。正式路线是先升后整，不把后段整理机械理解为趋势彻底反转。",
    expectedPath: "8月底转强 → 9月前中段进入本周期较强的上行窗口 → 9月中后段高位震荡、回撤或修复。没有独立日卦，不公布逐日涨跌。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["地风升的渐进抬升", "世应同见妻财丑土", "8月底短周期转强衔接"],
    risks: ["上爻官鬼发动化兄弟", "蛊卦后段修复", "归魂反复与获利兑现"],
    ichingEvidence: {
      primaryHexagram: "地风升",
      changingHexagram: "山风蛊（归魂）",
      notes: "原卦题：Intel美股，从8月22号到9月30号走势情况。起卦时间2026-08-22 07:09；丙午年、丙申月、戊辰日、丙辰时（日空戌亥）。六爻自上而下：官鬼酉金发动化兄弟寅木；父母亥水化父母子水；妻财丑土持世化妻财戌土；官鬼酉金；伏子孙午火、父母亥水；伏兄弟寅木、妻财丑土临应。来源为用户本人排盘，不是老师原卦。",
    },
  }),
  locked({
    id: "INTC-0822-YEAREND-20260822-V1",
    forecastType: "YEAR_1",
    periodStart: "2026-08-22",
    periodEnd: "2026-12-31",
    direction: "先涨后跌",
    upProbability: 42,
    sidewaysProbability: 36,
    downProbability: 22,
    summary: "火山旅（六合）静卦。世爻子孙辰土，应爻妻财酉金，官鬼亥水伏藏且起卦时逢空。旅强调阶段性、迁移和高位不久留，六合提供承接但不等于永久单边上涨；静卦表示全年路线以既定大结构为主。结合中周期升→蛊，年底前更适合按先上行、后反复与风险释放理解。",
    expectedPath: "8月底转强 → 9月主升并在后段转入整理 → 10月波动和洗盘放大 → 11月为官鬼亥水风险观察窗口 → 12月整理、修复与重新定价。12月是否再起主升，需等待新卦确认。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["六合承接", "应爻妻财酉金", "中周期升卦上行衔接"],
    risks: ["旅卦不久留", "10月辰戌冲世的波动窗口", "11月伏神官鬼亥水转旺", "无新卦前不得把12月定义为第二主升"],
    ichingEvidence: {
      primaryHexagram: "火山旅（六合、静卦）",
      changingHexagram: null,
      notes: "原卦题：Intel美股，从8月22号到年底走势情况。起卦时间2026-08-22 07:06；丙午年、丙申月、戊辰日、丙辰时（日空戌亥）。静卦，六爻自上而下：兄弟巳火；子孙未土；妻财酉金临应；伏官鬼亥水、妻财申金；兄弟午火；伏父母卯木、子孙辰土持世。来源为用户本人排盘，不是老师原卦。",
    },
  }),
];

export const INTEL_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5", "MONTH_1", "MONTH_3", "YEAR_1"];
export const INTEL_VISIBLE_PERIOD_ORDER = INTEL_PERIOD_ORDER;

export const INTEL_PERIOD_LABELS: Partial<Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>> = {
  WEEK: { zh: "8/31–9/6", en: "Aug 31–Sep 6", emptyZh: "8/31–9/6研究尚未发布" },
  WEEK_2: { zh: "9/7–13", en: "Sep 7–13", emptyZh: "9/7–13研究尚未发布" },
  WEEK_3: { zh: "9/14–20", en: "Sep 14–20", emptyZh: "9/14–20研究尚未发布" },
  WEEK_4: { zh: "9/21–27", en: "Sep 21–27", emptyZh: "9/21–27研究尚未发布" },
  WEEK_5: { zh: "9/28–10/4", en: "Sep 28–Oct 4", emptyZh: "9/28–10/4研究尚未发布" },
  MONTH_1: { zh: "9月整月（最新）", en: "September · latest", emptyZh: "该周期研究尚未发布" },
  MONTH_3: { zh: "8月22日—9月30日", en: "Aug 22–Sep 30", emptyZh: "该周期研究尚未发布" },
  YEAR_1: { zh: "8月22日—年底", en: "Aug 22–Year End", emptyZh: "该周期研究尚未发布" },
};

export function listIntelPeriodForecasts(): ConvictionPeriodForecast[] {
  return INTEL_PERIOD_FORECASTS.filter((item) => item.status === "published");
}

export function intelPeriodMeta() {
  const published = listIntelPeriodForecasts();
  return INTEL_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: INTEL_PERIOD_LABELS[type]?.zh ?? type,
    emptyZh: INTEL_PERIOD_LABELS[type]?.emptyZh ?? "该周期研究尚未发布",
    hasResearch: published.some((item) => item.forecastType === type),
  }));
}
