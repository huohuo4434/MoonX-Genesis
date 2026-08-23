import { COMMITTEE_ROLE_DEFINITIONS, REVIEWER_ROLE } from "@/lib/ai-committee/roles";
import type {
  CommitteeInput,
  CommitteePromptPreview,
  CommitteeRoleOpinion,
} from "@/lib/ai-committee/types";

function evidenceBlock(input: CommitteeInput): string {
  return [
    `[MARKET_CONTEXT]\n${input.marketContext || "未提供"}`,
    `[TECHNICAL]\n${input.technicalEvidence || "未提供"}`,
    `[LIUYAO_QIMEN]\n${input.liuyaoQimenEvidence || "未提供"}`,
    `[MACRO_EVENTS]\n${input.macroEvidence || "未提供"}`,
    `[EXISTING_VIEW]\n${input.existingView || "未提供"}`,
    `[RISK_CONSTRAINTS]\n${input.riskConstraints || "未提供"}`,
    `[SOURCE_NOTES]\n${input.sourceNotes || "未提供"}`,
  ].join("\n\n");
}

export function buildBuilderPrompts(input: CommitteeInput): {
  system: string;
  user: string;
} {
  const roles = COMMITTEE_ROLE_DEFINITIONS.map((role) =>
    [
      `${role.id}｜${role.name}`,
      `任务：${role.mission}`,
      `必须检查：${role.requiredChecks.join("；")}`,
      `禁止：${role.forbiddenBehaviors.join("；")}`,
    ].join("\n")
  ).join("\n\n");

  const system = `你是MOOX内部研究委员会的Builder层。你必须分别扮演五个互相独立的专业角色，不能让一个角色替另一个角色做判断。

硬规则：
1. 只能使用用户提供的证据块，不得联网，不得编造实时价格、新闻、卦象或合作来源。
2. 每条结论必须在 evidenceRefs 中引用至少一个合法证据标签。
3. 必须区分反弹、反转、趋势延续和震荡；必须给出失效条件。
4. 六爻与奇门只能使用已提供笔记，并分别独立给出方向。两者同向时提高信心，分歧时并列保留并降低信心；关键日默认允许前后一个交易日误差。
5. 反方角色必须真正提出可验证反证，风险角色不得发出实盘订单。
6. 所有内容仅供内部研究，executionPolicy 永远是 RESEARCH_ONLY。
7. 只返回严格JSON对象，不要Markdown，不要额外说明。

角色定义：
${roles}

返回格式：
{"opinions":[{"roleId":"MARKET_STRUCTURE","roleName":"市场结构Agent","stance":"BULLISH|BEARISH|NEUTRAL|MIXED","confidence":0,"thesis":"","evidenceRefs":["TECHNICAL"],"supportingPoints":[""],"risks":[""],"invalidation":"","proposedAction":"","dataGaps":[]}]} `;

  const user = `研究对象：${input.asset}${input.symbol ? `（${input.symbol}）` : ""}
周期：${input.horizon}
资料时点：${input.asOf}

${evidenceBlock(input)}

请让五个角色分别完成独立判断。任何未提供的数据都必须写入 dataGaps，不得猜测。`;

  return { system, user };
}

export function buildReviewerPrompts(
  input: CommitteeInput,
  opinions: CommitteeRoleOpinion[]
): { system: string; user: string } {
  const system = `你是${REVIEWER_ROLE.name}，与Builder层严格分离。你的任务不是重写五个观点，而是审核它们是否有证据、是否互相矛盾、是否夸大确定性，以及是否达到发布标准。

审核规则：
1. 对照原始证据检查每个 evidenceRefs 和论断。没有证据的内容列入 unsupportedClaims。
2. 必须保留真实分歧，不能为了形成统一结论而抹平反方意见。
3. 必须给出清晰的时间窗口、失效条件、风险计划和下一步验证项。
4. 资料不足或存在未支持论断时，publishDecision 只能是 NEEDS_REVIEW 或 REJECTED。
5. 只要任一角色存在 dataGaps，最终 confidence 原则上不得高于85。
6. 这份结果只供内部研究，绝不能直接触发实盘交易。
7. 只返回严格JSON对象，不要Markdown，不要额外说明。

返回格式：
{"review":{"roleId":"REVIEWER","verdict":"BULLISH|BEARISH|NEUTRAL|MIXED","confidence":0,"consensus":"","disagreements":[""],"finalView":"","timeWindow":"","invalidation":"","riskPlan":"","publishDecision":"APPROVED|NEEDS_REVIEW|REJECTED","publishReason":"","unsupportedClaims":[],"nextChecks":[""]}}`;

  const user = `研究对象：${input.asset}${input.symbol ? `（${input.symbol}）` : ""}
周期：${input.horizon}
资料时点：${input.asOf}

原始证据：
${evidenceBlock(input)}

Builder层输出：
${JSON.stringify({ opinions }, null, 2)}

请进行独立审核。`;
  return { system, user };
}

export function buildPromptPreview(input: CommitteeInput): CommitteePromptPreview {
  const builder = buildBuilderPrompts(input);
  return {
    builderSystemPrompt: builder.system,
    builderUserPrompt: builder.user,
    reviewerSystemPrompt: buildReviewerPrompts(input, []).system,
  };
}
