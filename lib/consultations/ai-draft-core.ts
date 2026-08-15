import { z } from "zod";
import type { ConsultationInput } from "@/types/member-consultation";
import { buildConsultationCommitteeDraft, type ConsultationCommitteeDraft } from "./committee-core";

export const consultationModelResponseSchema=z.object({draft:z.string().min(80).max(6000),methodAssignments:z.object({useGod:z.null(),shiLine:z.null(),yingLine:z.null(),najia:z.null()}),modelReview:z.object({safeForHumanReview:z.boolean(),note:z.string().min(5).max(500)})});
export async function runConsultationDraftCore(input:ConsultationInput,modelCall:(system:string,user:string)=>Promise<unknown>):Promise<ConsultationCommitteeDraft>{
  const deterministic=buildConsultationCommitteeDraft(input);if(deterministic.outcome==="NEEDS_INFO")return deterministic;
  const system="你是MOOX会员咨询草稿整理器。输出仅供真人复核，不能批准或直接交付。必须保留不确定性；不得猜测用神、世应、纳甲，不得保证结果，不得给医疗、法律或财务确定性建议。只返回JSON；methodAssignments的useGod、shiLine、yingLine、najia必须全部为null。";
  const user=JSON.stringify({authority:"RESEARCH_ONLY",input,committeeEvidence:deterministic.roles});
  const parsed=consultationModelResponseSchema.parse(await modelCall(system,user));
  if(!parsed.modelReview.safeForHumanReview)throw new Error("CONSULTATION_MODEL_REVIEW_BLOCKED");
  if(/用神|世爻|应爻|纳甲/.test(parsed.draft))throw new Error("CONSULTATION_FABRICATED_METHOD_FIELD");
  const fixedDisclaimer="固定说明：用神未确定，世爻、应爻与纳甲均等待易老师本人复核；本稿不能直接交付。";
  return {...deterministic,draft:`${parsed.draft}\n\n${fixedDisclaimer}`,modelReviewer:{approvedForHumanReview:true,note:parsed.modelReview.note}};
}
