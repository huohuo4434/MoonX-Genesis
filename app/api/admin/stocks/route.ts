import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { listAllStocksForAdmin, publishStock, upsertStockRecord } from "@/lib/data/stocks-store";
import type { StockAnalysisRecord } from "@/types/stocks";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  return NextResponse.json({ ok: true, stocks: await listAllStocksForAdmin() });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), id: z.string().min(1) }),
  z.object({
    action: z.literal("upsert"),
    record: z.object({
      id: z.string(),
      name: z.string(),
      symbol: z.string(),
      market: z.string(),
      direction: z.string(),
      directionLabel: z.string(),
      validUntil: z.string(),
      coreScenario: z.string(),
      keyLevels: z.array(z.string()),
      invalidation: z.string(),
      lastUpdatedAt: z.string(),
      status: z.enum(["draft", "internal_review", "published", "archived"]),
      createdAt: z.string(),
      publishedAt: z.string().optional(),
      verificationSummary: z.string().optional(),
      internalNotes: z.string().optional(),
      hexagramNotes: z.string().optional(),
      sourceIds: z.array(z.string()).optional(),
    }),
  }),
]);

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }
  if (body.action === "publish") {
    const record = await publishStock(body.id);
    if (!record) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json({ ok: true, record });
  }
  const record = await upsertStockRecord(body.record as StockAnalysisRecord);
  return NextResponse.json({ ok: true, record });
}
