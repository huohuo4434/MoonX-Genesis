import "server-only";
import { callCommitteeModel } from "@/lib/ai-committee/model";
import type { ConsultationInput } from "@/types/member-consultation";
import { consultationModelResponseSchema,runConsultationDraftCore } from "./ai-draft-core";
export function generateConsultationAiDraft(input:ConsultationInput){return runConsultationDraftCore(input,async(system,user)=>(await callCommitteeModel({system,user,schema:consultationModelResponseSchema,timeoutMs:45_000})).value);}
