export type FocusDailyRow = {
  date: string;
  marketState: "TRADING" | "CLOSED";
  direction: "偏多" | "偏弱" | "观察" | "休市";
  summary: string;
  confirmation: string;
};

export const GOOGLE_FOCUS_RESEARCH_20260808 = {
  assetId: "googl",
  symbol: "GOOGL",
  publishedAt: "2026-08-08T08:50:00+08:00",
  title: "Google：8月中旬至9月初是主要顺风段，9月后分歧抬升",
  publicSummary:
    "双框架交叉后，8月3日至9月3日总卦‘地泽临→地天泰’与四段周卦形成较强连续性：先决断起势，再修复回归，随后恒势延续，月底转为温和蓄势。9月开始分歧增大，10—11月复杂度上升，12月再出现改善窗口。",
  direction: "中期偏多",
  consensusStars: 5,
  coreWindow: "8月10日—9月6日",
  consistencyLabel: "高度连贯：启动 → 修复 → 延续 → 蓄势；中期总卦同时提醒后段并非直线主升",
  frameworks: [
    {
      id: "structure",
      label: "框架A：六亲 / 世应 / 财爻结构力",
      summary:
        "总卦与分段卦中，财爻并未持续受重克，申月对水财的生扶条件改善；兄弟、官鬼更多体现阶段抛压与事件扰动，而不是贯穿整段的持续空头力量。世应与动变更支持前段决断、后段承接。",
    },
    {
      id: "timeline",
      label: "框架B：本卦 → 变卦的时间轴",
      summary:
        "临→泰定总基调为逐步改善；夬→随对应起势后得到跟随；复→颐对应回归与养势；恒→咸对应趋势延续与市场共振；巽→小畜对应月底由强转稳、进入蓄势。",
    },
  ],
  sequence: [
    { period: "8/3—9/3 总卦", hexagram: "地泽临 → 地天泰（六合）", view: "总方向改善，先接近机会，再逐步走顺。" },
    { period: "8/10—8/16", hexagram: "泽天夬 → 泽雷随（归魂）", view: "决断、破局、起势；后段由市场跟随承接。" },
    { period: "8/17—8/23", hexagram: "地雷复（六合）→ 山雷颐（游魂）", view: "回归、修复、养势；更像回踩后的重新企稳。" },
    { period: "8/24—8/30", hexagram: "雷风恒 → 泽山咸", view: "持续性增强并出现共振，属于相对顺畅的趋势窗口。" },
    { period: "8/31—9/6", hexagram: "巽为风（六冲）→ 风天小畜", view: "仍有顺势惯性，但从推进切换到收敛、蓄势。" },
    { period: "9/1—10/1", hexagram: "泽地萃 → 天水讼（游魂）", view: "热度聚集后争议放大，涨跌分歧明显增大。" },
    { period: "10/1—11/1", hexagram: "山水蒙", view: "信息不清、重新定价，趋势把握度下降。" },
    { period: "11/1—12/1", hexagram: "水风井 → 天风姤", view: "底层支撑仍在，但事件和突发扰动加大。" },
    { period: "12/1—12/31", hexagram: "火天大有（归魂）→ 雷风恒", view: "年底重新转强，若市场确认，持续性优于10—11月。" },
    { period: "8/8—12/31 总卦", hexagram: "艮为山（六冲）→ 山水蒙", view: "对全年后段设置上限：有阶段行情，但不是一路无阻的单边牛市。" },
  ],
  daily: [
    { date: "2026-08-08", marketState: "CLOSED", direction: "休市", summary: "周末风险观察，不计入美股正式日度验证。", confirmation: "观察纳指期货、AI/监管消息，不作为正式交易日结论。" },
    { date: "2026-08-09", marketState: "CLOSED", direction: "休市", summary: "周末风险观察，为8/10开盘准备。", confirmation: "重点看周日晚风险偏好与盘前缺口。" },
    { date: "2026-08-10", marketState: "TRADING", direction: "偏多", summary: "夬卦周启动，倾向先表态、先选择方向。", confirmation: "若开盘回踩后快速收回，视为起势确认。" },
    { date: "2026-08-11", marketState: "TRADING", direction: "偏多", summary: "决断力量延续，突破或趋势扩展概率较高。", confirmation: "放量站稳前一交易日高点更佳。" },
    { date: "2026-08-12", marketState: "TRADING", direction: "偏多", summary: "趋势延续日，但追高性价比开始下降。", confirmation: "关注盘中回踩承接，而非单纯看高开。" },
    { date: "2026-08-13", marketState: "TRADING", direction: "观察", summary: "进入换手与分歧，强势中可能出现震荡。", confirmation: "守住短周期平台则仍属健康整理。" },
    { date: "2026-08-14", marketState: "TRADING", direction: "偏多", summary: "随卦意味增强，若前面未破坏结构，周尾仍偏修复上行。", confirmation: "关注收盘能否维持周内强势区。" },
    { date: "2026-08-15", marketState: "CLOSED", direction: "休市", summary: "周末风险观察。", confirmation: "不计入正式日度验证。" },
    { date: "2026-08-16", marketState: "CLOSED", direction: "休市", summary: "周末风险观察，切换至复卦阶段。", confirmation: "关注周一盘前是否出现情绪回撤。" },
    { date: "2026-08-17", marketState: "TRADING", direction: "观察", summary: "复卦开段，先看回归与重新定价，不急于追。", confirmation: "回踩不破、低点抬高是关键。" },
    { date: "2026-08-18", marketState: "TRADING", direction: "偏弱", summary: "允许二次回踩或试探低点，但并不等同趋势转空。", confirmation: "若跌后快速收回，反而符合‘复’的路径。" },
    { date: "2026-08-19", marketState: "TRADING", direction: "观察", summary: "企稳信号应逐步增加，进入修复确认区。", confirmation: "15分钟/1小时结构转正比盘中单根拉升更重要。" },
    { date: "2026-08-20", marketState: "TRADING", direction: "偏多", summary: "修复启动概率提高，低位承接开始兑现。", confirmation: "重新站稳周初平台视为有效。" },
    { date: "2026-08-21", marketState: "TRADING", direction: "偏多", summary: "颐卦养势，偏向把修复延续到周尾。", confirmation: "若量价平稳而非爆量冲顶，更有利后续。" },
    { date: "2026-08-22", marketState: "CLOSED", direction: "休市", summary: "周末风险观察。", confirmation: "不计入正式日度验证。" },
    { date: "2026-08-23", marketState: "CLOSED", direction: "休市", summary: "周末风险观察，准备进入恒卦趋势窗口。", confirmation: "关注周一盘前是否延续风险偏好。" },
    { date: "2026-08-24", marketState: "TRADING", direction: "偏多", summary: "恒卦周开启，趋势持续性明显增强。", confirmation: "回踩关键均线不破可视为顺势机会。" },
    { date: "2026-08-25", marketState: "TRADING", direction: "偏多", summary: "恒势延续，适合顺势而非逆势猜顶。", confirmation: "观察高点和低点是否同步抬升。" },
    { date: "2026-08-26", marketState: "TRADING", direction: "偏多", summary: "咸卦共振开始增强，可能出现本段加速窗口。", confirmation: "量价、纳指与大型科技共振时强度最高。" },
    { date: "2026-08-27", marketState: "TRADING", direction: "偏多", summary: "强势延续，但越靠近周尾越要观察获利盘。", confirmation: "不出现放量长上影则趋势仍健康。" },
    { date: "2026-08-28", marketState: "TRADING", direction: "观察", summary: "冲高震荡和分歧可能放大，适合锁定利润而非追涨。", confirmation: "收盘守住突破平台则不改变中期偏多。" },
    { date: "2026-08-29", marketState: "CLOSED", direction: "休市", summary: "周末风险观察。", confirmation: "不计入正式日度验证。" },
    { date: "2026-08-30", marketState: "CLOSED", direction: "休市", summary: "周末风险观察，准备进入巽→小畜收敛阶段。", confirmation: "观察周一是否高开后收敛。" },
    { date: "2026-08-31", marketState: "TRADING", direction: "观察", summary: "由强转稳，偏高位整固与蓄势，不再按加速日处理。", confirmation: "若守住8月下旬突破区，9月仍保留向上余量。" },
  ] as FocusDailyRow[],
  monthly: [
    { period: "9月", direction: "震荡", summary: "萃→讼：热度和共识先聚集，随后争议、监管/估值与获利盘博弈增加。" },
    { period: "10月", direction: "观察", summary: "山水蒙：重新定价、信息不清，降低趋势仓位，等市场给答案。" },
    { period: "11月", direction: "观察", summary: "井→姤：底层经营支撑仍在，但突发事件对价格的影响更大。" },
    { period: "12月", direction: "偏多", summary: "大有→恒：年底重新进入较好的收获与延续窗口，但仍需量价确认。" },
  ],
} as const;

export const SNDK_FOCUS_PROMO_20260808 = {
  assetId: "sndk",
  symbol: "SNDK",
  publishedAt: "2026-08-08T08:50:00+08:00",
  title: "SNDK：中期偏多，但8月下旬进入高波动兑现区",
  publicSummary:
    "双框架保留中期偏多结论，但SNDK比谷歌更依赖NAND价格与库存周期。8月10—13日偏修复，14日前后有转折风险；20—21日二次修复，24—25日可能形成第三次上冲或阶段高点，26—27日回撤压力明显，28—31日再观察修复。",
  direction: "中期偏多",
  consensusStars: 4,
  coreWindow: "8月20—25日",
  riskWindow: "8月26—27日",
} as const;
