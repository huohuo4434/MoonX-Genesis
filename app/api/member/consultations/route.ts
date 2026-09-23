import { NextRequest,NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { consultationDeviceAccess } from "@/lib/consultations/access-core";
import { CONSULTATIONS_PAUSED } from "@/lib/operations/lean-policy";
export const dynamic="force-dynamic";export const revalidate=0;
async function requireMemberConsultationAccess(){
  const gate = consultationDeviceAccess(await getMemberDevicePageAccess());
  if (!gate.ok) return gate;
  if (CONSULTATIONS_PAUSED) return { ok: false as const, error: "CONSULTATIONS_PAUSED", status: 503 };
  return gate;
}
export async function GET(){noStore();const gate=await requireMemberConsultationAccess();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});const store=await import("@/lib/consultations/store");try{await store.bootstrapConsultationQuota(gate.userId);const [quota,requests]=await Promise.all([store.getConsultationQuota(gate.userId),store.listMemberConsultations(gate.userId)]);return NextResponse.json({ok:true,quota,requests},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({ok:false,error:"CONSULTATION_SERVICE_UNAVAILABLE"},{status:503});}}
export async function POST(request:NextRequest){noStore();const gate=await requireMemberConsultationAccess();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});const [{validateConsultationInput},store]=await Promise.all([import("@/lib/consultations/input-core"),import("@/lib/consultations/store")]);const parsed=validateConsultationInput(await request.json().catch(()=>null));if(!parsed.ok)return NextResponse.json({ok:false,error:"INCOMPLETE_INPUT",missing:parsed.missing},{status:400});try{await store.bootstrapConsultationQuota(gate.userId);const id=await store.reserveAndStoreConsultation(gate.userId,parsed.input);return NextResponse.json({ok:true,id,status:"SUBMITTED"},{status:201});}catch(error){const unavailable=error instanceof Error&&error.message.includes("QUOTA_UNAVAILABLE");return NextResponse.json({ok:false,error:unavailable?"CONSULTATION_QUOTA_UNAVAILABLE":"CONSULTATION_SUBMIT_FAILED"},{status:unavailable?409:503});}}
