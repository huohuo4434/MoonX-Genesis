import { NextResponse, type NextRequest } from "next/server";
import { runPredictionAutoTrader } from "@/lib/trading-signals/prediction-auto-trader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runPredictionAutoTrader());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "strategy failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
