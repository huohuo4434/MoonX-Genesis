import type { ConsultationInput } from "@/types/member-consultation";
import { deriveLiuyaoStructure } from "./input-core";

export type ConsultationCommitteeDraft = {
  authority: "RESEARCH_ONLY"; tradingEligible: false; outcome: "DRAFT_READY" | "NEEDS_INFO";
  roles: Array<{ role: "INPUT_CALENDAR" | "METHOD_EVIDENCE" | "SCENARIO" | "CONTRARIAN" | "RISK"; note: string }>;
  draft: string | null; missing: string[];
  modelReviewer: { approvedForHumanReview: boolean; note: string };
};

export function buildConsultationCommitteeDraft(input: ConsultationInput): ConsultationCommitteeDraft {
  if (input.kind === "BAZI") {
    return { authority: "RESEARCH_ONLY", tradingEligible: false, outcome: "NEEDS_INFO",
      roles: [
        { role: "INPUT_CALENDAR", note: "等待易老师核对历法、真太阳时和四柱。" },
        { role: "METHOD_EVIDENCE", note: "未确认命盘前不推导十神或大运。" },
        { role: "SCENARIO", note: "仅整理用户问题范围。" },
        { role: "CONTRARIAN", note: "出生时间和来源置信度需要交叉核验。" },
        { role: "RISK", note: "不得虚构四柱、流年或确定性结果。" },
      ], draft: null, missing: ["REVIEWER_CONFIRMED_CHART", "REVIEWER_CONFIRMED_PILLARS"], modelReviewer: { approvedForHumanReview: false, note: "命盘与四柱未由真人确认，阻止生成判断。" } };
  }
  const structure = deriveLiuyaoStructure(input);
  return { authority: "RESEARCH_ONLY", tradingEligible: false, outcome: "DRAFT_READY", missing: [],
    roles: [
      { role: "INPUT_CALENDAR", note: `起卦时间与时区已记录；本卦结构：${structure.basicHexagram}。` },
      { role: "METHOD_EVIDENCE", note: `动爻：${structure.movingLines.join("、") || "无"}；未猜测用神、世应或纳甲。` },
      { role: "SCENARIO", note: "围绕问题范围整理条件式情景，不作保证。" },
      { role: "CONTRARIAN", note: "检查问题措辞、时间窗口与反向证据。" },
      { role: "RISK", note: "输出仅供研究参考，等待易老师本人复核。" },
    ], draft: `六爻结构草稿：${structure.basicHexagram}；动爻${structure.movingLines.join("、") || "无"}。具体取用、世应、纳甲与判断等待易老师复核。`, modelReviewer: { approvedForHumanReview: true, note: "输入结构完整；仅允许进入真人复核队列。" } };
}
