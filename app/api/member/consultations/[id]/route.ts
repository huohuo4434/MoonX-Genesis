import { NextRequest,NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { consultationDeviceAccess } from "@/lib/consultations/access-core";

async function requireMemberConsultationAccess(){return consultationDeviceAccess(await getMemberDevicePageAccess());}

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const gate=await requireMemberConsultationAccess();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});
  const {getMemberConsultationAnswer}=await import("@/lib/consultations/store");const {id}=await params;
  try{return NextResponse.json({ok:true,...await getMemberConsultationAnswer(gate.userId,id)},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({ok:false,error:"CONSULTATION_FINAL_NOT_AVAILABLE"},{status:409});}
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const gate=await requireMemberConsultationAccess();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});
  const [{validateConsultationInput},{supplementConsultationInput}]=await Promise.all([import("@/lib/consultations/input-core"),import("@/lib/consultations/store")]);
  const parsed=validateConsultationInput(await request.json().catch(()=>null));if(!parsed.ok)return NextResponse.json({ok:false,error:"INCOMPLETE_INPUT",missing:parsed.missing},{status:400});
  const {id}=await params;try{await supplementConsultationInput(gate.userId,id,parsed.input);return NextResponse.json({ok:true,status:"SUBMITTED"});}catch{return NextResponse.json({ok:false,error:"SUPPLEMENT_FAILED"},{status:409});}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const gate=await requireMemberConsultationAccess();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});
  const {releaseConsultation,requestConsultationPurge}=await import("@/lib/consultations/store");const {id}=await params;const purge=request.nextUrl.searchParams.get("purge")==="1";
  try{if(purge)await requestConsultationPurge(gate.userId,id);else await releaseConsultation(id,gate.userId,"CANCELLED","MEMBER_CANCELLED");return NextResponse.json({ok:true});}catch{return NextResponse.json({ok:false,error:"REQUEST_UPDATE_FAILED"},{status:409});}
}
