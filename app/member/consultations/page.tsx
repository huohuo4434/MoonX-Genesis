import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberConsultationClient } from "@/components/member/MemberConsultationClient";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function MemberConsultationsPage(){noStore();guardMemberForecastRoute();const gate=await getMemberDevicePageAccess();if(gate.status==="LOGIN_REQUIRED")redirect("/login?next=/member/consultations");if(gate.status==="MEMBERSHIP_REQUIRED")redirect("/pricing");if(gate.status==="DEVICE_REQUIRED")return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath="/member/consultations"/></Section></main>;return <><MemberDeviceHeartbeat/><main><Section spacing="lg" className="mx-auto max-w-3xl"><MemberConsultationClient/></Section></main></>}
