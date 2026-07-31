import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { createSignalApiKey, listSignalApiKeys } from "@/lib/trading-signals/store";

const schema = z.object({
  label: z.string().min(1).max(100),
  permissions: z.array(z.enum(["read", "write", "admin"])).min(1).max(3).default(["read"]),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  return NextResponse.json({ keys: await listSignalApiKeys() });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const key = await createSignalApiKey(body.label, body.permissions);
    return NextResponse.json({ ok: true, ...key, warning: "密钥只显示这一次，请立即保存" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 400 });
  }
}
