import { NextResponse, type NextRequest } from "next/server";
import { runCryptoBeijingV2Reverification } from "@/lib/verification/crypto-beijing-v2-reverify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runCryptoBeijingV2Reverification();
  return NextResponse.json({ ok: true, verifier: "crypto-beijing-v2", ...report });
}
