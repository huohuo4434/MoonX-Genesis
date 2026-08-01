import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { generateForecastSignalDrafts } from "@/lib/trading-signals/v2-store";

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const result = await generateForecastSignalDrafts(user.email ?? null);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 400 }
    );
  }
}
