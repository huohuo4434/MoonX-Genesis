import { NextResponse, type NextRequest } from "next/server";
import { processPendingLessons } from "@/lib/master-intelligence/pipeline";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await processPendingLessons(5);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cron failed" },
      { status: 500 }
    );
  }
}
