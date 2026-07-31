import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  buildAdminFullCycleSnapshot,
  evaluateBreakout,
  saveBranchKeyDates,
  saveExactKeyDate,
  savePriceZone,
} from "@/lib/admin/full-cycle-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    return NextResponse.json(await buildAdminFullCycleSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取全周期控制台失败" },
      { status: 500 }
    );
  }
}

const exactKeyDateSchema = z.object({
  action: z.literal("save-exact-key-date"),
  assetId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effect: z.string().min(1),
  source: z.string().min(1),
  label: z.string().min(1),
  note: z.string().optional(),
});

const branchKeyDateSchema = z.object({
  action: z.literal("save-branch-key-dates"),
  assetId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branches: z.array(z.enum(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"])).min(1),
  effect: z.string().min(1),
  source: z.string().min(1),
  label: z.string().min(1),
  note: z.string().optional(),
});

const priceZoneSchema = z.object({
  action: z.literal("save-price-zone"),
  assetId: z.string().min(1),
  timeframe: z.enum(["4H", "1D", "1W"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supportLevels: z.array(z.string().min(1)).max(4),
  resistanceLevels: z.array(z.string().min(1)).max(4),
  confirmation: z.string().optional(),
  invalidation: z.string().optional(),
  note: z.string().optional(),
});

const breakoutSchema = z.object({
  action: z.literal("evaluate-breakout"),
  assetId: z.string().min(1),
  timeframe: z.enum(["4H", "1D", "1W"]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closePrice: z.coerce.number().positive(),
  note: z.string().optional(),
});

const postSchema = z.discriminatedUnion("action", [
  exactKeyDateSchema,
  branchKeyDateSchema,
  priceZoneSchema,
  breakoutSchema,
]);

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "输入内容不完整", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    let result: unknown;
    if (parsed.data.action === "save-exact-key-date") {
      result = await saveExactKeyDate(parsed.data);
    } else if (parsed.data.action === "save-branch-key-dates") {
      result = await saveBranchKeyDates(parsed.data);
    } else if (parsed.data.action === "save-price-zone") {
      result = await savePriceZone(parsed.data);
    } else {
      result = await evaluateBreakout(parsed.data);
    }
    revalidatePath("/admin/full-cycle");
    revalidatePath("/featured-stocks");
    revalidatePath("/member/weekly");
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}
