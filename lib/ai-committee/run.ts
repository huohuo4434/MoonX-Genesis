import { randomUUID } from "node:crypto";
import { builderResponseSchema, reviewerResponseSchema } from "@/lib/ai-committee/schemas";
import { hashCommitteeInput } from "@/lib/ai-committee/hash";
import { callCommitteeModel } from "@/lib/ai-committee/model";
import {
  buildBuilderPrompts,
  buildPromptPreview,
  buildReviewerPrompts,
} from "@/lib/ai-committee/prompts";
import { saveCommitteeRun } from "@/lib/ai-committee/store";
import type { CommitteeInput, CommitteeRun } from "@/lib/ai-committee/types";
import { enrichCommitteeInputWithXIntelligence } from "@/lib/ai-committee/x-intelligence-context";
import {
  hasBlockingGate,
  runInputGates,
  runOutputGates,
} from "@/lib/ai-committee/verification";

export async function previewCommittee(input: CommitteeInput): Promise<CommitteeRun> {
  const enrichedInput = await enrichCommitteeInputWithXIntelligence(input);
  const gates = runInputGates(enrichedInput);
  return {
    id: randomUUID(),
    inputHash: hashCommitteeInput(enrichedInput),
    createdAt: new Date().toISOString(),
    model: "prompt-preview",
    mode: "PROMPT_PREVIEW",
    executionPolicy: "RESEARCH_ONLY",
    input: enrichedInput,
    opinions: [],
    review: null,
    gates,
    promptPreview: buildPromptPreview(enrichedInput),
    saved: false,
  };
}

export async function runCommittee(input: CommitteeInput): Promise<CommitteeRun> {
  const enrichedInput = await enrichCommitteeInputWithXIntelligence(input);
  const inputGates = runInputGates(enrichedInput);
  if (hasBlockingGate(inputGates)) {
    const messages = inputGates
      .filter((gate) => gate.severity === "BLOCKER" && !gate.passed)
      .map((gate) => gate.message)
      .join("；");
    throw new Error(`研究资料未通过输入闸门：${messages}`);
  }

  const builderPrompts = buildBuilderPrompts(enrichedInput);
  const builder = await callCommitteeModel({
    system: builderPrompts.system,
    user: builderPrompts.user,
    schema: builderResponseSchema,
  });

  const reviewerPrompts = buildReviewerPrompts(enrichedInput, builder.value.opinions);
  const reviewer = await callCommitteeModel({
    system: reviewerPrompts.system,
    user: reviewerPrompts.user,
    schema: reviewerResponseSchema,
  });

  const outputGates = runOutputGates(builder.value.opinions, reviewer.value.review);
  const gates = [...inputGates, ...outputGates];
  if (hasBlockingGate(outputGates) && reviewer.value.review.publishDecision === "APPROVED") {
    reviewer.value.review.publishDecision = "NEEDS_REVIEW";
    reviewer.value.review.publishReason = `自动降级：输出未通过全部发布闸门。${reviewer.value.review.publishReason}`;
  }

  const run: CommitteeRun = {
    id: randomUUID(),
    inputHash: hashCommitteeInput(enrichedInput),
    createdAt: new Date().toISOString(),
    model: reviewer.model || builder.model,
    mode: "MODEL",
    executionPolicy: "RESEARCH_ONLY",
    input: enrichedInput,
    opinions: builder.value.opinions,
    review: reviewer.value.review,
    gates,
    saved: false,
  };

  const saved = await saveCommitteeRun({ ...run, saved: true }).catch(() => false);
  run.saved = saved;
  return run;
}
