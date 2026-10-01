/** New dated editorial view. Never an execution plan or a replacement for a locked forecast. */
export const macdView = {
  id: "mstr-btc-macd-20261001",
  date: "2026-10-01",
  status: "RESEARCH_ONLY",
  originals: [
    { file: "mstr-weekly-original.png", width: 3786, height: 1827 },
    { file: "mstr-daily-original.png", width: 3786, height: 1827 },
  ],
  evidence: {
    mstrWeekly: { dif: -2.70, dea: -11.86, histogram: 9.16 },
    mstrDaily: { dif: 6.76, dea: 8.23, histogram: -1.46 },
    screenshotTimestamp: null,
    btcIndependentRecalculation: false,
  },
  sources: [
    { title: "Fidelity · MACD", url: "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd" },
    { title: "StockCharts · MACD", url: "https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/macd-moving-average-convergence-divergence-oscillator" },
    { title: "StockCharts · Zero-line crosses and swing points", url: "https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/macd-zero-line-crosses-with-swing-points" },
  ],
  zh: {
    title: "MSTR与比特币：周线修复到零轴附近，日线背离之后怎么看？",
    summary: "我的判断：接下来至少一个月，MSTR与比特币以回调、震荡下行为主。核心不是看到一根死叉就断言下跌，而是周线反弹进入零轴附近的检验区，小周期却开始出现上涨动能不足。中途可以有反弹，但在结构修复前，我不把反弹当成新一轮牛市的确认。",
    provenance: "易老师观点 · 发布于2026年10月1日。MSTR依据本人提供的周线、日线原图；BTC依据本人本次周线、日线与2日线观察。截图未提供完整采集日期，不作为10月1日实时行情；BTC对应指标未独立回算。",
    sections: [
      { heading: "一、先分清：周线回到零轴，是修复到关口，不是已经转牛", paragraphs: [
        "MACD零轴对应快慢均线之间的相对位置。此前下跌后，周线DIF从负值抬升、靠近零轴，说明下跌动能减弱、反弹在修复；但从零轴下方接近零轴，与站上零轴后持续扩张，并不是一回事。此时要看价格能不能突破周线压力、守住回踩，而不是只看线碰到了哪里。",
        "这张MSTR周线图显示DIF为−2.70、DEA为−11.86，柱体为+9.16。准确表述是DIF接近零轴、两条线仍在零轴下方，柱体转正；不能写成周线两条线已经同时站上零轴。周线动能确有改善，也因此存在继续反弹的可能。我的偏空判断来自大周期压力与小周期转弱的组合，而不是否认这段修复。",
      ] },
      { heading: "二、MSTR日线：反弹的价格高度与动能，开始不匹配", paragraphs: [
        "顶背离要比较同一级别、同一段反弹中对应的两个价格高点：价格抬高，MACD的对应高点却降低。图中近期反弹，我看到的就是这种动能跟不上价格的迹象；这与2024—2025年更远的高点比较不是同一回事。原图没有逐个标注对应峰值与日期，本文不虚构精确背离数值。",
        "日线图的DIF为6.76、DEA为8.23，柱体为−1.46，快线已经低于慢线：日线死叉是图中可读到的事实。背离是预警，死叉是动能转弱，跌破最近回踩低点、反抽不过，才是价格结构的进一步确认。日线刚转弱而周线仍在修复，这种不同步正是我担心反弹结束、转入数周调整的原因。",
        "观察价位按原图理解：151附近是当时的日线EMA20；130—135附近是当时的日线较慢均线区；171—184附近是当时的周线较慢均线压力区。均线会随时间移动，这些只是截图参考，不是当前固定买卖点。先看近期反弹结构是否失守，再看较慢均线区能否支撑。",
      ] },
      { heading: "三、对照比特币：不是相同数值，而是相似的周期矛盾", paragraphs: [
        "我对BTC的观察是：周线同样修复到零轴附近，但日线、2日线都有顶背离。对我而言，这意味着更大的反弹仍在推进，小周期却越来越难用同样的动能支撑新高，因此未来至少一个月我仍以回调情景为主。BTC没有在本文展示对应周线、2日线指标原图，故不把这一观察包装成独立量化验证，也不填造DIF、DEA读数。",
        "MSTR与BTC可以互相参照风险节奏，却不能按同一个百分比、同一天转折来推算。股票的融资、股本变化与估值溢价，也会让MSTR偏离BTC走势；多个周期的MACD都来源于价格，本身也不是三份独立的统计证据。要共同观察的是：高点能否继续抬升、回踩低点是否失守、反抽能否重新站稳。",
      ] },
      { heading: "四、回调一般几周？没有能直接套用的固定答案", paragraphs: [
        "我查阅了Fidelity的MACD说明、StockCharts的指标说明与零轴交叉交易示例。这些资料讨论零轴、背离、交叉及价格结构的配合，并没有给出针对“周线DIF接近零轴＋日线顶背离”这一组合的可引用回调周数或胜率。资料提到信号可能持续几天、几周乃至更久，说的是信号持续性，不能改写成这次调整通常会跌几周。",
        "所以，“至少一个月偏回调”是我这一次的市场判断，不是指标的普遍定律。本文用未来四周展示这一主要情景，每周复核一次：如果下行结构持续，调整可以延长；如果只是横盘消化、随后放量突破压力并守住回踩，就需要修正偏空观点。时间窗口是观察安排，不是到某天自动转涨。",
      ] },
      { heading: "五、未来一个月，我主要观察这条路径", paragraphs: [
        "主要情景：反弹遇阻后回落，先试近期支撑；中间出现反抽，但若不能收复原来的压力区，就继续回落、寻找下一层支撑。也就是说，震荡下行不等于每天都跌，更不等于一根长阴直接跌到最终目标。",
        "转弱分支：支撑失守、反抽无力，价格连续形成更低的高点与低点，调整继续延长。转强分支：突破并站稳近期反弹高点、回踩不破，日线动能重新扩张，周线修复也没有被破坏，届时不再机械坚持一个月看跌。",
        "9月28日MSTR文章中的101附近，仍只是原有回调路径里的条件性观察区，不是由MACD算出的必达目标。本篇不会把101或某个BTC价格画成保证到达的终点；是否走到深回调，要看前面的支撑失守和反抽失败有没有依次发生。",
      ] },
    ],
    chartCaptions: [
      "MSTR周线原图（未修改）：DIF靠近零轴，DEA仍在下方。点击查看完整原图。",
      "MSTR日线原图（未修改）：反弹后日线死叉；对应价格高点与动能需一起比较。",
      "跨周期结构示意：大周期修复到关口，小周期动能减弱，再由价格确认。不是实际MACD轨迹。",
      "MSTR未来四周模拟：空心蜡烛全部为人工示意，无价格刻度；上下高度不表示预测跌幅。",
      "BTC未来四周模拟：以回调为主要情景，保留转强、延长调整分支；不指定目标价或转折日。",
    ],
    disclaimer: "这是易老师的个人研究观点。原图是历史截图，模拟蜡烛是解释路径的图示，不是实时行情、精确未来四价或自动交易指令。本文不修改已锁定预测，也不触发自动交易。",
  },
  en: {
    title: "MSTR and Bitcoin: weekly MACD nears zero while shorter-term momentum diverges",
    summary: "My working view is a corrective, choppy-down phase for at least the next month in MSTR and Bitcoin. The concern is not a single bearish crossover: the weekly recovery is reaching a test area near the zero line while shorter-term momentum struggles to confirm price strength. Rallies can occur inside that correction; I do not treat them as confirmation of a new bull leg without a structural improvement.",
    provenance: "Teacher Yi’s Views · Published October 1, 2026. MSTR uses my supplied weekly and daily screenshots. Bitcoin uses my latest weekly, daily and two-day chart interpretation, not an independent indicator recalculation. The screenshots lack a full capture date and are not October 1 live quotes.",
    sections: [
      { heading: "1. Weekly recovery near zero is a test, not a completed bullish transition", paragraphs: [
        "The MACD zero line reflects the relationship between the fast and slow exponential moving averages. A weekly MACD line rising from negative territory toward zero shows a recovery in momentum. Approaching zero from below is different from sustaining a move above it. Price must still clear resistance and hold a subsequent retest.",
        "The MSTR weekly screenshot reads MACD/DIF −2.70, signal/DEA −11.86 and histogram +9.16. The MACD line is near zero, both lines remain below it, and the histogram is positive. It would be inaccurate to say both weekly lines have already moved above zero. Weekly momentum has improved, leaving room for a further rally; my corrective view rests on resistance plus shorter-term weakening, not on denying that recovery.",
      ] },
      { heading: "2. MSTR daily: price strength is losing its momentum confirmation", paragraphs: [
        "Bearish divergence compares two corresponding swing highs within the same timeframe: price makes a higher high while MACD makes a lower high. I see that warning in the recent rally, rather than simply comparing it with a distant 2024–2025 peak. The original image does not mark each paired peak and date, so this post does not manufacture precise divergence readings.",
        "The daily screenshot reads MACD/DIF 6.76, signal/DEA 8.23 and histogram −1.46: the MACD line is already below the signal line. Divergence warns of weakening; the bearish crossover confirms a momentum shift; a break of a recent pullback low followed by a failed recovery adds price confirmation. Daily weakening while the weekly chart is still recovering is the tension behind my multi-week corrective outlook.",
        "Screenshot references are roughly 151 for daily EMA20, 130–135 for the slower daily averages, and 171–184 for the slower weekly averages. These moving averages change over time. They are dated chart references, not fixed current entry or exit levels. First watch the recent rally structure, then whether the slower-average area provides support.",
      ] },
      { heading: "3. Bitcoin: a similar timeframe conflict, not identical indicator values", paragraphs: [
        "My Bitcoin reading is that weekly momentum is also recovering toward zero while the daily and two-day charts show bearish divergence. That supports my base case of at least a month of correction. The matching weekly and two-day indicator screenshots are not reproduced here; this remains my chart interpretation rather than an independently verified calculation. No Bitcoin MACD or signal values have been invented.",
        "MSTR and Bitcoin can inform each other’s risk rhythm, but not a one-for-one percentage move or a shared turning date. Financing, share issuance and valuation premiums can cause MSTR to diverge from Bitcoin. Nor are three price-derived MACD timeframes three independent statistical tests. The common questions are whether highs keep advancing, pullback lows hold, and attempted recoveries regain resistance.",
      ] },
      { heading: "4. How many weeks does it usually correct? No fixed rule established", paragraphs: [
        "I reviewed Fidelity’s MACD guide and StockCharts’ indicator and zero-line/swing-point explanations. They discuss divergences, crossovers and price confirmation, but provide no directly applicable correction-duration distribution or hit rate for this particular combination. References to signals lasting days, weeks or longer describe signal persistence, not how many weeks this correction must last.",
        "At least one month is therefore my present market view, not a universal property of MACD. The four-week drawings illustrate that view and provide a weekly review framework. Continued lower highs and lower lows could extend the correction. A sideways consolidation followed by a sustained breakout and successful retest would require revising it. The calendar is an observation window, not an automatic reversal date.",
      ] },
      { heading: "5. The path I will monitor over the next month", paragraphs: [
        "Base case: a rejection from resistance, a test of nearby support, an intervening bounce, and renewed weakness if that bounce cannot regain the lost area. Choppy downside does not mean a red candle every day or an immediate straight-line move to a final target.",
        "Weaker branch: support breaks, attempted recoveries fail, and lower highs and lows extend the adjustment. Stronger branch: price clears and holds the recent rally high, a retest succeeds, daily momentum expands again, and the weekly recovery remains intact. In that case I would not mechanically retain a month-long bearish view.",
        "The roughly $101 area in my September 28 MSTR post remains a conditional reference within that earlier corrective path, not a destination calculated from MACD. Neither $101 nor an invented Bitcoin price is drawn as a guaranteed endpoint. A deeper correction requires earlier support breaks and failed recoveries to occur first.",
      ] },
    ],
    chartCaptions: [
      "Original MSTR weekly screenshot, unchanged: MACD approaches zero; the signal line remains below. Open the full original.",
      "Original MSTR daily screenshot, unchanged: bearish crossover after the rally. Compare matching price and momentum peaks.",
      "Timeframe schematic: weekly recovery at a test area, shorter-term weakening, then price confirmation. Not actual MACD data.",
      "MSTR four-week illustration: all hollow candles are manually constructed. No price scale; height is not an expected return.",
      "Bitcoin four-week illustration: correction is the base case, with stronger and extended-weakness branches. No target or turning date.",
    ],
    disclaimer: "A personal research view by Teacher Yi. Originals are historical screenshots; constructed candles explain scenarios rather than live quotes or exact future OHLC. This post neither changes locked forecasts nor triggers automated trading.",
  },
} as const;

export type SketchBar = readonly [open: number, high: number, low: number, close: number];
/** Layout coordinates only: deliberately no currency, price/return axis or forecast dates. */
export const macdSketches: Record<"mstr" | "btc", readonly SketchBar[]> = {
  mstr: [[100, 105, 91, 95], [95, 98, 80, 84], [84, 96, 82, 92], [92, 95, 72, 77]],
  btc: [[100, 104, 92, 97], [97, 100, 83, 87], [87, 98, 84, 94], [94, 96, 77, 82]],
};
