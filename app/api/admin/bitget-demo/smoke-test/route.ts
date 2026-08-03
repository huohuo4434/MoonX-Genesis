import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { runBitgetDemoSmokeTest } from "@/lib/bitget/demo-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  confirmation: z.string(),
  symbol: z.enum(["BTCUSDT", "ETHUSDT"]).default("BTCUSDT"),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json({
      ok: true,
      report: await runBitgetDemoSmokeTest(input),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "受控Demo测试失败" },
      { status: 400 }
    );
  }
}
