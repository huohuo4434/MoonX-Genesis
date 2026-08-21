import "server-only";
import { createHash,randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ConsultationInput, ConsultationPublicRequest, ConsultationStatus } from "@/types/member-consultation";
import { CONSULTATION_DISCLOSURE } from "@/types/member-consultation";
import { decryptConsultationPayload, encryptConsultationPayload } from "./crypto";
import { bootstrapPaidOrderQuotaCore } from "./quota-bootstrap-core";
import { decryptWithRequiredViewAudit } from "./audited-decrypt-core";

type Row = Record<string, unknown>;
function admin() { const value = getAdminClient(); if (!value) throw new Error("CONSULTATION_STORE_UNAVAILABLE"); return value; }
export function consultationContentHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function deliverConsultationQuotaForPaidOrder(orderId: string) {
  const { data, error } = await admin().rpc("grant_consultation_quota_for_paid_order", { p_order_id: orderId });
  if (error) throw new Error(`CONSULTATION_QUOTA_DELIVERY_FAILED:${error.message}`);
  return data;
}
export async function ensureInitialConsultationQuotaForActiveMember(userId: string) {
  const { data, error } = await admin().rpc("grant_initial_consultation_quota_for_active_member", { p_user_id: userId });
  if (error) throw new Error(`CONSULTATION_INITIAL_QUOTA_DELIVERY_FAILED:${error.message}`);
  return data;
}
export async function bootstrapConsultationQuota(userId: string) {
  const { error: expiryError } = await admin().rpc("expire_consultation_info_holds", { p_user_id: userId });
  if (expiryError) throw new Error(`CONSULTATION_HOLD_EXPIRY_FAILED:${expiryError.message}`);
  const { data, error } = await admin().from("payment_orders").select("id,status,metadata,membership_expires_at").eq("user_id", userId)
    .in("status", ["paid", "overpaid", "manual_review"]).order("membership_expires_at",{ascending:true}).order("id",{ascending:true});
  if (error) throw new Error(`CONSULTATION_PAID_ORDER_READ_FAILED:${error.message}`);
  const delivered=await bootstrapPaidOrderQuotaCore((data??[]).map(row=>({...row,metadata:(row.metadata??{}) as Record<string,unknown>})),deliverConsultationQuotaForPaidOrder);
  // Legacy/manual membership activations may have no payment_order. The database
  // function is membership-validated and idempotent, so refreshing cannot mint
  // another allowance or replace an existing paid-order grant.
  await ensureInitialConsultationQuotaForActiveMember(userId);
  return delivered;
}
export async function getConsultationQuota(userId: string) {
  const capturedNow=new Date().toISOString();
  const { data, error } = await admin().from("consultation_quota_grants").select("quota_total,quota_available,quota_reserved,quota_consumed,eligible_until,plan_code").eq("user_id", userId).lte("eligible_from",capturedNow).gt("eligible_until",capturedNow);
  if (error) throw new Error(`CONSULTATION_QUOTA_READ_FAILED:${error.message}`);
  return (data ?? []).reduce((a, r) => ({ total:a.total+r.quota_total, available:a.available+r.quota_available, reserved:a.reserved+r.quota_reserved, consumed:a.consumed+r.quota_consumed }), { total:0,available:0,reserved:0,consumed:0 });
}
export async function reserveAndStoreConsultation(userId: string, input: ConsultationInput) {
  const requestId=randomUUID();const enc=encryptConsultationPayload(input,`request:${requestId}:input`);
  const { data, error } = await admin().rpc("reserve_consultation_request", { p_request_id:requestId,p_user_id:userId,p_kind:input.kind,p_key_version:enc.keyVersion,p_iv:enc.iv,p_auth_tag:enc.tag,p_ciphertext:enc.ciphertext });
  if (error || !data?.id) throw new Error(`CONSULTATION_RESERVE_FAILED:${error?.message ?? "NO_ROW"}`);
  return data.id as string;
}
export async function supplementConsultationInput(userId:string,requestId:string,input:ConsultationInput){
  const enc=encryptConsultationPayload(input,`request:${requestId}:input`);const {data,error}=await admin().rpc("supplement_consultation_request",{p_request_id:requestId,p_user_id:userId,p_kind:input.kind,p_key_version:enc.keyVersion,p_iv:enc.iv,p_auth_tag:enc.tag,p_ciphertext:enc.ciphertext});if(error||!data)throw new Error("CONSULTATION_SUPPLEMENT_CONFLICT");
}
async function auditSensitiveView(requestId:string,userId:string,actorId:string,scope:"INPUT"|"RESPONSE"){
  const {error}=await admin().from("consultation_request_events").insert({request_id:requestId,user_id:userId,event_type:"VIEWED",actor_id:actorId,idempotency_key:`view:${requestId}:${scope}:${randomUUID()}`,metadata:{scope}});
  if(error)throw new Error("CONSULTATION_VIEW_AUDIT_FAILED");
}
export async function readPrivateInput(requestId: string,actorId:string): Promise<ConsultationInput> {
  const request=await getAdminConsultation(requestId);const userId=String(request.user_id);
  const { data,error }=await admin().from("consultation_private_payloads").select("iv,auth_tag,ciphertext").eq("request_id",requestId).single();
  if(error||!data) throw new Error("CONSULTATION_PRIVATE_INPUT_UNAVAILABLE");
  return decryptWithRequiredViewAudit({decrypt:()=>decryptConsultationPayload<ConsultationInput>({iv:data.iv,tag:data.auth_tag,ciphertext:data.ciphertext},`request:${requestId}:input`),audit:()=>auditSensitiveView(requestId,userId,actorId,"INPUT")});
}
export async function appendResponseVersion(input:{requestId:string;authorKind:"AI_DRAFT"|"ADMIN_EDIT"|"PRIMARY_REVIEWER_FINAL";authorId:string|null;content:string}) {
  const db=admin(); const {data:latest,error}=await db.from("consultation_response_versions").select("id,version,content_hash").eq("request_id",input.requestId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error) throw new Error("CONSULTATION_VERSION_READ_FAILED");
  const version=(latest?.version??0)+1; const contentHash=consultationContentHash(input.content); const diffHash=consultationContentHash(`${latest?.content_hash??"ROOT"}:${contentHash}`); const enc=encryptConsultationPayload({content:input.content},`request:${input.requestId}:response:${version}`);
  const {data,error:writeError}=await db.from("consultation_response_versions").insert({request_id:input.requestId,version,author_kind:input.authorKind,author_id:input.authorId,previous_version_id:latest?.id??null,key_version:enc.keyVersion,iv:enc.iv,auth_tag:enc.tag,ciphertext:enc.ciphertext,content_hash:contentHash,diff_hash:diffHash}).select("id,version,content_hash,diff_hash").single();
  if(writeError||!data) throw new Error("CONSULTATION_VERSION_WRITE_FAILED");
  return {version:data.version as number,contentHash:data.content_hash as string,diffHash:data.diff_hash as string};
}
export async function listMemberConsultations(userId:string):Promise<ConsultationPublicRequest[]> {
  const {data,error}=await admin().from("consultation_requests").select("id,kind,status,missing_fields,quota_consumed,created_at,updated_at,current_version").eq("user_id",userId).order("created_at",{ascending:false});
  if(error) throw new Error("CONSULTATION_LIST_FAILED");
  const out:ConsultationPublicRequest[]=[];
  for(const row of data??[]){const approved=row.status==="APPROVED";
    out.push({id:row.id,kind:row.kind,status:row.status as ConsultationStatus,createdAt:row.created_at,updatedAt:row.updated_at,missingFields:Array.isArray(row.missing_fields)?row.missing_fields:[],reviewerLabel:approved?"易老师复核：已完成":"等待易老师复核",finalAnswer:null,disclosure:approved?CONSULTATION_DISCLOSURE:null,quotaConsumed:row.quota_consumed});
  } return out;
}
export async function getMemberConsultationAnswer(userId:string,requestId:string){
  const {data:request,error}=await admin().from("consultation_requests").select("id,user_id,status,current_version").eq("id",requestId).eq("user_id",userId).eq("status","APPROVED").single();
  if(error||!request)throw new Error("CONSULTATION_FINAL_NOT_AVAILABLE");
  const {data:v,error:e}=await admin().from("consultation_response_versions").select("iv,auth_tag,ciphertext").eq("request_id",requestId).eq("version",request.current_version).eq("author_kind","PRIMARY_REVIEWER_FINAL").single();
  if(e||!v)throw new Error("CONSULTATION_FINAL_READ_FAILED");
  const content=await decryptWithRequiredViewAudit({decrypt:()=>decryptConsultationPayload<{content:string}>({iv:v.iv,tag:v.auth_tag,ciphertext:v.ciphertext},`request:${requestId}:response:${request.current_version}`).content,audit:()=>auditSensitiveView(requestId,userId,userId,"RESPONSE")});return {content,disclosure:CONSULTATION_DISCLOSURE};
}
export async function listAdminConsultations(){const {data,error}=await admin().from("consultation_requests").select("id,kind,status,missing_fields,current_version,created_at,updated_at").order("updated_at",{ascending:true});if(error)throw new Error("CONSULTATION_ADMIN_LIST_FAILED");return data??[];}
export async function getAdminConsultation(requestId:string){const {data,error}=await admin().from("consultation_requests").select("*").eq("id",requestId).single();if(error||!data)throw new Error("CONSULTATION_NOT_FOUND");return data as Row;}
export async function getAdminConsultationDetail(requestId:string,actorId:string){
  const request=await getAdminConsultation(requestId); const privateInput=await readPrivateInput(requestId,actorId);
  const {data,error}=await admin().from("consultation_response_versions").select("version,author_kind,iv,auth_tag,ciphertext,created_at").eq("request_id",requestId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error("CONSULTATION_VERSION_READ_FAILED");
  let latest=null;if(data){const content=await decryptWithRequiredViewAudit({decrypt:()=>decryptConsultationPayload<{content:string}>({iv:data.iv,tag:data.auth_tag,ciphertext:data.ciphertext},`request:${requestId}:response:${data.version}`).content,audit:()=>auditSensitiveView(requestId,String(request.user_id),actorId,"RESPONSE")});latest={version:data.version,authorKind:data.author_kind,createdAt:data.created_at,content};}
  return {request:{id:request.id,kind:request.kind,status:request.status,missingFields:request.missing_fields,currentVersion:request.current_version,createdAt:request.created_at,updatedAt:request.updated_at},privateInput,latest};
}
export async function setConsultationStatus(requestId:string,actorId:string,expected:ConsultationStatus[],status:Extract<ConsultationStatus,"SUBMITTED"|"AI_DRAFTING"|"DRAFT_READY"|"HUMAN_REVIEW"|"NEEDS_INFO">,missing:string[]=[]){const {data,error}=await admin().rpc("transition_consultation_request",{p_request_id:requestId,p_actor_id:actorId,p_expected:expected,p_target:status,p_missing_fields:missing,p_hold_until:status==="NEEDS_INFO"?new Date(Date.now()+7*86400000).toISOString():null});if(error||!data)throw new Error("CONSULTATION_TRANSITION_CONFLICT");}
export async function releaseConsultation(requestId:string,actorId:string,target:"REJECTED"|"CANCELLED"|"SYSTEM_FAILED"|"INFO_EXPIRED",reason:string){
  const expected:Record<typeof target,ConsultationStatus[]>={
    REJECTED:["SUBMITTED","DRAFT_READY","HUMAN_REVIEW","NEEDS_INFO"],
    CANCELLED:["RESERVED","SUBMITTED","DRAFT_READY","HUMAN_REVIEW","NEEDS_INFO"],
    SYSTEM_FAILED:["AI_DRAFTING"],
    INFO_EXPIRED:["NEEDS_INFO"],
  };
  const {data,error}=await admin().rpc("release_consultation_request",{p_request_id:requestId,p_actor_id:actorId,p_expected:expected[target],p_target:target,p_reason:reason});
  if(error||!data)throw new Error("CONSULTATION_RELEASE_CONFLICT");return data;
}
export async function approveConsultation(requestId:string,reviewerId:string,version:{version:number;contentHash:string;diffHash:string}){const {data,error}=await admin().rpc("approve_consultation_request",{p_request_id:requestId,p_reviewer_id:reviewerId,p_version:version.version,p_content_hash:version.contentHash,p_diff_hash:version.diffHash});if(error)throw new Error(`CONSULTATION_APPROVE_FAILED:${error.message}`);return data;}
export async function requestConsultationPurge(userId:string,requestId:string){const {data,error}=await admin().rpc("purge_consultation_private_data",{p_request_id:requestId,p_user_id:userId});if(error||!data)throw new Error("CONSULTATION_PURGE_FAILED");}
