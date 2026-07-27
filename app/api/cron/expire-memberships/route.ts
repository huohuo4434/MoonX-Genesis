import { NextResponse, type NextRequest } from "next/server";
import { expireMemberships } from "@/lib/payments/activate-membership";

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
  const count = await expireMemberships();
  return NextResponse.json({ ok: true, expiredCount: count });
}
