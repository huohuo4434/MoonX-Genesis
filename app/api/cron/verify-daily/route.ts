import { NextResponse, type NextRequest } from "next/server";
import { runMemberStockVerification } from "@/lib/data/member-stocks/verify";
import { runDailyVerification } from "@/lib/verification/run-daily";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + 180_000;
  const [dailyResult, stockResult] = await Promise.allSettled([
    runDailyVerification({ maxRecords: 8, deadlineAt }),
    runMemberStockVerification(new Date(), { maxRecords: 4, deadlineAt }),
  ]);

  const dailyOk = dailyResult.status === "fulfilled";
  const stockOk = stockResult.status === "fulfilled";
  const partial = !dailyOk || !stockOk ||
    (dailyOk && (dailyResult.value.errors.length > 0 || dailyResult.value.deferred > 0 || dailyResult.value.focusDeferred > 0 || dailyResult.value.syncDeferred > 0 || dailyResult.value.reviewsDeferred > 0)) ||
    (stockOk && (stockResult.value.deferred > 0 || stockResult.value.manual > 0));
  const body = {
    ok: dailyOk && stockOk && !(dailyOk && dailyResult.value.errors.length),
    partial,
    elapsedMs: Date.now() - startedAt,
    report: dailyOk ? dailyResult.value : null,
    stockReport: stockOk ? stockResult.value : null,
    publicAfterRun: null,
    pipelineAfterRun: null,
    diagnosticsDeferred: true,
    errors: {
      daily: dailyOk ? null : errorMessage(dailyResult.reason),
      memberStocks: stockOk ? null : errorMessage(stockResult.reason),
    },
  };

  console.info("verify-daily completed", { elapsedMs: body.elapsedMs, ok: body.ok, partial: body.partial });
  return NextResponse.json(body, {
    status: dailyOk || stockOk ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
