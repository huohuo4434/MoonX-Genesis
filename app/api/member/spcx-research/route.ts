import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getMemberUserContext } from "@/lib/auth/membership";
import { SPCX_MEMBER_RESEARCH } from "@/lib/data/spcx-member-20260808";
import { getSpcxTechnicalSnapshot } from "@/lib/data/spcx-technical";
import { projectAttributionForAudience } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const requireMemberContext=getMemberUserContext;

export async function GET(request: Request) {
  noStore();
  const locale = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "zh";
  const access = await requireMemberContext();
  if (!access.isMember && !access.isAdmin) {
    return NextResponse.json(
      { error: "MEMBERSHIP_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  let technical = null;
  try {
    technical = await getSpcxTechnicalSnapshot();
  } catch {
    technical = null;
  }

  return NextResponse.json(
    projectAttributionForAudience(
      { research: SPCX_MEMBER_RESEARCH, technical },
      { audience: access.isAdmin ? "ADMIN" : "MEMBER", locale },
    ),
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
