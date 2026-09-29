// Dated editorial research only. Never import this illustrative dataset into forecasts or execution.
export type HistoricalBar = readonly [date: string, open: number, high: number, low: number, close: number];
export type ScenarioAsset = {
  id: string; name: readonly [string, string]; unit: string; calendar: "crypto" | "us" | "cn" | "hk";
  source: string; history: readonly HistoricalBar[]; levels: readonly number[];
  // Synthetic close coordinates for illustration, NOT observed or model-estimated future prices.
  illustrativeCloses: readonly number[]; weakEnd: number; strongEnd: number;
  zh: readonly [original: string, current: string, thisWeek: string, nextWeek: string, invalidation: string];
  en: readonly [original: string, current: string, thisWeek: string, nextWeek: string, invalidation: string];
};

export const twoWeekNote = {
  id: "two-week-scenarios-20260929", date: "2026-09-29", asOf: "2026-09-29T20:20:00+08:00", status: "RESEARCH_ONLY",
  zh: {
    title: "未来两周怎么走？九类资产的模拟K线与验证条件",
    summary: "本周先检验支撑，下周观察修复是否成立。BTC、ETH防范先探后修复，美股与半导体保留震荡反弹分支，A股和港股不把弱反弹当反转，黄金重点看区间下沿。观点有分歧，路径有条件。",
    provenance: "易老师整理 · 依据用户提供的两期外部研究字幕（9/28—10/3、10/5—10/10）及截至9/29 20:20北京时间读取的日线数据。不是把外部研究宣称为原创，也不是经过验证的统计预测模型。",
    method: "实心K线为所列来源的已收盘历史报价；橙色背景右侧为人工构造的模拟OHLC，空心蜡烛仅帮助理解阶段顺序。每根模拟蜡烛的开盘、影线、收盘和日期对应关系均不是精确预测、概率区间或真实行情。替代路径同样是示意，不保证其中任何一条发生。数据截止后未重新滚动校准。",
    timing: "行情口径：BTC/USD、ETH/USD综合报价，XAU/USD现货美元/盎司，其余均为现金指数点数，不能直接套用永续合约、ETF或期货。美股、币价、黄金历史截到9/28，9/29未收盘部分不绘制；A股、港股截到9/29。图中未来部分统一从9/30开始；美股/黄金按正常工作日、币价按自然日、A股按9/30和10/8—9、港股排除10/1及周末绘制。未开市日不补K线。",
    integrity: "原文不是两周全面看空：下周对美股偏震荡上涨，对BTC的探底窗口用了未来一至三周，不保证10/10前见底。上一期BTC判断失误也保留，不据此声称命中率。关于战争和黑天鹅的说法只是中期假设，不能当成已确认事件。奇门仅作时间观察参考，本篇不替代已锁定六爻方向。",
    tail: "BTC原文最终列出的78,000、74,000、68,000、62,000、58,000是不同深度候选，中间另提过76,000，不是逐层必到的两周目标。没有确认前不把65,000或更低价位设为默认路径。ETH没有原文明确价格目标。原油仅有10—11月中期讨论、品种和两周点位不足，本篇不补造原油模拟图。",
    disclaimer: "本篇为研究随笔与条件演示，不是买卖指令、收益保证或真实未来K线，不触发自动交易，不覆盖已锁定历史预测。支撑需承接、修复需收回压力、破位需观察反抽；未发生前一步，不机械套用下一步。任何后续修订另发新版本。",
  },
  en: {
    title: "The next two weeks: nine market scenarios in illustrative candlesticks",
    summary: "Test support first, then assess whether recovery develops. BTC and ETH may probe lower before repairing; equities and semiconductors retain a rebound branch. A-share and Hong Kong bounces need confirmation. Gold is testing the lower end of its range.",
    provenance: "Compiled by Teacher Yi from two user-supplied external research transcripts (Sep 28–Oct 3 and Oct 5–10) and daily price records reviewed as of Sep 29, 20:20 Beijing time. External research is not claimed as original work. This is not a statistically validated forecasting model.",
    method: "Filled candles are completed historical observations from the cited source. The orange-tinted future area contains manually constructed OHLC illustrations. Hollow candles explain a possible sequence, not exact future opens, wicks, closes or turning dates. Alternative paths are illustrations too, not probability intervals or promises. This dated snapshot does not update automatically.",
    timing: "BTC/USD and ETH/USD composite quotes; XAU/USD spot gold in USD/oz; all equity references are cash-index points, not ETF or futures prices. History ends Sep 28 for US markets, crypto and gold, and Sep 29 for mainland China and Hong Kong. Unfinished Sep 29 bars are omitted. Illustrations start Sep 30. Crypto uses calendar days, US/gold weekdays, mainland China Sep 30 and Oct 8–9, Hong Kong excludes Oct 1 and weekends. No candles are invented for closed sessions.",
    integrity: "The transcripts do not predict a synchronized two-week sell-off. The second favors choppy US equity gains and uses a one-to-three-week BTC bottom-search window, not a guaranteed bottom by Oct 10. The first acknowledges an earlier BTC forecasting error; no accuracy rate is inferred. War and black-swan claims remain medium-term hypotheses. Timing interpretations do not replace locked source-led directions.",
    tail: "The BTC transcript's final list—78,000, 74,000, 68,000, 62,000 and 58,000—contains alternative depths, not compulsory two-week targets; 76,000 was also mentioned earlier. A fall to 65,000 or below is not the default path. No exact ETH target was supplied. Oil discussion concerned October–November without a sufficiently defined two-week instrument/price framework, so no oil candles are fabricated.",
    disclaimer: "Research and conditional illustration only: not trade instructions, guaranteed returns or real future candles. No automated execution and no revision of locked historical forecasts. Support requires evidence of buying; recovery requires reclaiming resistance. Later stages are not assumed if earlier conditions fail. Revisions must be separately dated.",
  },
} as const;

export const scenarioAssets: readonly ScenarioAsset[] = [
  {
    id: "btc", name: ["比特币 BTC", "Bitcoin BTC"], unit: "USD", calendar: "crypto", source: "https://www.investing.com/crypto/bitcoin/historical-data",
    history: [["2026-09-23",86204.6,87270,83546.3,84394.4],["2026-09-24",84394.4,84894.4,82957,84405.2],["2026-09-25",84405.2,85245.4,83199.5,84097.5],["2026-09-26",84097.6,84450.9,83796.3,84450.9],["2026-09-27",84427.2,85128.7,84141.3,84456.2],["2026-09-28",84466.4,84992.4,82600.3,83507]],
    levels:[78000,82000,85300,87400], illustrativeCloses:[82900,83500,82000,82400,81800,81100,82200,83200,82500,84200,84800], weakEnd:78000, strongEnd:87400,
    zh:["本周原文：82,000—87,000宽幅震荡；下周原文：未来一至三周先探支撑、再看修复。", "9/28收83,507，低82,600；仍在原文区间内，不能提前宣布全面破位。", "剩余时段先看82,000—82,600支撑；反弹先观察84,900—85,300。", "图中主示意是先试支撑、再修复。若82,000失守且反抽收不回，先看80,900—81,400，再讨论78,000；不是必然V形反转。", "站回85,300并守住，继而突破87,000—87,400，会削弱短期偏空路径。修复需更高低点与反弹高点突破，不按日历机械抄底。"],
    en:["Transcript: 82,000–87,000 this week; a possible support search and recovery over the next one to three weeks.", "Sep 28 closed at 83,507 with an 82,600 low: still inside that range, not a confirmed broad breakdown.", "Watch 82,000–82,600 below and 84,900–85,300 on a rebound.", "The central illustration probes support before repair. A loss and failed reclaim of 82,000 shifts attention to 80,900–81,400, then 78,000. A V-shaped reversal is not assured.", "A sustained recovery above 85,300 and then 87,000–87,400 weakens the bearish branch. Require higher lows and a rebound-high break, not a calendar-based entry."],
  },
  {
    id:"eth", name:["以太坊 ETH","Ethereum ETH"], unit:"USD", calendar:"crypto", source:"https://www.investing.com/crypto/ethereum/historical-data",
    history:[["2026-09-23",2750.68,2788.38,2638.04,2684.67],["2026-09-24",2685.79,2703.72,2630.32,2687.86],["2026-09-25",2688.33,2742.47,2667.5,2691.53],["2026-09-26",2691.02,2697.54,2666.81,2696.29],["2026-09-27",2695.57,2720.97,2669.7,2687.81],["2026-09-28",2689.02,2720.24,2638.52,2688.91]],
    levels:[2440,2630,2740,2805], illustrativeCloses:[2660,2700,2640,2620,2645,2580,2630,2690,2660,2730,2760],weakEnd:2440,strongEnd:2805,
    zh:["原文短期有压力、较长周期偏乐观；没有给出ETH具体目标价。", "9/28收2,688.91，近期多次低点靠近2,630—2,640；本次不声称重新计算并确认MACD死叉。", "先看2,630支撑与2,740反弹压力，不把反弹自动当作新主升。", "守住可反复修复；若失守且收不回，则观察2,560—2,600，进一步转弱才看2,440—2,480。", "突破并守住2,790—2,805，会明显削弱偏弱情景。这些价位来自技术整理，不是原文作者给出的精确目标。"],
    en:["The transcripts see short-term pressure but remain constructive further out; no exact ETH target is given.", "Sep 28 close: 2,688.91. Recent lows cluster near 2,630–2,640. No newly calculated MACD bearish crossover is claimed.", "Watch support around 2,630 and initial rebound resistance near 2,740.", "Holding support permits repair. A failed reclaim shifts attention to 2,560–2,600, then 2,440–2,480 if weakness persists.", "Sustaining a break above 2,790–2,805 weakens the bearish scenario. These are technical reference zones, not exact transcript targets."],
  },
  {
    id:"spx", name:["标普500 SPX","S&P 500 SPX"],unit:"points",calendar:"us",source:"https://www.investing.com/indices/us-spx-500-historical-data",
    history:[["2026-09-22",7770.81,7782.19,7756.26,7764.64],["2026-09-23",7761.94,7761.94,7694.89,7706.03],["2026-09-24",7666.99,7719.01,7662.57,7704.13],["2026-09-25",7709.86,7752.07,7693.08,7743.41],["2026-09-28",7721.7,7724.15,7666.6,7683.69]],
    levels:[7550,7650,7750,7780],illustrativeCloses:[7660,7710,7680,7710,7680,7730,7750,7770],weakEnd:7550,strongEnd:7780,
    zh:["原文本周波动加大、上涨空间有限；下周偏震荡上涨，但内部有分化。", "9/28收7,683.69、跌0.77%；短期承压，不等于单日确认中期下跌。", "检验7,650—7,670；反弹看7,725—7,750。", "守住支撑、重新站回7,750，才更接近原文的震荡上涨；若支撑失守并反抽失败，先看7,610及更低结构。", "图中修复分支不是强制方向；高低点持续下移时，应降低修复情景权重。SPX点数不能当成SPY价格。"],
    en:["The first transcript expects volatility and limited upside; the next favors choppy gains with dispersion.", "Sep 28 close: 7,683.69, down 0.77%. One weak session does not establish a medium-term downtrend.", "Test 7,650–7,670; watch 7,725–7,750 on rebounds.", "Holding support and reclaiming 7,750 supports the recovery branch. A breakdown and failed retest brings 7,610 and lower structures into view.", "Persistent lower highs and lows weaken the recovery thesis. Cash-index points are not SPY prices."],
  },
  {
    id:"ndx",name:["纳斯达克100 NDX","Nasdaq 100 NDX"],unit:"points",calendar:"us",source:"https://www.investing.com/indices/nq-100-historical-data",
    history:[["2026-09-22",30496.43,30770.63,30496.43,30732.4],["2026-09-23",30706.23,30706.23,30353.88,30470.29],["2026-09-24",30225.19,30529.35,30204.16,30478.86],["2026-09-25",30517.46,30667.56,30413.59,30608.13],["2026-09-28",30426.63,30480.4,30081.06,30276.81]],
    levels:[29640,29930,30480,30770],illustrativeCloses:[30090,30400,30150,30350,30150,30480,30550,30700],weakEnd:29640,strongEnd:30770,
    zh:["原文谈美股与AI修复，未给NDX精确点位；此图是补充技术情景。", "9/28收30,276.81、跌1.08%，近期高位回撤。", "检验29,930—30,080；反弹压力30,480—30,770。", "守住支撑可震荡修复；跌破29,930且收不回，偏弱路径更有依据，下一层观察29,640附近。", "收回压力且回踩守住，不能继续坚持必跌。NDX不是纳指综合指数，也不是QQQ或NQ期货。"],
    en:["The source discusses US/AI recovery without exact NDX levels; this adds a technical scenario.", "Sep 28 close: 30,276.81, down 1.08%, following a pullback from recent highs.", "Watch 29,930–30,080 support and 30,480–30,770 resistance.", "Support holding permits choppy recovery. A loss and failed reclaim of 29,930 favors weakness, with 29,640 as the next reference.", "Reclaiming resistance and holding the retest weakens the bearish branch. NDX is not the Composite, QQQ or NQ futures."],
  },
  {
    id:"sox",name:["费城半导体 SOX","PHLX Semiconductor SOX"],unit:"points",calendar:"us",source:"https://www.investing.com/indices/phlx-semiconductor-historical-data",
    history:[["2026-09-22",12338.9,12708.3,12338.5,12689.8],["2026-09-23",12659.1,12660.9,12371.4,12534.3],["2026-09-24",12309.1,12517.9,12258.4,12492.5],["2026-09-25",12565.8,12732.8,12549.6,12668.9],["2026-09-28",12595.1,12665.4,12277.4,12465.2]],
    levels:[11920,12250,12670,12730],illustrativeCloses:[12280,12500,12300,12460,12340,12600,12670,12700],weakEnd:11920,strongEnd:12730,
    zh:["本周原文偏弱、分化，下周允许AI与半导体资金回流，不是全部个股同步上涨。", "9/28收12,465.2、跌1.61%，仍高于9月中旬；单日回落不确认整段上涨结束。", "观察12,250—12,280支撑与止跌质量。", "守住后看12,670—12,730；支撑失守后先看12,060、11,920。", "需价格先确认资金回流。SOX点位不能直接套到SOXX或SOXL，杠杆ETF另有路径风险。"],
    en:["Weakness and dispersion this week; potential AI/semiconductor rotation next week, not universal stock gains.", "Sep 28 close: 12,465.2, down 1.61%, still above mid-September levels.", "Watch the response around 12,250–12,280.", "If support holds, watch 12,670–12,730. If it fails, references are 12,060 and 11,920.", "Price must confirm rotation. SOX levels cannot be applied directly to SOXX or leveraged SOXL."],
  },
  {
    id:"csi300",name:["沪深300","CSI 300"],unit:"points",calendar:"cn",source:"https://www.investing.com/indices/csi300-historical-data",
    history:[["2026-09-22",4569.87,4583.38,4537.04,4544.59],["2026-09-23",4547.61,4547.69,4513.45,4517.28],["2026-09-24",4499.86,4500.2,4439.14,4439.14],["2026-09-28",4423.82,4423.82,4323.57,4340.75],["2026-09-29",4335.81,4359.3,4324.53,4345.21]],
    levels:[4323,4424,4439],illustrativeCloses:[4330,4325,4360],weakEnd:4300,strongEnd:4439,
    zh:["两期原文以节前盘整、假期安排为主，没有给出休市期间逐日方向。", "9/28跌2.22%，9/29仅回升0.10%至4,345.21，先按弱修复看待。", "本周剩余9/30，重点看4,323附近是否守住。", "10/8、10/9复市后看能否收复4,424—4,439；否则仍是弱修复。", "10/1—7休市不画K线；10/10周六也不交易。图上4300只是转弱示意坐标，不是新增价格目标。"],
    en:["The transcripts focus on pre-holiday consolidation, not daily directions during closure.", "After a 2.22% decline on Sep 28, Sep 29 recovered only 0.10% to 4,345.21: initially a weak repair.", "Sep 30 is this week's remaining session; watch the 4,323 area.", "On Oct 8–9, assess whether 4,424–4,439 can be reclaimed; otherwise repair remains weak.", "No candles on Oct 1–7 or Saturday Oct 10. The 4,300 weak-branch endpoint is an illustrative coordinate, not a new target."],
  },
  {
    id:"star50",name:["科创50","STAR 50"],unit:"points",calendar:"cn",source:"https://cn.investing.com/indices/sse-star-50-historical-data",
    history:[["2026-09-22",1699.05,1707.67,1657.22,1665.04],["2026-09-23",1671.77,1676.85,1656.98,1660.85],["2026-09-24",1652.69,1653.39,1621.87,1621.87],["2026-09-28",1610.92,1610.92,1548.95,1555.98],["2026-09-29",1558.66,1576.55,1548.74,1569.34]],
    levels:[1549,1611,1622],illustrativeCloses:[1558,1550,1590],weakEnd:1516,strongEnd:1622,
    zh:["原文偏整理与节前观望，没有确定节后单边上涨。", "9/28跌4.06%，9/29回升0.86%至1,569.34，尚不足以确认反转。", "9/30观察1,549附近承接。", "节后先看1,611—1,622压力是否收回，未收回前仍按修复。", "持续失守近期低点会削弱修复假设；休市日不制造蜡烛。更低分支1,516为此前低点附近的观察，不保证触及。"],
    en:["Consolidation and pre-holiday caution, not a promised post-holiday advance.", "Sep 28 fell 4.06%; Sep 29 gained 0.86% to 1,569.34. A reversal is not confirmed.", "Watch buying response around 1,549 on Sep 30.", "After reopening, test whether 1,611–1,622 can be reclaimed.", "Persistent breaks of recent lows undermine repair. No closed-session candles; the lower branch near 1,516 references an earlier low, not a guaranteed destination."],
  },
  {
    id:"hstech",name:["恒生科技","Hang Seng TECH"],unit:"points",calendar:"hk",source:"https://hk.investing.com/indices/hang-seng-tech-historical-data",
    history:[["2026-09-23",4438.86,4443.27,4366.37,4379.07],["2026-09-24",4344.85,4366.84,4330.02,4361.13],["2026-09-25",4318.17,4318.17,4246.12,4311.78],["2026-09-28",4324.48,4348.99,4275.31,4296],["2026-09-29",4286.9,4286.9,4217.81,4249.62]],
    levels:[4218,4290,4350],illustrativeCloses:[4230,4250,4300,4250,4290,4320,4340],weakEnd:4180,strongEnd:4367,
    zh:["原文偏底部整理、下周初有上冲可能，但上涨高度与持续性有限。", "9/29收4,249.62，低4,217.81，高低点下移，不能宣布底部已确认。", "检验4,218附近；反弹先看4,290—4,350。", "站回4,350再讨论完整修复；若近期低点失守，保留下探分支。", "10/1休市、10/2正常交易；港股通10/1—7暂停不等于港股停市。4,180仅为更低路径的画图坐标，非新增目标。"],
    en:["The source favors basing and an early-next-week bounce, but questions its height and durability.", "Sep 29 closed at 4,249.62 with a 4,217.81 low. Falling highs/lows do not confirm a bottom.", "Test around 4,218; initial rebound references are 4,290–4,350.", "Reclaim 4,350 before discussing fuller repair. A loss of recent lows keeps the weak branch alive.", "Hong Kong closes Oct 1, not Oct 2. Stock Connect suspension Oct 1–7 is different. 4,180 is an illustrative weaker coordinate, not a new target."],
  },
  {
    id:"gold",name:["现货黄金 XAU/USD","Spot gold XAU/USD"],unit:"USD/oz",calendar:"us",source:"https://www.investing.com/currencies/xau-usd-historical-data",
    history:[["2026-09-22",4343.57,4378.25,4291.42,4355.48],["2026-09-23",4357.02,4371.45,4274.73,4287.51],["2026-09-24",4287.38,4304.95,4244.63,4278.52],["2026-09-25",4279.12,4316.81,4254.45,4287.25],["2026-09-28",4277.9,4280.56,4110.95,4127.38]],
    levels:[3900,4100,4250,4300],illustrativeCloses:[4120,4170,4130,4190,4150,4210,4180,4250],weakEnd:3900,strongEnd:4300,
    zh:["两期原文均偏4,100—4,300震荡，下期另提3,900深层观察。", "9/28收4,127.38，低4,110.95，已接近区间下沿；不能继续当成高位平稳横盘。", "重点看4,100附近是否出现下探后收回。", "守住才看区间修复，先观察4,250—4,280；失守且收不回，应降低区间情景权重。", "3,900是更深回撤候选，不是跌破4,100就必达；持续突破4,300也会使区间假设失效。不要混用不同月份黄金期货。"],
    en:["Both transcripts favor a 4,100–4,300 range; the second adds 3,900 as a deeper reference.", "Sep 28 close: 4,127.38; low: 4,110.95. Gold is already near the range floor, not calmly consolidating near its top.", "Watch for a probe and reclaim around 4,100.", "If it holds, assess repair toward 4,250–4,280. Failure to reclaim the floor weakens the range thesis.", "3,900 is a deeper candidate, not automatic after a 4,100 break. Sustained strength above 4,300 also invalidates the range. Do not mix futures contracts."],
  },
];

export function illustrationDates(calendar: ScenarioAsset["calendar"]): string[] {
  const dates: string[] = [];
  for (let t = Date.UTC(2026,8,30); t <= Date.UTC(2026,9,10); t += 86400000) {
    const d = new Date(t); const date = d.toISOString().slice(0,10); const day = d.getUTCDay();
    if (calendar !== "crypto" && (day === 0 || day === 6)) continue;
    if (calendar === "cn" && date >= "2026-10-01" && date <= "2026-10-07") continue;
    if (calendar === "hk" && date === "2026-10-01") continue;
    dates.push(date);
  }
  return dates;
}

export function illustrativeBars(asset: ScenarioAsset): HistoricalBar[] {
  const dates = illustrationDates(asset.calendar);
  if (dates.length !== asset.illustrativeCloses.length) throw new Error(`Calendar mismatch: ${asset.id}`);
  const span = Math.max(...asset.levels) - Math.min(...asset.levels);
  const last = asset.history.at(-1);
  if (!last) throw new Error(`Missing historical anchor: ${asset.id}`);
  let previous = last[4];
  return asset.illustrativeCloses.map((close,index) => {
    const open = previous; previous = close;
    const wick = span * (index % 2 ? 0.022 : 0.015);
    return [dates[index]!,open,Math.max(open,close)+wick,Math.min(open,close)-wick,close] as const;
  });
}
