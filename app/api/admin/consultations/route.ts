import { unstable_noStore as noStore } from "next/cache";
import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { authorizeThenLoad } from "@/lib/consultations/authorized-loader-core";
import { chineseResendError, sendRawEmail, type EmailNotificationStatus } from "@/lib/email/notifications";
import { siteConfig } from "@/lib/site-config";
import { CONSULTATION_DISCLOSURE } from "@/types/member-consultation";

export const dynamic="force-dynamic";
export const revalidate=0;

async function loadModules(){
  const [access,reviewer,store]=await Promise.all([
    import("@/lib/consultations/access-core"),
    import("@/lib/consultations/reviewer-core"),
    import("@/lib/consultations/store"),
  ]);
  return {...access,...reviewer,...store};
}

async function loadForAdmin(){return authorizeThenLoad({authorize:requireAdmin,load:loadModules});}

async function deliverConsultationAnswer(input:{replyEmail:unknown;kind:unknown;content:string}){
  const replyEmail=typeof input.replyEmail==="string"?input.replyEmail.trim():"";
  if(!replyEmail)return {emailStatus:"not_requested" as const,emailError:"会员没有填写接收邮箱。"};
  const email=await sendRawEmail({
    to:replyEmail,
    subject:`MOOX会员${input.kind==="LIUYAO"?"问卦":"咨询"}解答已完成`,
    text:[
      "MOOX会员咨询解答",
      "",
      input.content,
      "",
      CONSULTATION_DISCLOSURE,
      "",
      `会员中心留档：${siteConfig.url}/member/consultations`,
      `客服：${siteConfig.supportEmail} / Telegram ${siteConfig.telegram}`,
    ].join("\n"),
  });
  return {
    emailStatus:email.status as EmailNotificationStatus,
    emailError:email.error?chineseResendError(email.error):undefined,
  };
}

export async function GET(request:NextRequest){
  noStore();
  const loaded=await loadForAdmin();
  if(!loaded.ok)return NextResponse.json({ok:false,error:"FORBIDDEN"},{status:403});
  const id=request.nextUrl.searchParams.get("id");
  return NextResponse.json(id?{ok:true,detail:await loaded.modules.getAdminConsultationDetail(id,loaded.user.id)}:{ok:true,requests:await loaded.modules.listAdminConsultations()},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest){
  noStore();
  const loaded=await loadForAdmin();
  if(!loaded.ok)return NextResponse.json({ok:false,error:"FORBIDDEN"},{status:403});
  const adminUser=loaded.user;const m=loaded.modules;
  let body:{id?:string;action?:string;content?:string;missing?:string[];reason?:string};
  try{body=await request.json();}catch{return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400});}
  const primary=m.authorizePrimaryReviewer({userId:adminUser.id,email:adminUser.email,isAdmin:true});
  const gate=m.consultationAdminActionAccess({isAdmin:true,isPrimary:primary.ok},body.action??"");
  if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.status});
  if(!body.id||!body.action)return NextResponse.json({ok:false,error:"INVALID_BODY"},{status:400});
  try{
    if(body.action==="EDIT"){
      if(typeof body.content!=="string"||body.content.trim().length<20)throw new Error("CONTENT_REQUIRED");
      const current=await m.getAdminConsultation(body.id);
      const currentStatus=String(current.status);
      if(!["SUBMITTED","DRAFT_READY","HUMAN_REVIEW","SYSTEM_FAILED"].includes(currentStatus))throw new Error("INVALID_STATE");
      if(currentStatus==="SYSTEM_FAILED")await m.recoverConsultationForHumanReview(body.id,adminUser.id);
      const version=await m.appendResponseVersion({requestId:body.id,authorKind:"ADMIN_EDIT",authorId:adminUser.id,content:body.content.trim()});
      await m.setConsultationStatus(body.id,adminUser.id,["SUBMITTED","DRAFT_READY","HUMAN_REVIEW"],"HUMAN_REVIEW");
      return NextResponse.json({ok:true,version:version.version});
    }
    if(body.action==="NEEDS_INFO"){await m.setConsultationStatus(body.id,adminUser.id,["SUBMITTED","DRAFT_READY","HUMAN_REVIEW"],"NEEDS_INFO",body.missing??[]);return NextResponse.json({ok:true,status:"NEEDS_INFO",holdDays:7});}
    if(body.action==="REJECT"){await m.releaseConsultation(body.id,adminUser.id,"REJECTED",body.reason??"ADMIN_REJECTED");return NextResponse.json({ok:true,status:"REJECTED"});}
    if(body.action==="RESEND_EMAIL"){
      const detail=await m.getAdminConsultationDetail(body.id,adminUser.id);
      if(detail.request.status!=="APPROVED"||detail.latest?.authorKind!=="PRIMARY_REVIEWER_FINAL")throw new Error("APPROVED_FINAL_REQUIRED");
      const delivery=await deliverConsultationAnswer({replyEmail:detail.privateInput.replyEmail,kind:detail.privateInput.kind,content:detail.latest.content});
      return NextResponse.json({ok:true,status:"APPROVED",reviewer:"易老师",...delivery});
    }
    if(body.action==="APPROVE"){
      if(typeof body.content!=="string"||body.content.trim().length<20)throw new Error("CONTENT_REQUIRED");
      const current=await m.getAdminConsultation(body.id);if(current.status==="APPROVED")return NextResponse.json({ok:true,status:"APPROVED",reviewer:"易老师"});
      const privateInput=await m.readPrivateInput(body.id,adminUser.id);
      const finalContent=body.content.trim();
      const version=await m.appendResponseVersion({requestId:body.id,authorKind:"PRIMARY_REVIEWER_FINAL",authorId:adminUser.id,content:finalContent});
      await m.approveConsultation(body.id,adminUser.id,version);
      const delivery=await deliverConsultationAnswer({replyEmail:privateInput.replyEmail,kind:privateInput.kind,content:finalContent});
      return NextResponse.json({ok:true,status:"APPROVED",reviewer:"易老师",version:version.version,...delivery});
    }
    return NextResponse.json({ok:false,error:"UNKNOWN_ACTION"},{status:400});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"CONSULTATION_ACTION_FAILED"},{status:409});}
}
