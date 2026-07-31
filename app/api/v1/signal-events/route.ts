import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTradeSignalEvent, getTradeSignalById, verifySignalApiToken } from "@/lib/trading-signals/store";

const schema = z.object({
  signalId: z.string().min(1),
  eventType: z.string().min(1).max(80),
  provider: z.string().max(80).default("EXTERNAL"),
  externalOrderId: z.string().max(200).nullable().optional(),
  price: z.number().positive().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  note: z.string().max(2000).optional(),
  occurredAt: z.string().datetime().optional(),
});

function bearer(request: NextRequest): string {
  const value = request.headers.get("authorization") ?? "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

export async function POST(request: NextRequest) {
  const token = bearer(request) || request.headers.get("x-moonx-api-key")?.trim() || "";
  if (!token || !(await verifySignalApiToken(token, "write"))) {
    return NextResponse.json({ error: "API密钥没有写入权限" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    if (!(await getTradeSignalById(body.signalId))) throw new Error("信号不存在");
    const event = await addTradeSignalEvent(body);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "写入失败" }, { status: 400 });
  }
}
