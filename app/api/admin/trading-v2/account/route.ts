import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { updatePaperInitialCash } from "@/lib/trading-signals/v2-store";

const schema = z.object({
  initialCash: z.number().min(1000).max(1000000000),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json({
      ok: true,
      account: await updatePaperInitialCash(body.initialCash),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "设置失败" },
      { status: 400 }
    );
  }
}
