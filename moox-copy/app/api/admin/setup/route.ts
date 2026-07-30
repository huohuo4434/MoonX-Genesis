import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AppMetadata } from "@/lib/auth/permissions";

const ADMIN_EMAIL = "jackzwin999@gmail.com";

export async function POST(request: NextRequest) {
  const expected = process.env.MOONX_ADMIN_INITIAL_PASSWORD?.trim();
  if (!expected || expected.length < 8) {
    return NextResponse.json({ error: "管理员初始化密码未配置" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });
  }

  const password = expected;
  const email = (process.env.MOONX_ADMIN_EMAIL ?? ADMIN_EMAIL).trim().toLowerCase();

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    return NextResponse.json({ error: "无法连接鉴权服务" }, { status: 500 });
  }

  const existing = listData.users.find((u) => u.email?.toLowerCase() === email);
  const now = new Date().toISOString();

  const adminMeta: AppMetadata = {
    role: "admin",
    membership_status: "active",
    membership_plan: null,
    membership_started_at: now,
    membership_expires_at: null,
    pending_payment: null,
  };

  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: adminMeta,
    });
    if (createErr) {
      return NextResponse.json({ error: "创建管理员失败" }, { status: 500 });
    }
  } else {
    const prev = (existing.app_metadata ?? {}) as AppMetadata;
    const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: {
        ...prev,
        ...adminMeta,
        membership_started_at: prev.membership_started_at ?? now,
      },
    });
    if (updateErr) {
      return NextResponse.json({ error: "更新管理员失败" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, email, role: "admin" });
}
