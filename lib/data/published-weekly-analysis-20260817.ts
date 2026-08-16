/**
 * MOOX_CORE9_WEEK_20260817_V1
 *
 * Nine core-market weekly research for 2026-08-17 → 2026-08-23.
 * Restored from the user's original, pre-period Liu Yao screenshots supplied
 * before the target week. Raw screenshots are not bundled because they contain
 * personal casting-profile data.
 *
 * Direction rule: Teacher 01 (财爻/六亲旺衰) + Teacher 02
 * (主卦→变卦路径). Technical analysis has zero directional vote and is used
 * only for later entry/exit confirmation.
 */
import type {
  WeeklyAnalysisRecord,
  WeeklyBasisWeights,
} from "@/types/weekly-analysis";

const WEEK_START = "2026-08-17";
const WEEK_END = "2026-08-23";
const PUBLISHED_AT = "2026-08-16T18:35:00+08:00";

function liuyaoBasis(note: string): WeeklyBasisWeights {
  return {
    technical: 0,
    liuyao: 80,
    cycle: 20,
    qimen: 0,
    macro: 0,
    bazi: 0,
    note,
  };
}

export const WEEKLY_RESEARCH_BLEND_NOTE_20260817 = {
  zh: "本期九大核心市场全部恢复自此前已提供、且在目标周开始前完成的原始周卦。方向只由两位六爻老师方法与已锁定的大周期背景共同确定；技术、宏观和外部观点只负责支撑、压力、入场与风险，不得反向改写六爻方向。",
  en: "All nine core-market entries in this edition are restored from original Liu Yao castings completed before the target week. Direction is determined only by the two Liu Yao methods plus locked higher-timeframe context. Technical, macro and external views are execution/risk overlays and cannot rewrite the Liu Yao direction.",
} as const;

export const WEEKLY_SOURCE_VERIFICATION_NOTE_20260817 = {
  zh: "来源审计：原始起卦时间为2026年7月30日至8月2日，目标周期为2026年8月17日至23日。本次只是修复周度发布链路遗漏，不重新起卦、不使用当前行情事后改判；原图干支和卦名逐张核对。",
  en: "Source audit: the original castings were made from 30 Jul to 2 Aug 2026 for the target week of 17–23 Aug 2026. This release only repairs the missing weekly publication mapping; it does not recast or use subsequent market action to rewrite the forecast.",
} as const;

export const PUBLISHED_WEEKLY_ANALYSES_20260817: WeeklyAnalysisRecord[] = [
  {
    id: "WEEKLY-BTC-20260817-V1",
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    displaySymbol: "BTC",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡下跌",
    weeklyPath:
      "8月中旬若已经明显反弹，本周更容易进入高位兑现和震荡下压。泽水困先体现受阻，水风井只支持后段短暂稳定或修复，不改变整周偏弱；BTC与ETH出现明确强弱分化，BTC相对更弱。",
    headline: "BTC本周转弱：财爻空亡又受申月冲克，反弹后的兑现压力明显增加。",
    probabilities: { up: 20, flat: 25, down: 55 },
    strongWindow: "后半周若停止创新低，可观察井卦对应的短线稳定与修复",
    weakWindow: "周初至周中的高位兑现和震荡下压阶段",
    basisWeights: liuyaoBasis(
      "原卦：泽水困（六合）→水风井。老师01：妻财寅木持世但旬空，进入申月又受冲克；子孙亥水、官鬼午火发动后均化兄弟申酉金，抛压增强。老师02：困→井是先受阻、后寻找稳定来源，井只能解释后段修复，不能把整周改判上涨。共识星级：★★☆☆☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若本周持续创新高、回踩不破并形成日线级稳定突破，则震荡下跌失效；不能因单次盘中反抽提前改判。",
    confirmation:
      "偏弱路径需看到反弹力度下降、4小时结构转弱或高位回落；技术层只确认执行，不参与方向投票。",
    catalysts: ["困后井卦带来的短线稳定可能", "急跌后的技术性反抽"],
    risks: ["妻财寅木空亡并受申冲", "子孙化兄弟", "官鬼化兄弟", "BTC与ETH方向分化"],
    riskLevel: "高",
    confidence: 60,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-BTC-20260801-0925-WEEK-20260817",
      "BTC-W3-20260817-V2",
      "BTC-ETH-ALIGN-20260817-0823",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-ETH-20260817-V1",
    assetId: "eth",
    assetName: "以太坊",
    symbol: "ETH",
    displaySymbol: "ETH",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "财爻双现且戌土持世，支持延续修复和震荡抬升；但山雷颐为游魂，子孙巳火发动后受回头克，冲高后会反复回踩。ETH本周相对BTC更强，但不按平滑单边主升处理。",
    headline: "ETH本周相对偏强：财爻双现并持世，方向震荡向上，但游魂结构决定回踩频繁。",
    probabilities: { up: 45, flat: 33, down: 22 },
    strongWindow: "回踩不创新低、重新收回短线结构后的抬升阶段",
    weakWindow: "冲高后子孙动力受回头克时的快速回踩",
    basisWeights: liuyaoBasis(
      "原卦：山雷颐（游魂）→风雷益。老师01：妻财戌土持世、妻财辰土同现；兄弟寅木在申月受冲，克财作用下降，但子孙巳火动化父母子水并受回头克，上行动力反复。老师02：颐→益是先蓄养、后增益，方向偏上但游魂使持续性不足。共识星级：★★★★☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若回踩持续破低、财爻承接没有在价格结构中得到确认，则震荡上涨失效；单根大阳线不构成主升确认。",
    confirmation:
      "等待4小时低点抬高、回踩后重新站回压力区，才提高执行仓位；没有结构确认时不追。",
    catalysts: ["财爻戌土持世", "财爻辰土同现", "兄弟寅木受申月冲制", "颐→益的后段增益路径"],
    risks: ["游魂反复", "子孙动受回头克", "冲高后快速回踩"],
    riskLevel: "高",
    confidence: 68,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-ETH-20260731-2043-WEEK-20260817",
      "ETH-W3-20260817-V1",
      "BTC-ETH-ALIGN-20260817-0823",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-SPX-20260817-V1",
    assetId: "sp500",
    assetName: "标普500",
    symbol: "SPX",
    displaySymbol: "SPX",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡下跌",
    weeklyPath:
      "兑为泽静卦又逢六冲，高位多空容易快速互换；妻财卯木空亡并受申金克制，兄弟酉金得势，本周从8月中旬修复转入回撤。盘中反弹更偏减压，不视为新主升。",
    headline: "标普本周震荡偏下：财空受克、六冲放大分歧，反弹后仍需防回撤。",
    probabilities: { up: 24, flat: 36, down: 40 },
    strongWindow: "急跌后出现承接时的短线修复，不升级为正式看涨",
    weakWindow: "中旬反弹兑现后、周内结构重新转弱的阶段",
    basisWeights: liuyaoBasis(
      "原卦：兑为泽（六冲静卦）。老师01：妻财卯木空亡并受申月金克，兄弟酉金在申酉金气中得势，承接弱于抛压。老师02：兑有反弹和情绪修复，但静卦六冲缺少稳定延续，主路径是高位剧震后回撤。共识星级：★★★★☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若指数持续创新高且回踩不破、市场宽度同步改善，则震荡下跌失效；盘中冲高不等于失效。",
    confirmation:
      "等待反弹受阻、短线平台失守或回抽不能收复，才确认偏弱执行；技术只负责确认，不改六爻方向。",
    catalysts: ["急跌后的宽基资金承接", "六冲环境中的短线反抽"],
    risks: ["妻财卯木空亡", "申金克财", "兄弟酉金得势", "静卦六冲高波动"],
    riskLevel: "高",
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-SPX-20260801-1146-WEEK-20260817",
      "ORACLE-SPX-AUG-20260801",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-NDX-20260817-V1",
    assetId: "nasdaq-100",
    assetName: "纳斯达克100",
    symbol: "NDX",
    displaySymbol: "NDX",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "下跌",
    weeklyPath:
      "地火明夷先体现科技风险和光被遮蔽，妻财午火伏于兄弟亥水之下，申金又生亥水，飞神克伏财，是八月最弱窗口。泽火革只代表后段可能出现剧烈变盘或反抽，不自动等于趋势反转。",
    headline: "纳指本周看跌：伏财受兄弟压制，是八月最弱阶段；革卦只提示后段变盘。",
    probabilities: { up: 18, flat: 25, down: 57 },
    strongWindow: "大幅下探后革卦触发的短反抽或结构切换观察窗",
    weakWindow: "周初至周中的科技风险释放和下跌阶段",
    basisWeights: liuyaoBasis(
      "原卦：地火明夷（游魂）→泽火革。老师01：妻财午火伏在兄弟亥水之下，申月金生亥水，飞神克伏神；官鬼丑土持世发动化兄弟亥水，风险最终转为分流和抛压。老师02：明夷先受伤、革后变盘，革不是自动反转，必须先完成风险释放。共识星级：★★★★★。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若科技权重持续共振创新高、回踩后仍稳定站住，则下跌判断失效；一次超跌反弹不足以改判。",
    confirmation:
      "观察科技龙头反弹受阻、指数结构破位或回抽不能收复；若下探后出现完整反转结构，再停止追空。",
    catalysts: ["风险释放后的革卦变盘", "急跌后的技术反抽"],
    risks: ["伏财受兄弟亥水压制", "申金生兄弟水", "官鬼化兄弟", "明夷与游魂"],
    riskLevel: "高",
    confidence: 78,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-NDX-20260730-1624-WEEK-20260817",
      "ORACLE-NDX-AUG-20260801",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-SHCOMP-20260817-V1",
    assetId: "shanghai-composite",
    assetName: "上证指数",
    symbol: "000001.SS",
    displaySymbol: "SHCOMP",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath:
      "前半周仍可能下探和消化，但父母辰土发动化妻财卯木，风险、政策和结构力量最终向资金承接转换；兄弟申金持世转子孙亥水，也支持压力释放后修复。中后段回升概率高于继续单边下跌。",
    headline: "上证本周先探底后修复：父母化财，风险释放后承接条件改善。",
    probabilities: { up: 44, flat: 36, down: 20 },
    strongWindow: "前段下探完成、市场宽度和低点结构改善后的中后段修复",
    weakWindow: "周初继续消化前期压力、热点分化的阶段",
    basisWeights: liuyaoBasis(
      "原卦：泽山咸→水火既济。老师01：父母辰土发动化妻财卯木，兄弟申金持世转子孙亥水，支持风险释放后修复；同时子孙亥水动化兄弟申金，过程仍有分流。老师02：咸→既济是市场响应后逐步恢复秩序，路径更像先压后稳。共识星级：★★★★☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若下探后无法收回短线结构、市场宽度继续恶化并扩散，则探底回升失效；日期本身不是无脑买点。",
    confirmation:
      "等待低点不再下移、上涨家数改善并重新站回短线平台，再确认修复；A股只在上涨方向得到结构确认后参与。",
    catalysts: ["父母化财", "兄弟持世转子孙", "既济恢复秩序"],
    risks: ["子孙化兄弟造成分流", "轮动快", "修复力度可能弱于个股体验"],
    riskLevel: "中高",
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-SHCOMP-20260801-1336-WEEK-20260817",
      "ORACLE-SHCOMP-AUG-20260801-V2",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-HSTECH-20260817-V1",
    assetId: "hang-seng",
    assetName: "恒生科技",
    symbol: "HSTECH",
    displaySymbol: "HSTECH",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath:
      "风水涣先体现资金和情绪分散，坎为水六冲会放大周初下探与风险；但进入申月后子孙金增强，伏财酉金与化财申金的修复条件改善。因此正式路径是先释放风险、后修复，不是直接主升。",
    headline: "恒科本周先探底再修复：涣→坎六冲先释放风险，申月化财支持后段回升。",
    probabilities: { up: 42, flat: 35, down: 23 },
    strongWindow: "周初风险释放后、权重止跌并重新收回结构的修复阶段",
    weakWindow: "周初资金分散、坎卦六冲放大下探的阶段",
    basisWeights: liuyaoBasis(
      "原卦：风水涣→坎为水（六冲）。老师01：申月子孙金转旺，伏财酉金及变卦妻财申金增强，兄弟巳火失令，支持风险释放后的修复；父母动化官鬼仍保留压力。老师02：涣先散、坎再探险，必须先下探和洗盘，后段修复不能被理解成稳定主升。共识星级：★★★☆☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若坎卦风险持续扩散、指数连续破低且权重没有止跌，则探底回升失效；若下探后迅速收回，才提高修复权重。",
    confirmation:
      "等待主要权重停止创新低、回踩后重新站回短线结构；技术确认前不因日期提前抄底。",
    catalysts: ["申月子孙金增强", "伏财酉金及化财申金", "风险释放后的超跌修复"],
    risks: ["涣卦资金分散", "坎为水六冲", "父母动化官鬼", "修复持续性不足"],
    riskLevel: "高",
    confidence: 66,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-HSTECH-20260801-1340-WEEK-20260817",
      "ORACLE-HSTECH-AUG-20260801",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-GOLD-20260817-V1",
    assetId: "gold",
    assetName: "国际金价",
    symbol: "GOLD",
    displaySymbol: "GC",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡下跌",
    weeklyPath:
      "风泽中孚游魂转风地观，市场由信心推动转向观察和等待。妻财子水伏于父母巳火之下，兄弟未土持世，反弹承接不足；本周偏震荡下压，盘中修复不改变偏弱背景。",
    headline: "黄金本周震荡偏弱：伏财受兄弟压制，中孚→观意味着反弹后转入观望。",
    probabilities: { up: 23, flat: 37, down: 40 },
    strongWindow: "急跌后出现承接时的短线修复，仍按逆势反弹管理",
    weakWindow: "反弹乏力、市场由中孚转观后的震荡下压阶段",
    basisWeights: liuyaoBasis(
      "原卦：风泽中孚（游魂）→风地观。老师01：妻财子水伏于父母巳火之下，兄弟未土持世，财未能主动显出；进入申月虽有金生水背景，但伏财仍受结构压制。老师02：中孚→观由信心转观察，动能减弱，更像反弹后整理偏下。共识星级：★★★★☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若黄金持续上破并在日线结构上稳定站住，则震荡下跌失效；短暂避险拉升不足以改判。",
    confirmation:
      "等待反弹受阻或重新跌回短线结构，才确认偏弱执行；关键价格由实时行情生成，不由卦象编造。",
    catalysts: ["急跌后的避险反抽", "申月金生伏财水的局部修复"],
    risks: ["妻财子水伏藏", "兄弟未土持世", "游魂反复", "中孚转观后动能减弱"],
    riskLevel: "高",
    confidence: 72,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-GOLD-20260801-1327-WEEK-20260817",
      "ORACLE-GOLD-AUG-20260801-V2",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-SILVER-20260817-V1",
    assetId: "silver",
    assetName: "国际银价",
    symbol: "SILVER",
    displaySymbol: "SI",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "震为雷六冲转雷天大壮六冲，方向偏强但振幅非常大。妻财戌土持世、妻财辰土发动且保留，兄弟寅木在申月受冲，克财作用下降；更像先震荡洗盘、再快速反弹，强攻后仍可能迅速回吐。",
    headline: "白银本周高波动偏多：双六冲先洗盘再强攻，绝不按平滑单边上涨处理。",
    probabilities: { up: 47, flat: 34, down: 19 },
    strongWindow: "洗盘后重新收回短线结构的大壮强攻阶段",
    weakWindow: "双六冲触发的急跌、假突破和快速回吐阶段",
    basisWeights: liuyaoBasis(
      "原卦：震为雷（六冲）→雷天大壮（六冲）。老师01：妻财戌土持世，妻财辰土发动后仍为财；兄弟寅木在申月受冲，克财减弱，但官鬼申金旺使波动和风险升高。老师02：震→大壮是先震动、后放大力量，双六冲决定急涨急跌而非稳定主升。共识星级：★★★★☆。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若震荡向下展开后持续破坏中期结构、反抽无法收回，则震荡上涨失效；单次急跌不自动等同趋势转空。",
    confirmation:
      "等待洗盘后低点抬高、重新收回短线平台，再确认大壮上攻；不在急拉末端追入。",
    catalysts: ["妻财持世和动财保留", "兄弟寅木受申月冲制", "大壮放大上攻弹性"],
    risks: ["震为雷与大壮双六冲", "官鬼申金旺", "急涨急跌", "强攻后快速回吐"],
    riskLevel: "高",
    confidence: 70,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-SILVER-20260802-1235-WEEK-20260817",
      "SILVER-FUTURE-20260817-0823",
      "SILVER-OVERLAP-AUDIT-20260802",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-WTI-20260817-V1",
    assetId: "wti-crude",
    assetName: "WTI原油",
    symbol: "WTI",
    displaySymbol: "CL",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "下跌",
    weeklyPath:
      "地火明夷代表继续受压，妻财午火伏在兄弟亥水之下，申金生亥水，飞神克伏财，是八月最弱窗口。山火贲六合只能解释后段修饰性反弹或暂时稳定，不足以确认趋势反转。",
    headline: "WTI本周看跌：伏财受兄弟压制，是八月最弱阶段；贲卦反弹只作修饰。",
    probabilities: { up: 18, flat: 27, down: 55 },
    strongWindow: "大幅下探后贲六合带来的短线稳定或修饰性反弹",
    weakWindow: "周初至周中的主要下跌和风险释放阶段",
    basisWeights: liuyaoBasis(
      "原卦：地火明夷（游魂）→山火贲（六合）。老师01：妻财午火伏于兄弟亥水之下，申月金生亥水，飞神克伏神；父母酉金发动化子孙寅木，但寅木受申冲，生财修复有限。老师02：明夷先受压，贲只是表面修饰和后段稳定，不能当作反转。共识星级：★★★★★。"
    ),
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若WTI持续上破关键压力并在日线稳定站住，则下跌判断失效；一段事件驱动反弹不足以改判。",
    confirmation:
      "观察反弹受阻、重新破坏短线结构或下跌趋势延续；下探过深后不追空，等待反抽确认。",
    catalysts: ["大跌后的空头回补", "贲六合的后段稳定"],
    risks: ["伏财午火受兄弟亥水压制", "申金生兄弟水", "明夷游魂", "反弹不等于反转"],
    riskLevel: "高",
    confidence: 78,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "USER-LIUYAO-WTI-20260801-1140-WEEK-20260817",
      "ORACLE-WTI-AUG-20260801",
    ],
    version: 1,
    originalLocked: true,
  },
];
