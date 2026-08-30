import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

export const APPLE_AMAZON_LIUYAO_SOURCE_META_20260831 = Object.freeze({
  aapl: {
    annual: { capturedAt: "2026-08-31T06:56:00+08:00", sourceFile: "苹果/2026.jpg", question: "苹果 Apple，2026全年走势" },
    monthly: { capturedAt: "2026-08-31T06:55:00+08:00", sourceFile: "苹果/9月.jpg", question: "苹果 Apple，9月份走势" },
  },
  amzn: {
    annual: { capturedAt: "2026-08-31T06:51:00+08:00", sourceFile: "亚马逊/2026.jpg", question: "亚马逊 Amazon，2026全年走势" },
    monthly: { capturedAt: "2026-08-31T06:53:00+08:00", sourceFile: "亚马逊/9月.jpg", question: "亚马逊 Amazon，9月份走势" },
  },
});

type MethodView = NonNullable<ConvictionPeriodForecast["methodViews"]>[number];

function methodViews(input: {
  primary: Pick<MethodView, "direction" | "summary">;
  rhythm: Pick<MethodView, "direction" | "summary">;
  strength: Pick<MethodView, "direction" | "summary">;
  image: Pick<MethodView, "direction" | "summary">;
}): NonNullable<ConvictionPeriodForecast["methodViews"]> {
  return [
    { id: "monthly-relations-primary", label: "月令六亲流派（主判）", weight: 40, ...input.primary },
    { id: "moving-line-rhythm", label: "动爻节奏流派（复核）", weight: 25, ...input.rhythm },
    { id: "use-god-strength", label: "用神强弱流派（复核）", weight: 20, ...input.strength },
    { id: "hexagram-image", label: "卦象取形流派（复核）", weight: 15, ...input.image },
  ];
}

const MONTH_WEEKS = [
  ["2026-08-31", "2026-09-06"],
  ["2026-09-07", "2026-09-13"],
  ["2026-09-14", "2026-09-20"],
  ["2026-09-21", "2026-09-27"],
  ["2026-09-28", "2026-10-04"],
] as const;

function monthPath(
  hexagrams: readonly [string, string],
  rows: readonly [ConvictionPeriodForecast["direction"], string][],
): NonNullable<ConvictionPeriodForecast["calendarMonthPath"]> {
  return MONTH_WEEKS.map(([start, end], index) => ({
    period: `${start}/${end}`,
    labelZh: `${start.slice(5).replace("-", "/")}–${end.slice(5).replace("-", "/")}`,
    direction: rows[index]![0] as Exclude<ConvictionPeriodForecast["direction"], "待复核">,
    primaryHexagram: hexagrams[0],
    changingHexagram: hexagrams[1],
    summary: rows[index]![1],
    sourceNote: "月卦分段推演；不是独立周卦",
    riskNote: index === 4 ? "跨入10月的部分只保留9月卦余势，10月正式方向等待新周期证据。" : "周段只用于阅读月内节奏，不替代独立周卦。",
  }));
}

const PUBLISHED_AT = "2026-08-31T07:05:00+08:00";

export const APPLE_AMAZON_LIUYAO_FORECASTS_20260831: readonly ConvictionPeriodForecast[] = Object.freeze([
  {
    id: "AAPL-Y1-20260831-V1",
    assetId: "aapl",
    forecastType: "YEAR_1",
    periodStart: "2026-08-31",
    periodEnd: "2026-12-31",
    direction: "先涨后跌",
    upProbability: 34,
    sidewaysProbability: 36,
    downProbability: 30,
    summary: "风雷益化风火家人。益先给扩张与增益，但妻财辰土持世发动后转父母亥水，价格主线由财转入规则、成本与兑现；家人又强调回到内部秩序，因此剩余年度更像先有上行动能，后段收敛整理，而不是一路单边上涨。",
    expectedPath: "8月底至10月先延续增益和资金推动 → 中段高位反复、内部换手 → 11月至年底逐步收敛并防冲高回吐；若后段重新放量并守住回踩，再发布新版本确认延续。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "先出现上行扩张，随后日线或4H上攻衰减并跌回主要结构，才确认由前强转入后段收敛。",
    invalidationLevel: "若11月以后仍持续放量创新高且回踩不破，财转父母的后段压力没有兑现，则先涨后跌路线失效。",
    riskLevel: "中高",
    catalysts: ["益卦前段增益", "大型科技资金回流", "产品与服务生态"],
    risks: ["妻财持世发动后转父母", "家人卦后段收敛", "高位估值与资金兑现"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派都认可前段有增益、后段回归秩序；主判定为先涨后跌，所谓下跌更偏高位收敛与回吐，不预设单边崩落。",
    methodViews: methodViews({
      primary: { direction: "先涨后跌", summary: "以财爻为价格主线：妻财辰土持世发动，先有价格推动，但最终化父母亥水，后段更重规则、成本与兑现。" },
      rhythm: { direction: "先涨后跌", summary: "动爻落在内卦交接层，先把益卦的增量释放出来，再进入家人卦的内部整理，节奏是前扬后收。" },
      strength: { direction: "先涨后跌", summary: "财爻临世说明机会真实存在，但财动后离开财位；后段必须由新财源或实际K线重新确认，不能把前段强势无限外推。" },
      image: { direction: "先涨后跌", summary: "益主增益，家人主归序；卦序从向外扩张转向内部治理，形态更像先涨后整而非全年直线上行。" },
    }),
    ichingEvidence: {
      primaryHexagram: "风雷益",
      changingHexagram: "风火家人",
      notes: "原盘起卦于2026-08-31 06:56。妻财辰土持世发动化父母亥水；盘面另见妻财未土、子孙巳火、兄弟卯木。问题虽写2026全年，本前瞻版本只从起卦日记录到年底，不回填1月至8月。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "AAPL-M1-20260901-V1",
    assetId: "aapl",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先跌后涨",
    upProbability: 41,
    sidewaysProbability: 34,
    downProbability: 25,
    summary: "风泽中孚（游魂）化水泽节（六合）。上爻官鬼卯木发动化妻财子水，风险线最终转为价格机会，但位置在上爻，意味着修复偏后段；中孚游魂先有预期摇摆，节卦六合再把波动收回边界，所以9月主线为先跌后涨、反弹高度受限。",
    expectedPath: "9月1日至6日预期摇摆并测试承接 → 7日至13日酉月冲卯，压力与分歧放大 → 14日至20日等待官化财和止跌结构出现 → 21日至27日受限修复 → 月末按节卦边界观察能否延续。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "下探停止扩张、4H重新站回震荡中枢且30分钟形成更高低点后，才确认由中孚游魂转入节卦修复。",
    invalidationLevel: "若9月下旬仍连续破低或反弹始终不能收回中枢，官鬼化财没有兑现，先跌后涨路线失效。",
    riskLevel: "中高",
    catalysts: ["官鬼卯木化妻财子水", "节卦六合的收敛修复", "大型科技资金回流"],
    risks: ["中孚游魂预期反复", "酉月冲卯", "节卦限制反弹高度"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派一致认为先受压、后修复；正式月方向为先跌后涨，但节卦只允许受限回升，不等于无条件追涨。",
    methodViews: methodViews({
      primary: { direction: "先跌后涨", summary: "官鬼卯木在酉月先受冲并带来压力，发动后化妻财子水，说明风险释放后价格机会在后段重新出现。" },
      rhythm: { direction: "先跌后涨", summary: "唯一动爻在上爻，转换更靠后；前中段先走游魂反复，月底附近再看官化财的修复。" },
      strength: { direction: "先跌后涨", summary: "妻财子水本卦已现，官鬼又化同类财水；酉金能生水但冲卯，结构是先压制、后给财源，不支持月初直接追高。" },
      image: { direction: "先跌后涨", summary: "中孚游魂先摇摆，水泽节六合后收敛；卦象路径由不稳转为有边界的稳定，偏向先跌后涨。" },
    }),
    calendarMonthPath: monthPath(["风泽中孚（游魂）", "水泽节（六合）"], [
      ["震荡下跌", "月初预期摇摆，先测试承接，不把盘中反抽当成转强。"],
      ["震荡下跌", "酉月冲卯的压力窗口，防波动扩大与继续下探。"],
      ["先跌后涨", "风险释放后开始观察官化财与技术止跌是否同时出现。"],
      ["震荡上涨", "确认后进入受限修复，回踩优先于追涨。"],
      ["震荡", "节卦边界下以整理和月末确认收尾。"],
    ]),
    ichingEvidence: {
      primaryHexagram: "风泽中孚（游魂）",
      changingHexagram: "水泽节（六合）",
      notes: "原盘起卦于2026-08-31 06:55。上爻官鬼卯木发动化妻财子水；妻财子水、兄弟未土持世、父母巳火临应均据图片可见信息录入。没有独立周卦，五个周段均明确标为月卦分段推演。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "AMZN-Y1-20260831-V1",
    assetId: "amzn",
    forecastType: "YEAR_1",
    periodStart: "2026-08-31",
    periodEnd: "2026-12-31",
    direction: "先涨后跌",
    upProbability: 33,
    sidewaysProbability: 32,
    downProbability: 35,
    summary: "雷火丰化离为火（六冲）。丰先给扩张、热度和阶段繁盛，但动在上爻，已接近一段走势的末端；变离六冲使高位共识容易被打散。官鬼戌土最终化妻财巳火，仍保留冲高机会，却更像风险催化后的末端价格表现，剩余年度按先涨后跌、防丰后回吐处理。",
    expectedPath: "8月底至10月先看丰卦扩张和冲高 → 高位分歧逐步增加 → 11月至年底进入六冲式高波动与回吐；若冲高未发生而先下跌，则把前段上涨理解为弱修复而非机械等待高点。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "先出现冲高或强势修复，随后日线/4H上攻衰减并跌回主要结构，才确认丰后转弱。",
    invalidationLevel: "若年底前持续放量创新高且回踩不破，离六冲没有形成破坏，先涨后跌路线失效。",
    riskLevel: "高",
    catalysts: ["丰卦前段扩张", "官鬼化妻财", "云与AI业务预期"],
    risks: ["上爻末端位置", "离为火六冲", "高位共识与估值回吐"],
    consensusStars: 3,
    consensusLabel: "易老师综合取舍：主判、节奏和卦象三路都偏丰后回吐；用神强弱流派保留官化财的后段韧性，因此结论为先涨后跌但不是单边看空。",
    methodViews: methodViews({
      primary: { direction: "先涨后跌", summary: "财爻午火在内卦保留前段价格推动，官鬼戌土动后化财巳火；但动至上爻已偏末端，风险转财更像冲高完成而非新起点。" },
      rhythm: { direction: "先涨后跌", summary: "上爻发动把主要变化放在后段，丰先释放热度，随后六冲打散结构，节奏偏先扬后退。" },
      strength: { direction: "震荡上涨", summary: "妻财午火静守且官鬼最终化妻财巳火，价格用神没有完全断裂；即使后段回吐，也保留反复修复和再冲高的可能。" },
      image: { direction: "先涨后跌", summary: "丰为盛，盛至上爻容易过满；变离六冲主分散和快速反复，卦象更支持丰后回落。" },
    }),
    ichingEvidence: {
      primaryHexagram: "雷火丰",
      changingHexagram: "离为火（六冲）",
      notes: "原盘起卦于2026-08-31 06:51。上爻官鬼戌土发动化妻财巳火；父母申金持世，妻财午火、官鬼丑土临应据图片可见信息录入。问题虽写2026全年，本前瞻版本只从起卦日记录到年底。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "AMZN-M1-20260901-V1",
    assetId: "amzn",
    forecastType: "MONTH_1",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    direction: "先跌后涨",
    upProbability: 40,
    sidewaysProbability: 35,
    downProbability: 25,
    summary: "水山蹇化水风井。蹇先示推进受阻，妻财卯木伏于官鬼午火之下，月初价格机会不显；动爻由官鬼午火转子孙亥水，风险释放后出现财源和承接，变井又强调重新建立稳定供给，因此9月按先跌后涨、后段修复处理。",
    expectedPath: "9月1日至6日受阻并测试低位承接 → 7日至13日压力释放、易有下探 → 14日至20日官化子孙后等待止跌 → 21日至27日井卦承接逐步修复 → 月末观察修复能否升级。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "日线或4H停止破低、重新站回震荡中枢且30分钟回踩不破后，才确认由蹇转井。",
    invalidationLevel: "若9月下旬仍持续破低、反弹不能收回中枢，子孙财源与井卦承接没有兑现，先跌后涨路线失效。",
    riskLevel: "中高",
    catalysts: ["官鬼午火化子孙亥水", "井卦承接修复", "云与消费业务预期"],
    risks: ["蹇卦前段受阻", "妻财卯木伏藏", "酉月对卯财不利", "修复高度待确认"],
    consensusStars: 4,
    consensusLabel: "易老师综合取舍：四个流派一致偏向先受阻、后修复；月度正式方向为先跌后涨，但妻财伏藏，反弹必须由真实结构确认。",
    methodViews: methodViews({
      primary: { direction: "先跌后涨", summary: "妻财卯木伏在官鬼午火之下，酉月前段先压价格；官鬼发动化子孙亥水，风险释放后财源才重新出现。" },
      rhythm: { direction: "先跌后涨", summary: "动爻落在下卦，压力较早释放；蹇先难行，井后重建承接，月内节奏偏前压后修。" },
      strength: { direction: "先跌后涨", summary: "财爻伏藏而兄弟申金持世，前段分流压力较强；官化子孙为财源，支持风险释放后的回升。" },
      image: { direction: "先跌后涨", summary: "蹇是险阻，井是稳定取用；卦象从难行转为重建供给，天然偏向先跌后涨而非持续单边下跌。" },
    }),
    calendarMonthPath: monthPath(["水山蹇", "水风井"], [
      ["震荡下跌", "蹇卦前段受阻，先看下探与承接测试。"],
      ["震荡下跌", "妻财伏藏且酉月压卯，压力释放阶段仍偏弱。"],
      ["先跌后涨", "官鬼化子孙后开始观察止跌和财源恢复。"],
      ["震荡上涨", "井卦承接生效后进入受限修复。"],
      ["震荡", "月末确认修复能否升级，跨月部分不预设10月方向。"],
    ]),
    ichingEvidence: {
      primaryHexagram: "水山蹇",
      changingHexagram: "水风井",
      notes: "原盘起卦于2026-08-31 06:53。妻财卯木伏于官鬼午火，官鬼午火发动化子孙亥水；兄弟申金持世、父母辰土临应均据图片可见信息录入。没有独立周卦，五个周段均明确标为月卦分段推演。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
]);

export function listAppleAmazonLiuyaoForecasts20260831(assetId: "aapl" | "amzn") {
  return APPLE_AMAZON_LIUYAO_FORECASTS_20260831.filter((row) => row.assetId === assetId);
}
