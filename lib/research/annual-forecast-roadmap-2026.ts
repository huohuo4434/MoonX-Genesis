import type { OfficialDirection } from "@/lib/forecasts/formal-direction";

export const ANNUAL_FORECAST_ROADMAP_VERSION = "2026-08-25.v2" as const;
export const ANNUAL_FORECAST_FORWARD_FROM = "2026-08-25" as const;

export type AnnualForecastMonth = {
  month: "2026-09" | "2026-10" | "2026-11" | "2026-12";
  direction: OfficialDirection;
  confidence: "MEDIUM" | "LOW";
  note: string;
};

export type AnnualForecastRoadmap = {
  assetId: string;
  aliases: readonly string[];
  name: string;
  symbol: string;
  sourceAuthority: "TEACHER_ANNUAL" | "USER_ANNUAL";
  sourceCastDate: string | null;
  sourceHexagram: string;
  sourceDigest?: string;
  version: 1 | 2;
  publishedAt: string;
  locked: true;
  revisionReason: string;
  historicalScoringEligible: false;
  revisionHistory?: readonly {
    version: number;
    sourceHexagram: string;
    sourceDigest: string;
    publishedAt: string;
    supersededReason: string;
  }[];
  annualDirection: OfficialDirection;
  annualSummary: string;
  remainingYearPath: string;
  highMonthCandidates: readonly string[];
  lowMonthCandidates: readonly string[];
  months: readonly AnnualForecastMonth[];
};

type RoadmapSeed = Omit<AnnualForecastRoadmap, "aliases" | "version" | "publishedAt" | "locked" | "revisionReason" | "historicalScoringEligible"> & {
  aliases?: readonly string[];
};

const COMMON_LOCK = {
  version: 1 as const,
  publishedAt: "2026-08-25T12:30:00+08:00",
  locked: true as const,
  revisionReason: "启用年卦→月卦→周卦→日窗口的新层级体系；只重排2026-08-25之后的未来预期，既有已发布记录保留。",
  historicalScoringEligible: false as const,
};

function month(
  value: AnnualForecastMonth["month"],
  direction: OfficialDirection,
  note: string,
  confidence: AnnualForecastMonth["confidence"] = "LOW",
): AnnualForecastMonth {
  return { month: value, direction, note, confidence };
}

function record(seed: RoadmapSeed): AnnualForecastRoadmap {
  return Object.freeze({ ...seed, aliases: seed.aliases ?? [], ...COMMON_LOCK });
}

function revisedRecord(
  seed: RoadmapSeed,
  governance: Pick<AnnualForecastRoadmap, "version" | "publishedAt" | "revisionReason" | "revisionHistory">,
): AnnualForecastRoadmap {
  return Object.freeze({ ...seed, aliases: seed.aliases ?? [], ...COMMON_LOCK, ...governance });
}

/**
 * 正式年度层只负责年度环境和逐月候选，不直接制造周线、日线或交易点位。
 * 8月25日新补的年度盘从该日向前验证；1—8月不回填方向、不进入命中统计。
 */
export const ANNUAL_FORECAST_ROADMAPS_2026: readonly AnnualForecastRoadmap[] = [
  record({
    assetId: "btc", aliases: ["bitcoin"], name: "比特币", symbol: "BTC", sourceAuthority: "TEACHER_ANNUAL",
    sourceCastDate: null, sourceHexagram: "2026独立流年卦", annualDirection: "先跌后涨",
    annualSummary: "年度基准仍是上半年风险释放、三季度修复，9月属于剩余年度高位候选，随后防回吐。",
    remainingYearPath: "9月冲高与见高风险并存，10月偏弱，11月仍以整理为主，12月再观察修复。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [
      month("2026-09", "先涨后跌", "年度高点候选月；月卦若不同，以月卦细化并保留分歧。", "MEDIUM"),
      month("2026-10", "下跌", "见高后的风险释放候选。"),
      month("2026-11", "震荡下跌", "弱势整理，等待独立月卦确认。"),
      month("2026-12", "震荡", "年末修复条件尚不足，不提前写成单边上涨。"),
    ],
  }),
  record({
    assetId: "gold", name: "黄金", symbol: "GOLD", sourceAuthority: "TEACHER_ANNUAL",
    sourceCastDate: null, sourceHexagram: "2026独立流年卦", annualDirection: "先涨后跌",
    annualSummary: "年度强势主要集中在前半段，后半段以高位波动和逐步转弱为主。",
    remainingYearPath: "9月仍可能冲高，但越往后持续性越弱；10月承压，11—12月转入震荡与局部修复。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [
      month("2026-09", "先涨后跌", "高位冲击后防回落；奇门若继续提示上行，只提高关键窗关注，不取消回落风险。", "MEDIUM"),
      month("2026-10", "震荡下跌", "年度后半段压力延续。"),
      month("2026-11", "震荡", "方向收敛，等待月卦。"),
      month("2026-12", "震荡上涨", "弱修复候选，不等同于新主升。"),
    ],
  }),
  record({
    assetId: "eth", name: "以太坊", symbol: "ETH", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "坎为水（六冲）→山水蒙，上爻动", sourceDigest: "7831D28B572AD5DA0A7BD2B20BEC198FB90C1EB30261876A5D7DF9E0C970BA3E",
    annualDirection: "先涨后跌", annualSummary: "六冲主波动和反复，上爻动后入蒙，剩余年度宜把9月推进视为高风险末段，而不是稳定单边。",
    remainingYearPath: "9月冲高回落候选，10月继续消化，11月震荡筑底，12月才观察修复。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "推进后转弱候选。", "MEDIUM"), month("2026-10", "震荡下跌", "六冲后的风险消化。"), month("2026-11", "震荡", "蒙卦阶段以确认和整理为主。"), month("2026-12", "震荡上涨", "条件式修复候选。")],
  }),
  record({
    assetId: "hype", name: "HYPE", symbol: "HYPE", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "泽风大过（游魂）→泽山咸，二爻动", sourceDigest: "A9B008FA47066B17032AB29634332241FA37CCA3762756FD8E0284C6EB349CD6",
    annualDirection: "先涨后跌", annualSummary: "大过说明承载过重，转咸后重在市场响应；高弹性仍在，但越涨越要防拥挤交易。",
    remainingYearPath: "9月继续推进后回吐，10月去杠杆，11月盘整，12月才有修复候选。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10"],
    months: [month("2026-09", "先涨后跌", "强势末段与回吐并存。", "MEDIUM"), month("2026-10", "下跌", "大过后的减压候选。"), month("2026-11", "震荡", "等待重新形成响应。"), month("2026-12", "震荡上涨", "情绪修复候选。")],
  }),
  record({
    assetId: "sol", name: "Solana", symbol: "SOL", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "火泽睽→雷泽归妹（归魂），上爻动", sourceDigest: "A9CED71BB345DE052491751D52DC87E76FE4DED08DAD3BB6F0E8049D651DBFD1",
    annualDirection: "震荡下跌", annualSummary: "睽主分化，归妹与归魂不利把反弹当成稳定趋势；剩余年度以冲高失败和反复转弱为主。",
    remainingYearPath: "9月先涨后跌，10月弱势延续，11—12月仍以震荡修复观察为主。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "分化行情中的阶段高点候选。", "MEDIUM"), month("2026-10", "下跌", "归魂阶段偏弱。"), month("2026-11", "震荡下跌", "反弹持续性存疑。"), month("2026-12", "震荡", "等待新的月卦确认。")],
  }),
  record({
    assetId: "sp500", aliases: ["spx"], name: "标普500", symbol: "SPX", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "雷山小过（游魂），静卦", sourceDigest: "BEDE4A1DE9BB0E9642262204008256384012576F9B638DBCD9A95D6B34CA9FD9",
    annualDirection: "震荡", annualSummary: "小过适合小步调整，不支持把剩余年度直接写成大单边；游魂增加反复和消息扰动。",
    remainingYearPath: "9月偏弱震荡，10月继续反复，11月修复候选，12月回归区间。",
    highMonthCandidates: ["2026-11"], lowMonthCandidates: ["2026-09", "2026-10"],
    months: [month("2026-09", "震荡下跌", "波动放大但仍按小过处理。", "MEDIUM"), month("2026-10", "震荡", "方向不宜写死。"), month("2026-11", "震荡上涨", "阶段修复候选。"), month("2026-12", "震荡", "年末区间候选。")],
  }),
  record({
    assetId: "nasdaq-100", aliases: ["ndx"], name: "纳斯达克100", symbol: "NDX", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "乾为天（六冲）→天泽履，三爻动", sourceDigest: "349583551E0B1AE48F5C9680823ECA31522B098043B785F0DB561F60CDF90EB0",
    annualDirection: "先涨后跌", annualSummary: "乾卦有上行动能，但六冲与三爻的警惕性很强；转履后必须把高位推进视为踩风险边界。",
    remainingYearPath: "9月冲高回落，10月继续承压，11月先弱后修复，12月谨慎偏强。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "强势与高位风险并存。", "MEDIUM"), month("2026-10", "震荡下跌", "履险阶段。"), month("2026-11", "先跌后涨", "风险释放后的修复候选。"), month("2026-12", "震荡上涨", "修复延续但不视为无风险主升。")],
  }),
  record({
    assetId: "silver", name: "白银", symbol: "SILVER", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "地风升→水山蹇，二、五爻动", sourceDigest: "CF5BF41DCB984EBA559C8CFB880A59B2FBABD1A62E82E2177FF898C814AC39D3",
    annualDirection: "先涨后跌", annualSummary: "升说明仍有上行惯性，变蹇说明越到后段阻力越明确；适合寻找冲高后的转弱，而非追涨。",
    remainingYearPath: "9月冲高回落，10月阻滞偏弱，11月震荡，12月出现修复候选。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10"],
    months: [month("2026-09", "先涨后跌", "升至蹇的转换窗口。", "MEDIUM"), month("2026-10", "震荡下跌", "蹇象压力集中。"), month("2026-11", "震荡", "等待阻力消化。"), month("2026-12", "先跌后涨", "年末修复候选。")],
  }),
  record({
    assetId: "wti-crude", aliases: ["wti"], name: "WTI原油", symbol: "WTI", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "地山谦，静卦", sourceDigest: "3F226DB34D8A9672C9EF7B985727DF0D45C2DCC537D8BF6A2E8FD6B7126FB8BC",
    annualDirection: "震荡", annualSummary: "谦卦静而不躁，剩余年度以收敛、均衡和区间交易为主，不从年卦制造单边油价目标。",
    remainingYearPath: "9月区间，10月先弱后修复，11月温和偏强，12月再回震荡。",
    highMonthCandidates: ["2026-11"], lowMonthCandidates: ["2026-10"],
    months: [month("2026-09", "震荡", "谦卦主收敛。", "MEDIUM"), month("2026-10", "先跌后涨", "回落后再平衡候选。"), month("2026-11", "震荡上涨", "温和修复候选。"), month("2026-12", "震荡", "不追单边。")],
  }),
  record({
    assetId: "hstech", aliases: ["hang-seng"], name: "恒生科技", symbol: "HSTECH", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "天地否（六合），静卦", sourceDigest: "11B864756EB61B80AEF67D405CAD50E023A371E211856998F9B1F63DD956281A",
    annualDirection: "震荡下跌", annualSummary: "否主阻滞，六合又使区间黏着；不宜把反弹直接定义为趋势反转，需等待月周卦共同解除阻滞。",
    remainingYearPath: "9月偏弱，10月横向消化，11月先弱后修复，12月维持修复候选。",
    highMonthCandidates: ["2026-12"], lowMonthCandidates: ["2026-09", "2026-10"],
    months: [month("2026-09", "震荡下跌", "否象阻力仍在。", "MEDIUM"), month("2026-10", "震荡", "六合黏着，等待突破。"), month("2026-11", "先跌后涨", "解除阻滞候选。"), month("2026-12", "震荡上涨", "修复候选，仍需周卦确认。")],
  }),
  record({
    assetId: "cxmt", name: "长鑫科技", symbol: "CXMT", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "地火明夷（游魂）→震为雷（六冲），三、四爻动", sourceDigest: "7F74D7A20DFB9B2EEDCC1059320C22EECAA2715AEF490545DF211E8DCD62E155",
    annualDirection: "先跌后涨", annualSummary: "妻财午火发动化官鬼辰土，说明价格推进后容易转成压力；官鬼丑土持世发动化妻财午火，又保留压力释放后资金重新接掌的路径。明夷游魂转震卦六冲，年度环境以先压、剧烈换手和后续修复为主，不按平稳直线上涨处理。",
    remainingYearPath: "9月前中段修复、月底防兑现；10月继续消化估值压力；11月先弱后观察修复；12月保留震荡回升候选。",
    highMonthCandidates: ["2026-09", "2026-12"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "月卦与五张周卦把路径细化为前中段修复、月底转弱。", "MEDIUM"), month("2026-10", "震荡下跌", "财化鬼后的估值与风险消化候选。"), month("2026-11", "先跌后涨", "世鬼化财对应压力释放后的修复观察。"), month("2026-12", "震荡上涨", "震卦高波动中的条件式回升，不视为稳定主升。")],
  }),
  revisedRecord({
    assetId: "intel", aliases: ["intc"], name: "英特尔", symbol: "INTC", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "雷泽归妹（归魂、六冲）→兑为泽（六冲），二、五爻动", sourceDigest: "4F44D590567A2040AB3DBB3B9F1D559A25F34BB63F43076305C2A7CDB6CEA250",
    annualDirection: "震荡", annualSummary: "归妹与归魂提示阶段关系不稳，主变六冲进一步放大切换速度；新卦不再支持旧版‘缓慢稳定推进’，但六冲也不能机械等同全年单边下跌。",
    remainingYearPath: "9月仍按独立月周卦处理为先强后弱；10月重点观察六冲后的压力释放，11—12月暂列震荡与修复验证，不预写稳定主升。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "月卦与周卦拥有9月路径权；年卦只提高转折和波动警觉。", "MEDIUM"), month("2026-10", "震荡下跌", "双六冲后的压力释放候选。"), month("2026-11", "震荡", "等待独立月卦确认是否完成消化。"), month("2026-12", "震荡", "不从年卦提前制造稳定主升。")],
  }, {
    version: 2,
    publishedAt: "2026-08-25T19:56:00+08:00",
    revisionReason: "用户于2026-08-25 19:44重新起卦；新盘与18:41旧盘结构不同，因此建立V2，旧V1保留且不回写历史。",
    revisionHistory: [{
      version: 1,
      sourceHexagram: "风山渐（归魂），静卦",
      sourceDigest: "AFF725700EF98E4B1C2831A8488CD37289B6C76EDC27B25F0BBA5DC52B0060F9",
      publishedAt: "2026-08-25T12:30:00+08:00",
      supersededReason: "同日重新起卦后由V2接替；V1仅保留为修订历史。",
    }],
  }),
  record({
    assetId: "mu", name: "美光", symbol: "MU", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "离为火（六冲）→风山渐（归魂），初、四、五爻动", sourceDigest: "91DDA6DCEDCC307C5D765E2A60717891330CF4DD42EDFAA37CB3B631A31B9512",
    annualDirection: "先涨后跌", annualSummary: "离与六冲放大波动，多爻动后转渐；先处理过热和分歧，再看渐进修复。",
    remainingYearPath: "9月冲高回落，10月消化，11月先弱后稳，12月渐进修复。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "过热与六冲风险。", "MEDIUM"), month("2026-10", "震荡下跌", "波动释放。"), month("2026-11", "先跌后涨", "由离转渐的过渡。"), month("2026-12", "震荡上涨", "渐进修复。")],
  }),
  record({
    assetId: "sandisk", aliases: ["sndk"], name: "闪迪", symbol: "SNDK", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "风水涣→风火家人，初、二、三爻动", sourceDigest: "4D6097CB03A0AA685070AD6911125CEAEEF76EE85E491F7B89297F40CF6E6A68",
    annualDirection: "先涨后跌", annualSummary: "涣主筹码和情绪发散，低位多爻动后归于家人秩序；先防分散回吐，再看结构重建。",
    remainingYearPath: "9月双向波动并冲高回落，10月整理，11月先弱后稳，12月修复。",
    highMonthCandidates: ["2026-09"], lowMonthCandidates: ["2026-10", "2026-11"],
    months: [month("2026-09", "先涨后跌", "涣象分散，双峰后防回吐。", "MEDIUM"), month("2026-10", "震荡下跌", "结构重建前的整理。"), month("2026-11", "先跌后涨", "由涣入家人。"), month("2026-12", "震荡上涨", "秩序修复候选。")],
  }),
  record({
    assetId: "lite", name: "Lumentum", symbol: "LITE", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "火水未济→风地观，四、五爻动", sourceDigest: "950D7ED7DFB1FEF2FF69C6C79EE085E24D4B7AE9E42EC8F9C3797E82A5926105",
    annualDirection: "震荡上涨", annualSummary: "未济说明趋势尚未完成，四五爻有推进条件，转观后要边走边确认；方向偏上但不宜追求连续直线。",
    remainingYearPath: "9月震荡偏强，10月冲高整理，11月再修复，12月高位观察。",
    highMonthCandidates: ["2026-11", "2026-12"], lowMonthCandidates: ["2026-10"],
    months: [month("2026-09", "震荡上涨", "未济后段仍有推进条件。", "MEDIUM"), month("2026-10", "先涨后跌", "转观后的回看与确认。"), month("2026-11", "震荡上涨", "条件式推进。"), month("2026-12", "震荡", "高位观察。")],
  }),
  record({
    assetId: "nbis", name: "Nebius", symbol: "NBIS", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "雷风恒，静卦", sourceDigest: "FE3B942E506F040D9FD15EBB805EA38433AF3DD230A4B0F071A8CC2AF771E15A",
    annualDirection: "震荡上涨", annualSummary: "恒主延续与耐性，静卦不支持频繁翻向；先完成阶段压力，再延续中期修复。",
    remainingYearPath: "9月先压后强，10—11月延续修复，12月高位震荡。",
    highMonthCandidates: ["2026-11", "2026-12"], lowMonthCandidates: ["2026-09"],
    months: [month("2026-09", "先跌后涨", "先完成压力释放。", "MEDIUM"), month("2026-10", "震荡上涨", "恒象延续。"), month("2026-11", "上涨", "中期修复候选。"), month("2026-12", "震荡上涨", "延续但波动可能放大。")],
  }),
  record({
    assetId: "googl", aliases: ["google"], name: "谷歌", symbol: "GOOGL", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "风山渐（归魂）→巽为风（六冲），二爻动", sourceDigest: "3795E502FA2EADF1A9F1735A4B70F90841BAC7638EDD0C96D267BE10498AE287",
    annualDirection: "先涨后跌", annualSummary: "前段渐进，后转巽与六冲，说明趋势会被反复消息和资金风格打断；后段更重视回吐风险。",
    remainingYearPath: "9月温和推进，10月盘整，11月冲高回落，12月偏弱震荡。",
    highMonthCandidates: ["2026-11"], lowMonthCandidates: ["2026-12"],
    months: [month("2026-09", "震荡上涨", "渐进阶段。", "MEDIUM"), month("2026-10", "震荡", "等待六冲扰动显化。"), month("2026-11", "先涨后跌", "阶段高点候选。"), month("2026-12", "震荡下跌", "六冲后的反复偏弱。")],
  }),
  record({
    assetId: "spcx", name: "SPCX", symbol: "SPCX", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "地火明夷（游魂）→水火既济，五爻动", sourceDigest: "96C55DBD219D9D673EC62C406E8735E4677EC155BBC2337B8BAC5DD5407C9466",
    annualDirection: "先跌后涨", annualSummary: "明夷先藏锋、控风险，五爻动后至既济；修复可以出现，但既济也意味着完成后不宜继续外推。",
    remainingYearPath: "9月先弱后强，10月修复，11月见阶段完成风险，12月回归整理。",
    highMonthCandidates: ["2026-11"], lowMonthCandidates: ["2026-09"],
    months: [month("2026-09", "先跌后涨", "明夷后的修复起点。", "MEDIUM"), month("2026-10", "震荡上涨", "向既济推进。"), month("2026-11", "先涨后跌", "完成后的回吐风险。"), month("2026-12", "震荡下跌", "既济后不追高。")],
  }),
  record({
    assetId: "asteroid", aliases: ["asts"], name: "太空狗", symbol: "ASTS", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "地山谦→地水师（归魂），二、三爻动", sourceDigest: "292985C912D2D36251253E957B380AB423F07AD2DBA87929A50DD461EB37A004",
    annualDirection: "先跌后涨", annualSummary: "谦先压估值与情绪，转师后重在有组织的趋势；归魂提示后续仍可能回到原区间。",
    remainingYearPath: "9月先跌后涨，10月继续修复，11月冲高回吐，12月震荡。",
    highMonthCandidates: ["2026-11"], lowMonthCandidates: ["2026-09"],
    months: [month("2026-09", "先跌后涨", "谦后进入师的组织阶段。", "MEDIUM"), month("2026-10", "震荡上涨", "修复延续。"), month("2026-11", "先涨后跌", "归魂回吐候选。"), month("2026-12", "震荡", "回到区间后观察。")],
  }),
  record({
    assetId: "tencent", name: "腾讯", symbol: "0700.HK", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "火地晋（游魂）→离为火（六冲），初、三爻动", sourceDigest: "2B2EAAE5A19D94563B6A22D6F97990C0A3C4B74F9BF597863A2F8B685542BC9D",
    annualDirection: "先涨后跌", annualSummary: "晋有推进，但转离与六冲后波动和分歧加大；更像阶段修复后再整理。",
    remainingYearPath: "9月震荡修复，10月冲高回落，11月偏弱，12月回到区间。",
    highMonthCandidates: ["2026-10"], lowMonthCandidates: ["2026-11"],
    months: [month("2026-09", "震荡上涨", "晋卦推进候选。", "MEDIUM"), month("2026-10", "先涨后跌", "由晋转离的高波动窗口。"), month("2026-11", "震荡下跌", "六冲后的分歧。"), month("2026-12", "震荡", "等待新周期。")],
  }),
  record({
    assetId: "tsla", name: "特斯拉", symbol: "TSLA", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "山天大畜→风水涣，初、三、五爻动", sourceDigest: "FEDAB8D03278771DE58661897FE824A5FC72E88C88426FE85970489E59FEB440",
    annualDirection: "先跌后涨", annualSummary: "大畜先蓄势，多爻动后转涣；9月可以完成蓄势后的推进，但随后要防筹码重新发散。",
    remainingYearPath: "9月先跌后涨，10月冲高回落，11月弱势消化，12月震荡。",
    highMonthCandidates: ["2026-10"], lowMonthCandidates: ["2026-09", "2026-11"],
    months: [month("2026-09", "先跌后涨", "蓄势后的推进候选。", "MEDIUM"), month("2026-10", "先涨后跌", "由大畜转涣。"), month("2026-11", "震荡下跌", "筹码发散后的消化。"), month("2026-12", "震荡", "等待重新聚合。")],
  }),
  record({
    assetId: "msft", name: "微软", symbol: "MSFT", sourceAuthority: "USER_ANNUAL", sourceCastDate: "2026-08-25",
    sourceHexagram: "天雷无妄（六冲），静卦", sourceDigest: "004057EB51B66122E65A40687230E303CA7DD2D2B02D005717CE07702903F8E5",
    annualDirection: "震荡", annualSummary: "无妄不宜强行规划直线路径，六冲放大意外变化；剩余年度以风险控制和月周确认优先。",
    remainingYearPath: "9月偏弱震荡，10月先弱后稳，11月区间，12月条件式修复。",
    highMonthCandidates: ["2026-12"], lowMonthCandidates: ["2026-09", "2026-10"],
    months: [month("2026-09", "震荡下跌", "六冲下的意外风险。", "MEDIUM"), month("2026-10", "先跌后涨", "风险释放后的稳定候选。"), month("2026-11", "震荡", "不预设单边。"), month("2026-12", "震荡上涨", "条件式修复。")],
  }),
] as const;

const BY_ID = new Map<string, AnnualForecastRoadmap>();
for (const item of ANNUAL_FORECAST_ROADMAPS_2026) {
  BY_ID.set(item.assetId.toLowerCase(), item);
  BY_ID.set(item.symbol.toLowerCase(), item);
  for (const alias of item.aliases) BY_ID.set(alias.toLowerCase(), item);
}

export function getAnnualForecastRoadmap2026(assetId: string): AnnualForecastRoadmap | null {
  return BY_ID.get(assetId.trim().toLowerCase()) ?? null;
}

export function listAnnualForecastRoadmaps2026(): readonly AnnualForecastRoadmap[] {
  return ANNUAL_FORECAST_ROADMAPS_2026;
}

export function annualForecastToAdminRow(item: AnnualForecastRoadmap) {
  return {
    id: `ANNUAL-${item.assetId}-2026-V${item.version}`,
    assetId: item.assetId,
    horizon: "YEAR" as const,
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    direction: item.annualDirection,
    path: item.remainingYearPath,
    probabilityLabel: "年度层不使用伪精确概率",
    sourceLabel: "年度周期基准",
    status: "published",
    version: item.version,
    publishedAt: item.publishedAt,
    lockedAt: item.publishedAt,
  };
}
