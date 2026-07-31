import { NextRequest, NextResponse } from "next/server";
import { listTradeSignals, verifySignalApiToken } from "@/lib/trading-signals/store";
import { toTradeSignalApiPayload } from "@/lib/trading-signals/payload";

function bearer(request: NextRequest): string {
  const value = request.headers.get("authorization") ?? "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

export async function GET(request: NextRequest) {
  const token = bearer(request) || request.headers.get("x-moonx-api-key")?.trim() || "";
  if (!token || !(await verifySignalApiToken(token, "read"))) {
    return NextResponse.json({ error: "无效API密钥" }, { status: 401 });
  }
  const symbol = request.nextUrl.searchParams.get("symbol") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const signals = await listTradeSignals({
    includeDrafts: false,
    apiVisibleOnly: true,
    symbol,
    status,
    limit: 500,
  });
  return NextResponse.json({
    schema: "moonx.trade.signal.list.v1",
    generatedAt: new Date().toISOString(),
    count: signals.length,
    data: signals.map(toTradeSignalApiPayload),
  });
}
