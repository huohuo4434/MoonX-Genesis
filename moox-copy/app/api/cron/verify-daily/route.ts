import { NextResponse, type NextRequest } from "next/server";
import { runMemberStockVerification } from "@/lib/data/member-stocks/verify";
import { runDailyVerification } from "@/lib/verification/run-daily";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [report, stockReport] = await Promise.all([
      runDailyVerification(),
      runMemberStockVerification(),
    ]);
    return NextResponse.json({ ok: true, report, stockReport });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cron failed" },
      { status: 500 }
    );
  }
}
