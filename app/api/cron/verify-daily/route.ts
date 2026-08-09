import { NextResponse, type NextRequest } from "next/server";
import { runMemberStockVerification } from "@/lib/data/member-stocks/verify";
import { runDailyVerification } from "@/lib/verification/run-daily";
import { getPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { getVerificationPipelineStatus } from "@/lib/accuracy/verification-pipeline-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  if (process.env.VERCEL === "1") {
    // Vercel documents this user-agent for scheduled invocations. This keeps
    // idempotent verification alive when CRON_SECRET was not configured yet.
    return request.headers.get("user-agent")?.includes("vercel-cron/1.0") ?? false;
  }
  return true;
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

  const [dailyResult, stockResult] = await Promise.allSettled([
    runDailyVerification(),
    runMemberStockVerification(),
  ]);

  const dailyOk = dailyResult.status === "fulfilled";
  const stockOk = stockResult.status === "fulfilled";
  const [publicSnapshot, pipeline] = await Promise.all([
    getPublicVerificationSnapshot().catch(() => null),
    getVerificationPipelineStatus().catch(() => null),
  ]);
  const body = {
    ok: dailyOk && stockOk,
    partial: dailyOk !== stockOk,
    report: dailyOk ? dailyResult.value : null,
    stockReport: stockOk ? stockResult.value : null,
    publicAfterRun: publicSnapshot ? {
      completed: publicSnapshot.daily.stats.verifiedCount,
      visibleRows: publicSnapshot.daily.items.length,
      pending: publicSnapshot.pending.length,
      weeklySamples: publicSnapshot.weekly.stats.sampleSize,
    } : null,
    pipelineAfterRun: pipeline,
    errors: {
      daily: dailyOk ? null : errorMessage(dailyResult.reason),
      memberStocks: stockOk ? null : errorMessage(stockResult.reason),
    },
  };

  return NextResponse.json(body, {
    status: dailyOk || stockOk ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
