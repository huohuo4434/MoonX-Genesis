/**
 * MOOX financial Liu Yao doctrine distilled from the user's teacher notes.
 *
 * IMPORTANT:
 * - This file is research doctrine, not a calendar source.
 * - Hexagram names / general Yi-Jing imagery never receive an independent
 *   bullish/bearish vote in financial forecasts.
 * - Direction comes from the six-relative structure under the target
 *   month/day environment. Technical analysis is execution-only.
 */
export const TEACHER_FINANCE_LIUYAO_DOCTRINE = Object.freeze({
  version: "2026-08-09-v1",
  directionPriority: [
    "妻财为第一用神：先看财爻旺衰、得令失令、空破墓绝、伏现与动变。",
    "子孙为第二用神/原神：重点看能否生财，以及子孙自身是否得令、受克、空破。",
    "兄弟重点看克财与竞争/抛压；兄弟旺而克财通常不利，兄弟失势则克财能力下降。",
    "官鬼结合市场语境看风险、压力、政策/事件约束，并判断它对财、子孙的生克与动变。",
    "父母结合政策、消息、规则、宏观与信息环境判断；父母旺衰需与子孙、财爻联动解释。",
    "世应、飞伏、动爻、变爻、六合六冲、游魂归魂都必须服从六亲旺衰与目标月日环境综合判断。",
  ],
  calendarRules: [
    "月建按节气划分，不按公历每月1日机械切换。",
    "日辰、月建、旬空必须由确定性历法数据核验，禁止由语言模型猜测。",
    "跨周期预测必须用目标周期的月令/日辰复核，不把起卦当日旺衰机械外推到目标月。",
  ],
  interpretationRules: [
    "金融预测不能看到‘晋、升、益、大有’就直接判涨，也不能看到‘损、剥、困’就直接判跌。",
    "卦名、卦辞、爻辞只用于解释节奏、形态和风险背景；若与六亲旺衰冲突，不得反向改写金融方向。",
    "多周期同向视为共振；出现真实周期冲突必须明确展示，不能为了凑高星级而隐藏冲突。",
    "逐日节奏若没有独立日卦，只能标注为周卦时序拆分，不能伪装成逐日独立预测。",
  ],
  technicalRules: [
    "技术分析不参与方向判断。",
    "技术仅用于支撑、压力、确认、失效、入场和仓位风险管理。",
    "触发技术失效位意味着执行计划需要调整，不自动把玄学方向翻转。",
  ],
} as const);

export type TeacherFinanceLiuyaoDoctrine = typeof TEACHER_FINANCE_LIUYAO_DOCTRINE;
