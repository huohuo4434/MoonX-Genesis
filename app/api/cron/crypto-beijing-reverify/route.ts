import { NextResponse, type NextRequest } from "next/server";
import { runCryptoBeijingV2Reverification } from "@/lib/verification/crypto-beijing-v2-reverify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runCryptoBeijingV2Reverification();
  console.info("crypto-beijing-reverify completed", { upgraded: report.upgraded, deferred: report.deferred, preservedPrior: report.preservedPrior, errors: report.errors.length });
  return NextResponse.json({ ok: report.errors.length === 0, partial: report.deferred > 0 || report.unchanged > 0 || report.errors.length > 0, verifier: "crypto-beijing-v2", ...report });
}
