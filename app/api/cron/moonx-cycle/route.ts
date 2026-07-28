import { NextResponse, type NextRequest } from "next/server";
import { runMoonxCycle } from "@/lib/automation/cycle";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow Vercel cron without secret only if not configured — still require header when set.
    const auth = request.headers.get("authorization");
    if (!auth) return process.env.VERCEL !== "1";
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runMoonxCycle();
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cycle failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
