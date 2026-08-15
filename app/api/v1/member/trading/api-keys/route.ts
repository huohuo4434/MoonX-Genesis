import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
  expiresInDays: z.number().int().min(1).max(365).default(90),
});
const revokeSchema = z.object({ id: z.string().min(1).max(100) });

// Authorization: token management always requires the interactive member device gate.
async function memberId(): Promise<string | null> {
  const gate = await getMemberDevicePageAccess();
  return gate.status === "ALLOWED" ? gate.access.userId : null;
}

export async function GET() {
  const userId = await memberId();
  if (!userId) return NextResponse.json({ error: "会员权限或设备使用权无效" }, { status: 403 });
  const rate = await checkMemberApiRateLimit({ scope: "member-signal-token-read", limit: 30 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const { listMemberSignalApiTokens } = await import("@/lib/auth/member-signal-api-token");
  return NextResponse.json({ tokens: await listMemberSignalApiTokens(userId) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const userId = await memberId();
  if (!userId) return NextResponse.json({ error: "会员权限或设备使用权无效" }, { status: 403 });
  const rate = await checkMemberApiRateLimit({ scope: "member-signal-token-create", limit: 5, windowMs: 60 * 60_000 });
  if (!rate.ok) return NextResponse.json({ error: "创建过于频繁" }, { status: 429 });
  try {
    const input = createSchema.parse(await request.json());
    const { createMemberSignalApiToken } = await import("@/lib/auth/member-signal-api-token");
    const result = await createMemberSignalApiToken({ userId, ...input });
    return NextResponse.json({ ...result, warning: "Token仅显示这一次；它只能读取计划，不能操作Paper或交易所。" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await memberId();
  if (!userId) return NextResponse.json({ error: "会员权限或设备使用权无效" }, { status: 403 });
  const input = revokeSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "凭证ID无效" }, { status: 400 });
  const { revokeMemberSignalApiToken } = await import("@/lib/auth/member-signal-api-token");
  const revoked = await revokeMemberSignalApiToken(userId, input.data.id);
  return NextResponse.json({ ok: true, revoked });
}
