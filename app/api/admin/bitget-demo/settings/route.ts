import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { setBitgetMirrorEnabled } from "@/lib/bitget/demo-connector";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { enabled?: boolean };
    return NextResponse.json({
      ok: true,
      settings: await setBitgetMirrorEnabled(Boolean(body.enabled)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "设置失败" },
      { status: 500 }
    );
  }
}
