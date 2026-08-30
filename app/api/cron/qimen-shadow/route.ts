import { NextResponse, type NextRequest } from "next/server";

import { runQimenShadowAutomation } from "@/lib/research/qimen-shadow-automation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): "OK" | "MISSING_SECRET" | "UNAUTHORIZED" {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "MISSING_SECRET";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "OK" : "UNAUTHORIZED";
}

async function handle(request: NextRequest) {
  const authorization = authorizeCron(request);
  if (authorization === "MISSING_SECRET") {
    return NextResponse.json({ ok: false, error: "CRON_SECRET_NOT_CONFIGURED" }, { status: 503 });
  }
  if (authorization !== "OK") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runQimenShadowAutomation(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "QIMEN_SHADOW_AUTOMATION_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
