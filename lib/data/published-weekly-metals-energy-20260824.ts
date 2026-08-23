import type { WeeklyAnalysisRecord, WeeklyOverallDirection } from "@/types/weekly-analysis";

const PUBLISHED_AT = "2026-08-24T12:30:00+08:00";

type FutureWeeklyInput = {
  id: string;
  assetId: "gold" | "silver" | "wti-crude";
  assetName: string;
  symbol: string;
  displaySymbol: string;
  weekStart: string;
  weekEnd: string;
  direction: WeeklyOverallDirection;
  probabilities: WeeklyAnalysisRecord["probabilities"];
  headline: string;
  path: string;
  hexagrams: string;
  monthlyRelation: string;
  invalidation: string;
  catalysts: string[];
  risks: string[];
  confidence: number;
  sourceId: string;
};

function futureWeekly(input: FutureWeeklyInput): WeeklyAnalysisRecord {
  return {
    id: input.id,
    assetId: input.assetId,
    assetName: input.assetName,
    symbol: input.symbol,
    displaySymbol: input.displaySymbol,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    overallDirection: input.direction,
    weeklyPath: input.path,
    headline: input.headline,
    probabilities: input.probabilities,
    basisWeights: {
      technical: 0,
      liuyao: 80,
      cycle: 20,
      qimen: 0,
      macro: 0,
      bazi: 0,
      note: `${input.hexagrams}。${input.monthlyRelation} 本期没有同周期奇门盘，不标记双方法共振；技术面只确认结构与失效。`,
    },
    keySupport: [],
    keyResistance: [],
    invalidation: input.invalidation,
    confirmation: "先核对周卦方向与真实周线/4小时结构，再用30分钟和5分钟确认入场；卦象不生成固定价格点位。",
    catalysts: input.catalysts,
    risks: [...input.risks, "缺少同周期奇门盘", "价格结构未确认前不进入执行"],
    riskLevel: "高",
    confidence: input.confidence,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [input.sourceId, "MOOX-USER-CAST-20260824", "WOLF-METHOD-RULEBOOK-20260824"],
    version: 1,
    originalLocked: true,
  };
}

/**
 * User-cast complete weekly charts, interpreted with the locked teacher method.
 * These records are second priority to any later complete same-period teacher
 * chart and never fabricate a daily chart or a Qimen vote.
 */
export const WEEKLY_METALS_ENERGY_20260824: WeeklyAnalysisRecord[] = [
  futureWeekly({
    id: "WEEKLY-GOLD-20260831-V1",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: "2026-08-31", weekEnd: "2026-09-06", direction: "震荡",
    probabilities: { up: 32, flat: 46, down: 22 },
    headline: "黄金先看随势震荡：财爻在世应两端，但静卦不支持凭空判定加速。",
    path: "泽雷随归魂为静卦，妻财分别临世、应，说明价格更容易跟随已经形成的市场主结构，而不是由卦内动爻主动开启新趋势。九月月卦偏弱背景仍在，因此本周不直接写成上涨；若真实趋势向上，只按震荡跟随处理，若结构转弱则服从月度压力。",
    hexagrams: "周卦泽雷随（归魂），静卦，财爻临世应",
    monthlyRelation: "与九月震荡下跌月卦并非同向，按分歧降置信；月卦定背景、周卦保持中性。",
    invalidation: "若周线与4小时同时形成明确单边突破或破位，静卦随势震荡路径失效，等待新版本而不事后改写。",
    catalysts: ["财爻临世应", "既有趋势延续"], risks: ["归魂反复", "月周方向分歧"], confidence: 58,
    sourceId: "USER-GOLD-20260831-0906-ZE-LEI-SUI",
  }),
  futureWeekly({
    id: "WEEKLY-SILVER-20260831-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: "2026-08-31", weekEnd: "2026-09-06", direction: "先涨后跌",
    probabilities: { up: 34, flat: 31, down: 35 },
    headline: "白银先推升后受蓄：前段有序上行，后段防约束和回吐。",
    path: "风火家人变山天大畜，先按家人的有序推进处理，后按大畜的蓄止和约束处理。世爻妻财发动后化兄弟，价格力量后段转为竞争与兑现，因此正式顺序是先涨后跌，而不是整周单边看多。",
    hexagrams: "周卦风火家人→山天大畜，世财发动后化兄弟",
    monthlyRelation: "这是九月银价先强后弱路线的第一段，与月度汇总结论一致。",
    invalidation: "若周后段仍持续放量上行且没有任何蓄止或回吐，先涨后跌路径失效。",
    catalysts: ["家人有序推进", "前段财爻发动"], risks: ["财化兄", "大畜约束", "白银高波动"], confidence: 64,
    sourceId: "USER-SILVER-20260831-0906-JIAREN-DACHU",
  }),
  futureWeekly({
    id: "WEEKLY-WTI-20260831-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: "2026-08-31", weekEnd: "2026-09-06", direction: "震荡下跌",
    probabilities: { up: 21, flat: 40, down: 39 },
    headline: "WTI谦后遇蹇：反弹斜率受限，周内重心偏弱。",
    path: "地山谦变水山蹇，先降斜率、后见阻碍；财爻伏藏，世爻发动后转兄弟，资金承接不占优势。允许盘中反抽，但正式方向为震荡下跌，不把单次修复定义为反转。",
    hexagrams: "周卦地山谦→水山蹇，财爻伏藏",
    monthlyRelation: "处于新酉月月卦正式生效前的承压过渡段，与后续高波动而非顺畅主升的背景一致。",
    invalidation: "若价格有效突破并站稳4小时主压力且回踩不破，震荡下跌路径失效。",
    catalysts: ["弱势后的短线反抽"], risks: ["谦转蹇", "财爻伏藏", "承接不足"], confidence: 63,
    sourceId: "USER-WTI-20260831-0906-QIAN-JIAN",
  }),

  futureWeekly({
    id: "WEEKLY-GOLD-20260907-V1",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: "2026-09-07", weekEnd: "2026-09-13", direction: "先涨后跌",
    probabilities: { up: 34, flat: 30, down: 36 },
    headline: "黄金恒久后过载：前段延续，后段防大过承压。",
    path: "雷风恒变泽风大过游魂，前段先按原趋势延续，后段进入承载过重与高位分歧。妻财在应位保留上行机会，但官鬼持世提高风险，正式顺序为先涨后跌。",
    hexagrams: "周卦雷风恒→泽风大过（游魂）",
    monthlyRelation: "后段转弱与九月震荡下跌月卦一致，前段上涨是月内反弹分支。",
    invalidation: "若后段没有波动放大且持续稳定抬高，大过承压分支失效。",
    catalysts: ["恒卦趋势延续", "财爻在应"], risks: ["大过过载", "官鬼持世", "游魂反复"], confidence: 63,
    sourceId: "USER-GOLD-20260907-0913-HENG-DAGUO",
  }),
  futureWeekly({
    id: "WEEKLY-SILVER-20260907-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: "2026-09-07", weekEnd: "2026-09-13", direction: "震荡上涨",
    probabilities: { up: 48, flat: 32, down: 20 },
    headline: "白银泰转乾：上行动能较强，但双重结构切换放大振幅。",
    path: "地天泰六合变乾为天六冲，先有通达与聚合，再转为强势但剧烈的六冲结构。周方向为震荡上涨，不追盘中急拉；六冲只说明波动加大，不能单独解释为必跌。",
    hexagrams: "周卦地天泰（六合）→乾为天（六冲）",
    monthlyRelation: "与九月前段偏强、后段转弱的月度路线一致，本周属于偏强段。",
    invalidation: "若聚合结构迅速破坏且持续跌破4小时主支撑，震荡上涨失效。",
    catalysts: ["泰卦聚合", "乾卦强动力"], risks: ["六合转六冲", "急涨急跌", "追高风险"], confidence: 66,
    sourceId: "USER-SILVER-20260907-0913-TAI-QIAN",
  }),
  futureWeekly({
    id: "WEEKLY-WTI-20260907-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: "2026-09-07", weekEnd: "2026-09-13", direction: "先涨后跌",
    probabilities: { up: 36, flat: 29, down: 35 },
    headline: "WTI强推后过热：先看反弹释放，后防六冲兑现。",
    path: "雷天大壮六冲变乾为天六冲，前段力量集中、允许快速上冲；双六冲和大壮过刚要求把后段作为过热兑现区。正式方向为先涨后跌，幅度与转折点必须由价格结构确认。",
    hexagrams: "周卦雷天大壮（六冲）→乾为天（六冲）",
    monthlyRelation: "对应酉月复到蒙的前段反弹与随后分歧，是月度先涨后跌路线的强波动起点。",
    invalidation: "若上冲后回踩始终不破且波动持续收敛，后段兑现分支失效。",
    catalysts: ["大壮强推", "乾卦动能"], risks: ["双六冲", "过刚易折", "地缘消息放大振幅"], confidence: 65,
    sourceId: "USER-WTI-20260907-0913-DAZHUANG-QIAN",
  }),

  futureWeekly({
    id: "WEEKLY-GOLD-20260914-V1",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: "2026-09-14", weekEnd: "2026-09-20", direction: "震荡上涨",
    probabilities: { up: 44, flat: 38, down: 18 },
    headline: "黄金鼎卦重整：周内偏修复，但不能覆盖整月偏弱背景。",
    path: "火风鼎静卦强调重整、换结构和重新定价，财爻明现而没有动爻制造反向冲击，因此本周按震荡上涨处理。静卦不支持把修复夸大为加速主升，月底背景仍需单独遵守。",
    hexagrams: "周卦火风鼎，静卦",
    monthlyRelation: "与九月月卦存在短周期逆向修复，按周卦管本周、月卦管整月，不互相抹掉。",
    invalidation: "若重整失败并持续跌破周初4小时结构，震荡上涨失效。",
    catalysts: ["鼎卦重整", "财爻明现"], risks: ["静卦动能有限", "月周方向分歧"], confidence: 60,
    sourceId: "USER-GOLD-20260914-0920-DING",
  }),
  futureWeekly({
    id: "WEEKLY-SILVER-20260914-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: "2026-09-14", weekEnd: "2026-09-20", direction: "先涨后跌",
    probabilities: { up: 35, flat: 29, down: 36 },
    headline: "白银夬后未济：先突破或冲高，后段回到未完成与分歧。",
    path: "泽天夬变火水未济，夬允许前段决断和突破，未济说明终局没有完成、承接不足。多爻发动放大振幅，因此正式路径为先涨后跌而非稳定突破。",
    hexagrams: "周卦泽天夬→火水未济，多爻发动",
    monthlyRelation: "这是九月由前段偏强转入后段走弱的交接周，与月度先涨后跌一致。",
    invalidation: "若突破后回踩确认并稳定站住，未济回落分支失效。",
    catalysts: ["夬卦突破", "前段资金集中"], risks: ["未济未完成", "多爻高波动", "假突破"], confidence: 65,
    sourceId: "USER-SILVER-20260914-0920-GUAI-WEIJI",
  }),
  futureWeekly({
    id: "WEEKLY-WTI-20260914-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: "2026-09-14", weekEnd: "2026-09-20", direction: "先跌后涨",
    probabilities: { up: 36, flat: 39, down: 25 },
    headline: "WTI蹇后渐：先处理阻力，再看缓慢修复。",
    path: "水山蹇变风山渐归魂，前段先有阻碍和回踩，后段逐步恢复；渐卦决定修复斜率较慢，归魂又限制持续性。正式顺序为先跌后涨，但不确认中期反转。",
    hexagrams: "周卦水山蹇→风山渐（归魂）",
    monthlyRelation: "属于酉月先涨后跌大路线中的中段修复支线，不改变后半月风险。",
    invalidation: "若前段破位后没有任何结构修复，先跌后涨失效。",
    catalysts: ["渐卦缓慢修复"], risks: ["蹇卦阻碍", "归魂反复", "修复斜率有限"], confidence: 61,
    sourceId: "USER-WTI-20260914-0920-JIAN-JIAN",
  }),

  futureWeekly({
    id: "WEEKLY-GOLD-20260921-V1",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: "2026-09-21", weekEnd: "2026-09-27", direction: "先跌后涨",
    probabilities: { up: 34, flat: 40, down: 26 },
    headline: "黄金否后颐：先受阻，风险释放后再修复。",
    path: "天地否六合变山雷颐游魂，前段先按否卦闭塞承压，后段按颐卦养护和修复处理。多爻发动提高路径复杂度，修复不等于回到稳定主升。",
    hexagrams: "周卦天地否（六合）→山雷颐（游魂）",
    monthlyRelation: "先压后修复与九月月卦的主路径一致。",
    invalidation: "若前段没有压力且持续突破，否卦承压分支失效；若下跌后无承接，后段修复分支失效。",
    catalysts: ["风险释放后的颐卦修复"], risks: ["否卦闭塞", "多爻高波动", "游魂反复"], confidence: 64,
    sourceId: "USER-GOLD-20260921-0927-PI-YI",
  }),
  futureWeekly({
    id: "WEEKLY-SILVER-20260921-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: "2026-09-21", weekEnd: "2026-09-27", direction: "震荡下跌",
    probabilities: { up: 21, flat: 39, down: 40 },
    headline: "白银观后损：先观察承接，后段重心偏弱。",
    path: "风地观变山泽损，观卦先等待结构确认，损卦再指向减损和资金收缩。财爻虽在，但变卦没有形成稳定扩张，正式方向为震荡下跌。",
    hexagrams: "周卦风地观→山泽损",
    monthlyRelation: "与九月后段走弱的月度路线一致。",
    invalidation: "若观察期后形成放量突破并稳定站住4小时压力，震荡下跌失效。",
    catalysts: ["下跌后的技术反抽"], risks: ["损卦减损", "资金收缩", "白银高波动"], confidence: 63,
    sourceId: "USER-SILVER-20260921-0927-GUAN-SUN",
  }),
  futureWeekly({
    id: "WEEKLY-WTI-20260921-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: "2026-09-21", weekEnd: "2026-09-27", direction: "震荡下跌",
    probabilities: { up: 20, flat: 40, down: 40 },
    headline: "WTI坎卦六冲：风险反复，重心偏弱但不押单边暴跌。",
    path: "坎为水六冲静卦，风险和反复是主状态；应位财火受水环境压制，世位兄弟水更强。周内允许急跌急反，但正式方向为震荡下跌，而不是连续崩落。",
    hexagrams: "周卦坎为水（六冲），静卦",
    monthlyRelation: "与酉月复后入蒙、后段风险上升的路线一致。",
    invalidation: "若价格有效突破并保持低波动上行，六冲偏弱路径失效。",
    catalysts: ["急跌后的短线回补"], risks: ["坎卦重险", "六冲高波动", "兄弟水压财"], confidence: 64,
    sourceId: "USER-WTI-20260921-0927-KAN",
  }),

  futureWeekly({
    id: "WEEKLY-GOLD-20260928-V1",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: "2026-09-28", weekEnd: "2026-10-04", direction: "震荡",
    probabilities: { up: 27, flat: 48, down: 25 },
    headline: "黄金未济静卦：月末结构未完成，先按震荡等待。",
    path: "火水未济静卦表示阶段尚未完成，兄弟爻在世应两端又提高资金分歧。周内可以反复试探，但没有动爻支持硬判单边，正式方向为震荡。",
    hexagrams: "周卦火水未济，静卦，兄弟爻临世应",
    monthlyRelation: "与九月月卦后段仍需修复确认的结论一致，但不把未济直接解释成继续下跌。",
    invalidation: "若形成完整周线单边突破或破位，未济震荡路径失效。",
    catalysts: ["结构重新平衡"], risks: ["未济未完成", "兄弟爻分歧", "跨月重新定价"], confidence: 57,
    sourceId: "USER-GOLD-20260928-1004-WEIJI",
  }),
  futureWeekly({
    id: "WEEKLY-SILVER-20260928-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: "2026-09-28", weekEnd: "2026-10-04", direction: "震荡下跌",
    probabilities: { up: 20, flat: 38, down: 42 },
    headline: "白银姤后蹇：突发相遇后转阻，跨月偏弱。",
    path: "天风姤变水山蹇，多爻发动说明周内会有突发波动或短促反弹，但终局进入蹇卦阻碍；财爻伏藏、兄弟力量增强，正式方向为震荡下跌。",
    hexagrams: "周卦天风姤→水山蹇，多爻发动，财爻伏藏",
    monthlyRelation: "延续九月后段走弱路线，并把风险带入十月初。",
    invalidation: "若突发上冲转为稳定趋势并站稳4小时主压力，震荡下跌失效。",
    catalysts: ["姤卦突发波动"], risks: ["蹇卦阻碍", "财爻伏藏", "跨月波动"], confidence: 65,
    sourceId: "USER-SILVER-20260928-1004-GOU-JIAN",
  }),
  futureWeekly({
    id: "WEEKLY-WTI-20260928-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: "2026-09-28", weekEnd: "2026-10-04", direction: "震荡",
    probabilities: { up: 27, flat: 48, down: 25 },
    headline: "WTI中孚游魂：等待可信突破，跨月先按震荡。",
    path: "风泽中孚游魂为静卦，核心是等待真实价格确认和资金信号一致；财爻伏藏、游魂反复使单边结论不可靠。正式方向为震荡，技术只负责识别哪一侧出现可信突破。",
    hexagrams: "周卦风泽中孚（游魂），静卦，财爻伏藏",
    monthlyRelation: "与酉月复到蒙的后段不确定性一致；长周期仍保留后续修复分支。",
    invalidation: "若4小时和周线同步形成有效突破或破位，中孚震荡路径失效。",
    catalysts: ["可信突破后的趋势跟随"], risks: ["游魂反复", "财爻伏藏", "跨月消息冲击"], confidence: 56,
    sourceId: "USER-WTI-20260928-1004-ZHONGFU",
  }),
];

export const WEEKLY_METALS_ENERGY_SOURCE_NOTE_20260824 = {
  zh: "本组黄金、白银、WTI周卦均来自8月24日完整原始排盘，按月卦定背景、周卦定当周方向、K线定幅度与位置的规则解读。没有同周期奇门盘，不标记共振；若后续收到同周期完整老师卦，以新版本修订并保留本版。",
  en: "These gold, silver and WTI weekly readings come from complete charts supplied on Aug 24. Monthly charts set context, weekly charts own the week, and price structure confirms magnitude and location. No same-period Qimen chart exists, so no resonance is claimed. A later complete same-period teacher chart may revise the active view without deleting this version.",
} as const;
