import type { ChanExecutionDecision, ChanExecutionInputs } from "@/types/chan-execution";

const weights = { chan: 35, qiaoqiao: 20, marketFlow: 15, nana: 15, liquidityEvent: 15 } as const;

export function decideChanExecution(input: ChanExecutionInputs): ChanExecutionDecision {
  const missing = [input.chanScore, input.qiaoqiaoScore, input.marketFlowScore, input.nanaScore, input.liquidityEventScore].some((score) => score == null || !Number.isFinite(score));
  const hardWaitReasons: string[] = [];
  if (input.authoritativeDirection === "NEUTRAL") hardWaitReasons.push("AUTHORITATIVE_DIRECTION_UNAVAILABLE");
  if (input.directionConflict) hardWaitReasons.push("DIRECTION_CONFLICT");
  if (!input.structure.sufficient) hardWaitReasons.push("INSUFFICIENT_BARS");
  if (input.structure.trendState !== "COMPLETE") hardWaitReasons.push("STRUCTURE_INCOMPLETE");
  if (missing) hardWaitReasons.push("MISSING_WEIGHTED_INPUT");
  const feasibilityScore = missing ? null : Math.round(
    input.chanScore! * 0.35 + input.qiaoqiaoScore! * 0.2 + input.marketFlowScore! * 0.15 + input.nanaScore! * 0.15 + input.liquidityEventScore! * 0.15
  );
  if (hardWaitReasons.length) return { action: "WAIT", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "硬等待条件优先；权重分数不能绕过方向、数据或结构完整性。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };

  const bullish = input.authoritativeDirection === "BULL";
  const alignedBuy = bullish && (input.structure.buyPoint === "SECOND" || input.structure.buyPoint === "THIRD");
  const alignedSell = !bullish && (input.structure.sellPoint === "SECOND" || input.structure.sellPoint === "THIRD");
  if (alignedBuy && input.standardPullback) return { action: "BUY_CANDIDATE", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "正式方向看多，真实结构出现优先级较高的二买/三买候选；仍需外部硬门禁。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };
  if (alignedSell && input.standardPullback) return { action: "SELL_CANDIDATE", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "正式方向看空，真实结构出现对称卖点候选；不代表订单。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };
  if (input.atTopZone && input.structure.trendState === "COMPLETE" && input.structure.divergence) return { action: "TAKE_PROFIT", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "方向不翻转；结构完成、关键位置与动能衰减联合提示条件式止盈。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };
  if (!input.standardPullback) return { action: "DO_NOT_CHASE", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "没有标准回调或对称买卖点，不追价。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };
  return { action: "HOLD", feasibilityScore, direction: input.authoritativeDirection, hardWaitReasons, explanation: "正式方向不变，结构没有给出新增执行点，保持观察或持有。", weights, executionAuthority: "RESEARCH_ONLY", tradingEligible: false };
}
