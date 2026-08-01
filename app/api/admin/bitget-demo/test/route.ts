import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getBitgetDemoEnvironment,
  testBitgetDemoConnection,
} from "@/lib/bitget/demo-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json({
      ok: true,
      environment: getBitgetDemoEnvironment(),
      connection: await testBitgetDemoConnection(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "连接测试失败" },
      { status: 500 }
    );
  }
}
