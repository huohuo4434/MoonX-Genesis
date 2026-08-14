import { NextResponse, type NextRequest } from "next/server";
import { getChinaDateKey } from "@/lib/date/china-date";
import { listStaticFocusEvidence } from "@/lib/data/conviction/access";
import { runFocusWeekPreparation } from "@/lib/data/conviction/focus-week-preparation-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handleFocusWeekPreparation(request: NextRequest) {
  const capturedNow = new Date();
  const asOfDate = getChinaDateKey(capturedNow);
  try {
    const result = await runFocusWeekPreparation({
      authorized: authorizeCron(request),
      asOfDate,
      nowMs: capturedNow.getTime(),
      readEvidence: async () => listStaticFocusEvidence(),
    });
    if (result.kind === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[prepare-focus-week] read-only preparation failed", error);
    return NextResponse.json({ ok: false, error: "PREPARATION_EVIDENCE_UNAVAILABLE" }, { status: 500 });
  }
}

export const GET = handleFocusWeekPreparation;
export const POST = handleFocusWeekPreparation;
