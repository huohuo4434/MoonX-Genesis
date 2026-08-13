import { NextResponse, type NextRequest } from "next/server";
import { runBitgetDemoServerRuntime } from "@/lib/bitget/demo-runtime";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";
import { canStartMemberDeskSync } from "@/lib/bitget/runtime-deadline-core";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const absoluteDeadlineAt = new Date(Date.now() + 285_000);
  const externalAnalysts = { delegated: true, independentCron: "/api/cron/external-analysts" } as const;
  let runtime: Awaited<ReturnType<typeof runBitgetDemoServerRuntime>> | { error: string };
  try {
    runtime = await runBitgetDemoServerRuntime(now, "CRON", { absoluteDeadlineAt });
  } catch (error) {
    runtime = { error: errorMessage(error, "Bitget server runtime failed") };
  }

  let memberDeskSync: { ok: true } | { ok: false; error: string };
  try {
    if (!canStartMemberDeskSync(absoluteDeadlineAt.getTime())) {
      memberDeskSync = { ok: false, error: "deferred: insufficient runtime deadline remaining" };
    } else {
      await syncMemberAiTradingDeskSnapshot(now);
      memberDeskSync = { ok: true };
    }
  } catch (error) {
    memberDeskSync = { ok: false, error: errorMessage(error, "Member trading desk sync failed") };
  }

  return NextResponse.json({
    ok: !("error" in runtime),
    checkedAt: now.toISOString(),
    runtime,
    memberDeskSync,
    externalAnalysts,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
