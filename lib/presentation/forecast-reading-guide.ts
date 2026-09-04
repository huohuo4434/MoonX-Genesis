import { isPlainDirection, type PlainDirection } from "@/lib/forecasts/plain-direction";

// Presentation only: never infer the current market phase or execution permission.
const READING: Record<PlainDirection, { en: string; meaning: [string, string]; watch: [string, string] }> = {
  上涨: { en: "Upward", meaning: ["本期预期整体向上，不代表每一天都涨。", "The period is expected to trend higher, not rise every day."], watch: ["先核对入场条件；上涨观点本身不是追涨理由。", "Check the entry conditions first; a bullish outlook alone is not a reason to chase."] },
  震荡上涨: { en: "Choppy advance", meaning: ["预期反复中抬高，途中仍可能回撤。", "A choppy advance is expected, with pullbacks along the way."], watch: ["留意回撤后的承接，不把一次反弹当成持续上涨已确认。", "Watch for support after pullbacks; one bounce does not confirm a sustained advance."] },
  先跌后涨: { en: "Decline, then recovery", meaning: ["预期先承压，再出现修复；不等于现在已经见底。", "Weakness is expected before a recovery; this does not mean the bottom is already in."], watch: ["先等下跌阶段结束的证据，再核对修复条件；不能只因预计后面涨就提前买入或扛单。", "Wait for evidence that the decline has ended, then check recovery conditions; a later rebound forecast does not justify buying early or holding a losing trade indefinitely."] },
  震荡: { en: "Range-bound", meaning: ["预期反复拉锯，暂不按单边上涨或下跌理解。", "Two-way price action is expected, rather than a one-way trend."], watch: ["先看区间边界与突破确认；没有明确区间或条件时继续观察。", "Check range boundaries and breakout confirmation; keep observing if those conditions are missing."] },
  先涨后跌: { en: "Rally, then decline", meaning: ["预期先有上冲，再有回落风险；不等于现在已经见顶。", "An initial rally is expected before downside risk increases; this does not mean the top is already in."], watch: ["上冲时重点核对止盈与转弱条件；不能把前段上涨当成整期持续看涨。", "During a rally, check profit-taking and weakening conditions; early strength is not a bullish call for the entire period."] },
  震荡下跌: { en: "Choppy decline", meaning: ["预期反复中走低，途中可能有反弹。", "A choppy decline is expected, with possible countertrend bounces."], watch: ["有多仓先核对风险边界；反弹不自动等于反转，也不代表可以立即做空。", "If holding a long, check its risk limits; a bounce is not automatically a reversal or permission to short."] },
  下跌: { en: "Downward", meaning: ["本期预期整体承压，不代表每一天都跌。", "The period is expected to weaken, not fall every day."], watch: ["有多仓先核对退出条件；空仓不急着抄底，看跌也不是立即做空指令。", "If holding a long, check exit conditions; if flat, do not assume a bottom. A bearish view is not an immediate short signal."] },
};

export function forecastReadingGuide(raw: string | null | undefined, en = false) {
  const text = raw?.trim() ?? "";
  const alias = text === "探底回升" ? "先跌后涨" : text === "冲高回落" ? "先涨后跌" : text;
  const direction = isPlainDirection(alias) ? alias : null;
  const reading = direction ? READING[direction] : null;
  return {
    direction,
    label: reading ? (en ? reading.en : direction!) : (en ? "Awaiting a clear outlook" : "观点待核对"),
    meaning: reading ? reading.meaning[en ? 1 : 0] : (en ? "No supported outlook is available; no direction has been inferred." : "尚无可解释的明确观点，不补推多空方向。"),
    watch: reading ? reading.watch[en ? 1 : 0] : (en ? "Wait for a clear, dated forecast before assessing a trade." : "先等待明确的预测与适用日期，不据此开仓。"),
  };
}
