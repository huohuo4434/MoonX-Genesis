import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/permissions";
import {
  getMasterIntelligenceStoreHealth,
  initializeMasterIntelligenceStoreIfMissing,
} from "@/lib/master-intelligence/store";
import {
  getTeacherKnowledgeStoreHealth,
  initializeTeacherKnowledgeStoreIfMissing,
} from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

async function health() {
  return Promise.all([
    getTeacherKnowledgeStoreHealth(),
    getMasterIntelligenceStoreHealth(),
  ]);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  return NextResponse.json(
    { stores: await health() },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

const initializeSchema = z.object({ action: z.literal("INITIALIZE_MISSING") }).strict();

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!initializeSchema.safeParse(body).success) {
    return NextResponse.json({ error: "无效的初始化操作" }, { status: 400 });
  }
  try {
    const before = await health();
    if (before.some((item) => item.state === "INVALID" || item.state === "ERROR" || item.state === "UNCONFIGURED")) {
      return NextResponse.json(
        { error: "存在无效、不可读或未配置的存储；为避免覆盖，本轮拒绝初始化。", stores: before },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    const results = await Promise.all([
      initializeTeacherKnowledgeStoreIfMissing(),
      initializeMasterIntelligenceStoreIfMissing(),
    ]);
    return NextResponse.json(
      { ok: true, results, stores: await health() },
      { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "初始化失败", stores: await health() },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
