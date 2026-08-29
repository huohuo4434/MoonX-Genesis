import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

export const MONTHLY_LIUYAO_SOURCE_META_20260829 = Object.freeze({
  sandisk: {
    capturedAt: "2026-08-29T15:22:00+08:00",
    sourceFile: "ea25d744b26c438a5e104597231c4c18.jpg",
    lineInputFile: "66a53fb089d93e11cc3a9ab10602db5c.jpg",
    question: "闪迪，9月份走势",
  },
  meta: {
    capturedAt: "2026-08-29T15:24:00+08:00",
    sourceFile: "2474b076f6d3b5e944b2124e9309f1ed.jpg",
    question: "Meta，9月份走势",
  },
  nvda: {
    capturedAt: "2026-08-29T15:25:00+08:00",
    sourceFile: "a0f01ea1ce96545857ccea6a9b5ab987.jpg",
    question: "英伟达，9月份走势",
  },
});

export const SUPPLEMENTAL_KEY_DATE_ASSET_IDS = Object.freeze(["meta", "nvda"] as const);
export type SupplementalKeyDateAssetId = (typeof SUPPLEMENTAL_KEY_DATE_ASSET_IDS)[number];

export const SUPPLEMENTAL_KEY_DATE_ASSETS: Readonly<Record<SupplementalKeyDateAssetId, {
  assetId: SupplementalKeyDateAssetId;
  canonicalSymbol: string;
  displayName: string;
  assetClass: "EQUITY";
}>> = Object.freeze({
  meta: { assetId: "meta", canonicalSymbol: "META", displayName: "Meta", assetClass: "EQUITY" },
  nvda: { assetId: "nvda", canonicalSymbol: "NVDA", displayName: "英伟达", assetClass: "EQUITY" },
});

type TeacherComparisonInput = {
  direction: ConvictionPeriodForecast["direction"];
  bingwu: string;
  wolf: string;
  wanli: string;
  qiu: string;
};

function teacherComparisons(input: TeacherComparisonInput): NonNullable<ConvictionPeriodForecast["methodViews"]> {
  return [
    { id: "bingwu-primary", label: "月令六亲流派（主判）", direction: input.direction, weight: 40, summary: input.bingwu },
    { id: "wolf-cross-check", label: "动爻节奏流派（复核）", direction: input.direction, weight: 25, summary: input.wolf },
    { id: "wanli-cross-check", label: "用神强弱流派（复核）", direction: input.direction, weight: 20, summary: input.wanli },
    { id: "qiu-cross-check", label: "卦象取形流派（复核）", direction: input.direction, weight: 15, summary: input.qiu },
  ];
}

/**
 * Forward-only records from the three original charts supplied on 2026-08-29.
 * The charts name a month, not an exact day. Consequently no keyDates are
 * declared here; the member radar may derive an explicitly-labelled timing
 * observation from the locked monthly path, but may not call it teacher-given.
 */
export const MONTHLY_LIUYAO_FORECASTS_20260829: readonly ConvictionPeriodForecast[] = Object.freeze([
  {
    id: "SNDK-M1-20260901-V3",
    assetId: "sandisk",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先涨后跌",
    upProbability: 30,
    sidewaysProbability: 31,
    downProbability: 39,
    summary:
      "水风井化雷泽归妹（归魂），初、三、四、五爻动。井卦保留承接与反复取用，不支持单边崩跌；但妻财戌土持世发动化官鬼申金，进入酉月后申酉官鬼由起卦旬空转为更容易被触发，后段兑现和回撤压力高于前段。归妹归魂又提示冲高后的回归、错位和反复确认，因此9月按先涨后跌、途中有修复处理。",
    expectedPath:
      "9月1日至6日承接8月底冲高并快速分歧 → 9月7日至10日申酉风险线被月令激活，先看压力释放 → 9月11日至18日官鬼化财、化子孙带来一轮修复 → 9月19日至24日财世化官与归妹归魂重新压制 → 9月25日至30日低位整理并观察是否止跌，不预设已经反转。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "冲高后日线或4H出现上攻衰减、反弹不过前高，30分钟结构转弱时，才确认由前段转入后段压力。",
    invalidationLevel: "若9月中下旬持续放量突破且回踩不破、财世化官的压力没有兑现，则先涨后跌路线失效并发布新版本。",
    riskLevel: "高",
    catalysts: ["NAND与SSD周期", "半导体板块9月轮动", "鬼化财与鬼化子孙的中段修复"],
    risks: ["财爻持世化官鬼", "申酉风险线进入酉月", "归妹归魂反复", "四爻齐动高波动"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派都不支持整月直线下跌；以月令六亲流派主判先涨后跌，中段保留修复，后段防再次承压。",
    methodViews: teacherComparisons({
      direction: "先涨后跌",
      bingwu: "以财爻为价格主线：妻财戌土持世发动化官鬼申金，价格与资金最终转入风险线；三、四爻官鬼分别化财、化子孙，使中段仍有修复，所以不是直线下跌。",
      wolf: "按动爻层位拆节奏：初爻先动，前段仍有承接；三、四爻落在月中交接段，先释放压力再修复；五爻财化官把风险留到后段，符合先扬、回落、修复、再承压。",
      wanli: "以妻财为用神、子孙为财源：财持世化官是后段风险，两个官鬼发动后化财、化子孙又给出中途修复；相关地支日只作为波动窗口，不把它硬说成必涨必跌。",
      qiu: "以卦象和动爻取形：井为反复取用、下有承接，归妹兼归魂提示位置错配与冲高后回归；四爻齐动说明过程反复，整体更像先涨后跌而非单边崩落。",
    }),
    ichingEvidence: {
      primaryHexagram: "水风井",
      changingHexagram: "雷泽归妹（归魂）",
      notes: "原盘起卦于2026-08-29 15:22（申月、乙亥日，申酉空），初、三、四、五爻动。妻财戌土持世动化官鬼申金；官鬼酉金动化妻财丑土，官鬼申金动化子孙午火，妻财丑土动化子孙巳火。只录入原盘可见信息，不从图片外补造互卦或精确日期。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-29T15:40:00+08:00",
    lockedAt: "2026-08-29T15:40:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "META-M1-20260901-V1",
    assetId: "meta",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先跌后涨",
    upProbability: 41,
    sidewaysProbability: 32,
    downProbability: 27,
    summary:
      "水山蹇化风火家人，初爻与上爻动。蹇先示阻力、停滞和推进困难，家人则是风险释放后重新回到内部秩序。兄弟申金持世在秋金阶段偏强，前段资金分流和竞争压力不能忽略；但初、上两端均向妻财卯木转换，说明价格机会会在压力后重新显现，9月以先跌后涨、后段修复为主。",
    expectedPath:
      "9月1日至7日受阻震荡并测试承接 → 9月8日至14日酉月冲财，防止下探加速 → 9月15日至21日等待止跌和结构修复 → 9月22日至30日若财爻重新显现，则进入受限回升；若仍不能收复中枢，只按弱修复处理。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "下探后日线不再创新低，4H收回前一结构中枢且30分钟形成更高低点，才确认由蹇转入家人修复。",
    invalidationLevel: "若反弹持续不能收回前一结构中枢，或下跌继续放量扩张，则后段修复不成立并保持防守。",
    riskLevel: "中高",
    catalysts: ["初上爻双化妻财", "家人卦秩序修复", "大型科技资金回流"],
    risks: ["蹇卦前段受阻", "兄弟申金持世", "酉月冲妻财卯木", "修复不等于新主升"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派一致偏向先受阻、后修复；以月令六亲流派主判先跌后涨，但酉月冲财，后段先按受限反弹看待。",
    methodViews: teacherComparisons({
      direction: "先跌后涨",
      bingwu: "兄弟申金持世，秋金阶段资金分流和竞争先占上风；初爻父母辰土、上爻子孙子水均发动化妻财卯木，说明压力释放后价格条件重新出现。",
      wolf: "只有初爻与上爻发动，动力集中在月初和月末两个端点：本卦蹇先走阻塞，上爻再接变卦家人，适合拆成前段下探、中段等待、后段恢复秩序。",
      wanli: "妻财为用神而兄弟持世，前段先看分流压价；两处动爻最后都化妻财，支持后段修复，但卯财在酉月受冲，反弹高度必须由实际K线确认。",
      qiu: "蹇的核心是险阻难行，家人则从外部受阻回到内部秩序；初、上两端同化财，使卦象路径呈现先难后整，而不是一路向下。",
    }),
    ichingEvidence: {
      primaryHexagram: "水山蹇",
      changingHexagram: "风火家人",
      notes: "原盘起卦于2026-08-29 15:24（申月、乙亥日，申酉空），初爻、上爻动。兄弟申金持世；初爻父母辰土动化妻财卯木，上爻子孙子水动化妻财卯木。只录原盘可见信息，关键日由月卦结构推演而非截图明确点名。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-29T15:40:00+08:00",
    lockedAt: "2026-08-29T15:40:00+08:00",
    validationStatus: "UNVERIFIED",
  },
  {
    id: "NVDA-M1-20260901-V1",
    assetId: "nvda",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先跌后涨",
    upProbability: 43,
    sidewaysProbability: 33,
    downProbability: 24,
    summary:
      "艮为山六冲化雷风恒，二、四、上爻动。艮六冲先表现为停滞、反复和快速分歧，不宜把月初波动直接当成新趋势；变恒说明震荡清洗后才有机会形成更持续的方向。父母午火动化妻财亥水，变卦子孙酉金持世，秋金能生财水并缓解官鬼压力，因此9月以先跌后涨、后段逐步转强处理。",
    expectedPath:
      "9月1日至7日高位停滞与六冲震荡 → 9月8日至14日继续清洗并寻找低位承接 → 9月15日至21日等待子孙持世和财水条件确认 → 9月22日至30日若结构完成，转入较稳定回升；没有完成确认时不追涨。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "日线或4H结束下跌扩张、重新站回震荡中枢，30分钟回踩形成更高低点后，才确认恒卦的持续性开始生效。",
    invalidationLevel: "若月中以后仍连续破低且反弹不过中枢，说明艮六冲压力尚未完成，后段转强路线失效。",
    riskLevel: "中高",
    catalysts: ["父母午火化妻财亥水", "变卦子孙酉金持世", "恒卦持续性", "AI与半导体板块轮动"],
    risks: ["艮为山六冲", "上爻官鬼寅木化兄弟戌土", "月初停滞反复", "确认前追涨风险"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派一致认为先停、先洗、后稳；以月令六亲流派主判先跌后涨，恒卦的持续性必须等月中以后结构确认。",
    methodViews: teacherComparisons({
      direction: "先跌后涨",
      bingwu: "父母午火发动化妻财亥水，变卦子孙酉金持世，秋金环境能生财水并缓和官鬼；但官鬼寅木持世动化兄弟戌土，前段仍要先完成压力与分流。",
      wolf: "二、四、上爻依次覆盖前中后段：二爻先出现化财条件，四爻完成换手，上爻负责后段转换；艮六冲先打散结构，变恒后才可能形成持续方向。",
      wanli: "以妻财为价格用神、子孙为财源：父母化财与变卦子孙持世利于后段修复；官鬼持世化兄弟说明风险不会立刻消失，因此必须先跌或先洗再看财源接力。",
      qiu: "艮为止，六冲主快速分歧，先看停滞与震荡；变恒才是久与续，卦象顺序天然是先止、先乱、再稳定延续，故偏向先跌后涨。",
    }),
    ichingEvidence: {
      primaryHexagram: "艮为山（六冲）",
      changingHexagram: "雷风恒",
      notes: "原盘起卦于2026-08-29 15:25（申月、乙亥日，申酉空），二、四、上爻动。官鬼寅木持世动化兄弟戌土，父母午火动化妻财亥水，兄弟戌土动化父母午火；变卦子孙酉金持世。只录原盘可见信息，不虚构精确日卦。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-29T15:40:00+08:00",
    lockedAt: "2026-08-29T15:40:00+08:00",
    validationStatus: "UNVERIFIED",
  },
]);

export function listMonthlyLiuyaoForecasts20260829(assetId: "sandisk" | SupplementalKeyDateAssetId) {
  return MONTHLY_LIUYAO_FORECASTS_20260829.filter((row) => row.assetId === assetId);
}
