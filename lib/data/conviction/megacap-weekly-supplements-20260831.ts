import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import type { FormalDirection } from "@/lib/forecasts/formal-direction";

const PUBLISHED_AT = "2026-08-31T06:42:00+08:00";

type WeeklyInput = {
  id: string;
  assetId: "nvda" | "tencent";
  forecastType: ConvictionForecastType;
  periodStart: string;
  periodEnd: string;
  direction: FormalDirection;
  primaryHexagram: string;
  changingHexagram?: string | null;
  summary: string;
  expectedPath: string;
  confirmation: string;
  invalidation: string;
  notes: string;
  sourceFile: string;
};

function weekly(input: WeeklyInput): ConvictionPeriodForecast {
  const bearish = /下跌/u.test(input.direction);
  const bullish = /上涨/u.test(input.direction);
  return {
    id: input.id,
    assetId: input.assetId,
    forecastType: input.forecastType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    direction: input.direction,
    upProbability: bullish ? 45 : bearish ? 25 : 34,
    sidewaysProbability: bullish || bearish ? 35 : 44,
    downProbability: bearish ? 40 : bullish ? 20 : 22,
    summary: input.summary,
    expectedPath: input.expectedPath,
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: input.confirmation,
    invalidationLevel: input.invalidation,
    riskLevel: /六冲|游魂|困|讼|坎/u.test(`${input.primaryHexagram}${input.changingHexagram ?? ""}`) ? "高" : "中高",
    catalysts: [input.primaryHexagram, input.changingHexagram ?? "静卦", "板块与价格结构确认"],
    risks: ["周卦只定义方向和节奏，不提供机械下单点", "技术破位时优先控制风险"],
    ichingEvidence: {
      primaryHexagram: input.primaryHexagram,
      changingHexagram: input.changingHexagram ?? null,
      notes: `${input.notes} 原始截图：${input.sourceFile}。`,
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const MEGACAP_WEEKLY_SUPPLEMENTS_20260831: readonly ConvictionPeriodForecast[] = Object.freeze([
  {
    id: "NVDA-Y1-20260831-V1",
    assetId: "nvda",
    forecastType: "YEAR_1",
    periodStart: "2026-08-31",
    periodEnd: "2026-12-31",
    direction: "先涨后跌",
    upProbability: 38,
    sidewaysProbability: 37,
    downProbability: 25,
    summary: "风天小畜化巽为风六冲。小畜先聚、先蓄，财爻两现且初爻父母发动化财，说明剩余年度仍有资金推动和阶段抬升条件；但变卦六冲、兄弟持世，提示后段分歧和回吐会显著增加，不支持一路直线上涨。",
    expectedPath: "先积蓄与反复抬升 → 中段等待资金兑现 → 后段六冲放大分歧，防冲高后回吐。年卦只约束剩余年度背景，不覆盖独立月卦和周卦。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "阶段回踩不破主要中枢，财爻对应的资金承接持续，才确认小畜的蓄势仍在。",
    invalidationLevel: "若周线持续破低且反弹无法回到中枢，小畜的积蓄路线失效，直接按六冲风险处理。",
    riskLevel: "高",
    catalysts: ["小畜蓄势", "父母子水发动化妻财丑土", "AI与半导体资金轮动"],
    risks: ["变卦巽为风六冲", "兄弟卯木持世", "后段分歧与快速回吐"],
    ichingEvidence: {
      primaryHexagram: "风天小畜",
      changingHexagram: "巽为风（六冲）",
      notes: "2026-08-31 06:17起卦，问题为英伟达2026年全年走势；本记录从录入日向前验证，不回填1月至8月。初爻父母子水发动化妻财丑土，财爻未土临应，变卦兄弟卯木持世。原始截图：2026.jpg。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  weekly({
    id: "NVDA-W1-20260831-V1", assetId: "nvda", forecastType: "WEEK", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "先跌后涨",
    primaryHexagram: "水雷屯", changingHexagram: "水火既济",
    summary: "屯为始难，三爻财午火发动后化兄弟亥水，先有价格压力与筹码交换；既济代表困难之后结构有机会暂时完成，因此主路径是先压、再修复。",
    expectedPath: "周初承压并测试低位 → 周中完成换手 → 后段若收回中枢，转为修复上涨。",
    confirmation: "低点停止下移并重新站回周内中枢。", invalidation: "连续破低且周尾仍不能收回中枢。",
    notes: "2026-08-31 06:18起卦；三爻发动，原卦妻财午火伏于官鬼辰土之下。", sourceFile: "8.31-9.6.jpg",
  }),
  weekly({
    id: "NVDA-W2-20260907-V1", assetId: "nvda", forecastType: "WEEK_2", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡下跌",
    primaryHexagram: "泽水困（六合）", changingHexagram: null,
    summary: "困卦静而六合，财寅木持世但在金月承压，结构更像下行受困、反弹也受限；六合降低直线崩落概率，却会延长弱势整理。",
    expectedPath: "弱反弹与回压交替 → 重心缓慢下移 → 等待下一周解困。",
    confirmation: "反弹不过前高且低点继续下移。", invalidation: "放量站回前一周高点并连续守住。",
    notes: "2026-08-31 06:20起卦；静卦，妻财寅木持世。", sourceFile: "9.7-9.13.jpg",
  }),
  weekly({
    id: "NVDA-W3-20260914-V1", assetId: "nvda", forecastType: "WEEK_3", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "先跌后涨",
    primaryHexagram: "山水蒙", changingHexagram: "风水涣",
    summary: "蒙先代表方向不清和试错，变涣则有疏散阻力、释放压力之意；伏财酉金需要先等压力释放后才能显出，故偏向先弱后修复。",
    expectedPath: "前段继续试探或下压 → 中段释放阻力 → 后段观察能否形成修复。",
    confirmation: "下探后出现更高低点并收回中枢。", invalidation: "涣而不聚，反弹无量并再次破低。",
    notes: "2026-08-31 06:21起卦；玄武爻发动，妻财酉金伏于子孙戌土之下。", sourceFile: "9.14-9.20.jpg",
  }),
  weekly({
    id: "NVDA-W4-20260921-V1", assetId: "nvda", forecastType: "WEEK_4", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡",
    primaryHexagram: "天水讼（游魂）", changingHexagram: null,
    summary: "讼与游魂都强调分歧，妻财申金虽在盘中但兄弟午火持世，价格更容易围绕关键位反复争夺，方向确定性低。",
    expectedPath: "冲高与回落反复 → 中枢争夺 → 周末以前等待胜负确认。",
    confirmation: "有效突破争夺区并回踩守住。", invalidation: "上下沿均无法突破时继续维持震荡，不强判方向。",
    notes: "2026-08-31 06:23起卦；静卦，妻财申金在五爻，兄弟午火持世。", sourceFile: "9.21-9.27.jpg",
  }),
  weekly({
    id: "NVDA-W5-20260928-V1", assetId: "nvda", forecastType: "WEEK_5", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡",
    primaryHexagram: "坎为水（六冲）", changingHexagram: "兑为泽（六冲）",
    summary: "主变卦均为六冲，代表快速反向和宽幅波动；由坎到兑有风险释放后的情绪修复，但不足以锁定单边上涨。",
    expectedPath: "先放大风险与振幅 → 快速反抽 → 仍可能再次反向，按宽幅震荡处理。",
    confirmation: "二次回踩不破并形成稳定中枢后，才把修复升级。", invalidation: "任一方向突破后无法回踩确认，继续按假突破和六冲处理。",
    notes: "2026-08-31 06:24起卦；主卦与变卦均为六冲，父母申金、子孙寅木发动。", sourceFile: "9.28-10.4.jpg",
  }),
  weekly({
    id: "TENCENT-W4-20260831-V1", assetId: "tencent", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡上涨",
    primaryHexagram: "泽雷随（归魂）", changingHexagram: "泽地萃",
    summary: "随先顺势，萃后聚集，父母子水发动后化财未土；归魂限制追涨速度，但资金与筹码有重新聚拢倾向，按震荡偏上处理。",
    expectedPath: "先跟随市场震荡 → 中段资金聚拢 → 后段若恒生科技不转弱，重心缓慢抬升。",
    confirmation: "回踩守住平台且恒生科技同步止跌。", invalidation: "放量跌破平台并出现板块共跌。",
    notes: "2026-08-31 06:26起卦；初爻父母子水发动，变卦妻财未土。", sourceFile: "8.31-9.6.jpg",
  }),
  weekly({
    id: "TENCENT-W5-20260907-V1", assetId: "tencent", forecastType: "WEEK_5", periodStart: "2026-09-07", periodEnd: "2026-09-13", direction: "震荡",
    primaryHexagram: "风泽中孚（游魂）", changingHexagram: null,
    summary: "中孚静卦重在信用与等待确认，但游魂降低持续性；财子水伏于父母巳火之下，价格承接尚未完全显出，适合按区间震荡处理。",
    expectedPath: "围绕平台反复 → 等财爻承接显出 → 未确认前不追突破。",
    confirmation: "成交与价格同步站上区间上沿。", invalidation: "跌破区间下沿且反抽无力。",
    notes: "2026-08-31 06:27起卦；静卦，兄弟未土持世，妻财子水伏于父母巳火之下。", sourceFile: "9.1-9.13.jpg",
  }),
  weekly({
    id: "TENCENT-W6-20260914-V1", assetId: "tencent", forecastType: "WEEK_6", periodStart: "2026-09-14", periodEnd: "2026-09-20", direction: "先跌后涨",
    primaryHexagram: "天雷无妄（六冲）", changingHexagram: "泽雷随（归魂）",
    summary: "无妄六冲先放大突发波动，变随归魂后重新跟随原有资金锚；财戌土发动化财未土，财线未断，因此更像先冲击、后修复。",
    expectedPath: "前段突发下压或宽幅洗盘 → 中段寻找旧锚 → 后段跟随修复。",
    confirmation: "急跌后迅速收回并形成更高低点。", invalidation: "冲击后无法收回，财线承接失效。",
    notes: "2026-08-31 06:28起卦；上爻妻财戌土发动化妻财未土。", sourceFile: "9.14-9.20.jpg",
  }),
  weekly({
    id: "TENCENT-W7-20260921-V1", assetId: "tencent", forecastType: "WEEK_7", periodStart: "2026-09-21", periodEnd: "2026-09-27", direction: "震荡上涨",
    primaryHexagram: "震为雷（六冲）", changingHexagram: null,
    summary: "震六冲代表振幅放大，但财戌土持世、财辰土临应，价格主线仍有承接；因此不是平稳上涨，而是高波动中的震荡偏强。",
    expectedPath: "快速波动与洗盘 → 财线承接确认 → 重心偏上但不追单根急拉。",
    confirmation: "急跌有承接且周线低点不下移。", invalidation: "财线失守、周线放量破低。",
    notes: "2026-08-31 06:29起卦；静卦，妻财戌土持世、妻财辰土临应。", sourceFile: "9.21-9.27.jpg",
  }),
  weekly({
    id: "TENCENT-W8-20260928-V1", assetId: "tencent", forecastType: "WEEK_8", periodStart: "2026-09-28", periodEnd: "2026-10-04", direction: "震荡上涨",
    primaryHexagram: "水风井", changingHexagram: "水泽节（六合）",
    summary: "井卦保有基础与现金流，动爻又见财线，变节六合说明上涨仍受节制、速度有限；整体偏向有承接的震荡抬升。",
    expectedPath: "基础承接 → 中段修复抬升 → 节卦限制追涨空间，周末防止冲高收敛。",
    confirmation: "平台抬高且回踩缩量。", invalidation: "跌破井卦基础区并持续放量。",
    notes: "2026-08-31 06:31起卦；妻财戌土持世，多爻发动，变卦水泽节六合。", sourceFile: "9.28-10.4.jpg",
  }),
]);

export function listMegacapWeeklySupplements20260831(assetId: "nvda" | "tencent") {
  return MEGACAP_WEEKLY_SUPPLEMENTS_20260831.filter((row) => row.assetId === assetId);
}
